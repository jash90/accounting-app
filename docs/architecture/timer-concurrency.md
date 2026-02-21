# Timer Concurrency Model

This document describes the defense-in-depth concurrency model used in the Time Tracking module to ensure data integrity when managing running timers.

## Overview

The time tracking system allows users to start a timer that runs until they explicitly stop it. A critical invariant is:

**Each user can have at most one running timer at any given time.**

Enforcing this in a concurrent environment (multiple browser tabs, mobile apps, API clients) requires multiple layers of protection.

## Timer Lifecycle

```
┌─────────────┐    startTimer()    ┌─────────────┐    stopTimer()    ┌─────────────┐
│   No Timer  │ ─────────────────> │   Running   │ ─────────────────>│  Completed  │
│             │                    │   (timer)   │                    │   (entry)   │
└─────────────┘                    └─────────────┘                    └─────────────┘
                                          │
                                          │ discardTimer()
                                          ▼
                                   ┌─────────────┐
                                   │  Discarded  │
                                   │  (deleted)  │
                                   └─────────────┘
```

A running timer is represented as a `TimeEntry` with:

- `startTime`: When the timer was started
- `endTime`: `NULL` (indicates the timer is still running)
- `isRunning`: `true`

## Defense-in-Depth Layers

### Layer 1: Application-Level Pessimistic Locking

Before creating a new timer, the service acquires a pessimistic write lock on any existing running timer:

```typescript
// time-entries.service.ts
async startTimer(userId: string, dto: StartTimerDto): Promise<TimeEntry> {
  return this.dataSource.transaction(async (manager) => {
    // Acquire pessimistic lock on existing running timer
    const existingTimer = await manager.findOne(TimeEntry, {
      where: {
        userId,
        companyId: user.companyId,
        isRunning: true,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existingTimer) {
      throw new ConflictException('A timer is already running');
    }

    // Create new timer within the same transaction
    const timer = manager.create(TimeEntry, { ... });
    return manager.save(timer);
  });
}
```

**How it works:**

1. The transaction starts and acquires a lock on the row (if exists)
2. Other concurrent transactions attempting to start a timer will wait for this lock
3. When the first transaction commits, the second will see the newly created timer and throw an error

**Limitation:** Race condition exists when no timer exists yet (no row to lock). Two concurrent `startTimer` calls could both pass the check and attempt to create timers.

### Layer 2: Database Unique Partial Index

A PostgreSQL partial unique index ensures only one running timer per user at the database level:

```sql
-- Migration: AddRunningTimerUniqueIndex
CREATE UNIQUE INDEX "IDX_time_entry_running_timer_unique"
ON "time_entries" ("user_id", "company_id")
WHERE "is_running" = true AND "deleted_at" IS NULL;
```

**How it works:**

- The index only includes rows where `is_running = true` and `deleted_at IS NULL`
- PostgreSQL enforces uniqueness on `(user_id, company_id)` within this subset
- Any attempt to insert a second running timer will fail with a unique constraint violation

This catches the race condition that Layer 1 cannot prevent.

### Layer 3: PostgreSQL Error Code Handling

The application gracefully handles the unique constraint violation:

```typescript
async startTimer(userId: string, dto: StartTimerDto): Promise<TimeEntry> {
  try {
    return await this.dataSource.transaction(async (manager) => {
      // ... Layer 1 logic ...
    });
  } catch (error) {
    // PostgreSQL unique violation error code: 23505
    if (error.code === '23505') {
      throw new ConflictException('A timer is already running');
    }
    throw error;
  }
}
```

**Error codes handled:**

- `23505`: Unique constraint violation (another timer was created)
- `40001`: Serialization failure (transaction conflict)

## FAR_FUTURE_DATE Constant

```typescript
/**
 * Far future date used for overlap detection with running timers.
 * Running timers have no endTime (null), but SQL range overlap queries
 * require a date for comparison: (start1 < end2) AND (end1 > start2).
 * Using '9999-12-31' allows detecting overlaps with open-ended entries.
 */
const FAR_FUTURE_DATE = '9999-12-31';
```

### Purpose

When checking for time entry overlaps, we use SQL range logic:

```sql
-- Standard overlap check: two ranges [start1, end1] and [start2, end2] overlap if:
-- start1 < end2 AND end1 > start2

SELECT * FROM time_entries
WHERE user_id = :userId
  AND start_time < :newEndTime
  AND COALESCE(end_time, '9999-12-31') > :newStartTime
```

For running timers where `end_time` is `NULL`, we substitute `FAR_FUTURE_DATE` to make the comparison work correctly. This ensures:

- A new entry cannot overlap with a running timer
- A running timer is treated as extending indefinitely into the future

## Concurrent Scenario: Sequence Diagram

### Scenario: Two Browser Tabs Start Timer Simultaneously

```
Tab A                    Database                    Tab B
  │                         │                          │
  │ startTimer()            │                          │
  │─────────────────────────>                          │
  │                         │          startTimer()    │
  │ BEGIN TRANSACTION       │<─────────────────────────│
  │ SELECT ... FOR UPDATE   │                          │
  │ (no existing timer)     │       BEGIN TRANSACTION  │
  │                         │       SELECT ... FOR UPDATE
  │ INSERT new timer        │       (waits for lock)   │
  │                         │              │           │
  │ COMMIT ✓                │              │           │
  │                         │              │           │
  │                         │       (lock released)    │
  │                         │       INSERT fails       │
  │                         │       (unique violation) │
  │                         │              │           │
  │                         │       ROLLBACK           │
  │                         │─────────────────────────>│
  │                         │       ConflictException  │
```

### Scenario: Race Condition (No Existing Timer)

```
Tab A                    Database                    Tab B
  │                         │                          │
  │ startTimer()            │          startTimer()    │
  │─────────────────────────>─────────────────────────>│
  │                         │                          │
  │ BEGIN TRANSACTION       │       BEGIN TRANSACTION  │
  │ SELECT ... FOR UPDATE   │       SELECT ... FOR UPDATE
  │ (no rows, no lock)      │       (no rows, no lock) │
  │                         │                          │
  │ INSERT new timer        │       INSERT new timer   │
  │ COMMIT ✓                │              │           │
  │                         │       COMMIT fails!      │
  │                         │       (unique index)     │
  │                         │─────────────────────────>│
  │                         │       ConflictException  │
```

In this scenario, Layer 2 (unique index) catches the race condition that Layer 1 missed.

## Performance Considerations

### Index Strategy

The partial index is efficient because:

1. Only indexes rows where `is_running = true` (typically 0-1 rows per user)
2. Small index size means fast lookups and constraint checks
3. Does not slow down queries for completed entries

### Lock Duration

Pessimistic locks are held only for the duration of the transaction:

- Typical transaction time: <50ms
- Lock contention is rare in practice (users don't usually spam the start button)
- The lock ensures serialization only when truly needed

## Testing Recommendations

### Unit Tests (Mocked)

Test the business logic flow:

- Starting a timer when none exists
- Starting a timer when one is already running
- Error handling for constraint violations

### Integration Tests (Real Database)

Test actual concurrency scenarios:

1. Start two timers concurrently for the same user
2. Verify exactly one succeeds and one fails with ConflictException
3. Verify the unique index prevents duplicate running timers

Example integration test:

```typescript
describe('Timer Concurrency', () => {
  it('should prevent concurrent timer starts', async () => {
    const userId = 'test-user';

    // Start two timers concurrently
    const results = await Promise.allSettled([
      timeEntriesService.startTimer(userId, { description: 'Timer 1' }),
      timeEntriesService.startTimer(userId, { description: 'Timer 2' }),
    ]);

    // Exactly one should succeed
    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toBeInstanceOf(ConflictException);
  });
});
```

## Related Files

- `libs/modules/time-tracking/src/lib/services/time-entries.service.ts` - Timer service implementation
- `libs/modules/time-tracking/src/lib/controllers/time-entries.controller.ts` - Timer API endpoints
- `apps/api/src/migrations/1768950000000-AddRunningTimerUniqueIndex.ts` - Unique index migration
- `libs/common/src/lib/entities/time-entry.entity.ts` - TimeEntry entity definition
