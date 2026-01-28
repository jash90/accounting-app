/**
 * Integration Tests for TimeEntriesService
 *
 * These tests verify the timer concurrency model against a real PostgreSQL database.
 * They test the defense-in-depth layers:
 *   1. Application-level pessimistic locking
 *   2. Database unique partial index
 *   3. PostgreSQL error code handling
 *
 * Prerequisites:
 *   - Start test database: docker-compose -f test/integration/docker-compose.yml up -d
 *   - Run: npm run test:integration
 */

import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';

import { type DataSource, type Repository } from 'typeorm';

import { TimeEntry } from '@accounting/common';

import { TimeEntriesService } from './time-entries.service';
import { TEST_DB_CONFIG, runConcurrently } from '../../../../../../test/integration/setup';

describe('TimeEntriesService Integration Tests', () => {
  let module: TestingModule;
  let service: TimeEntriesService;
  let dataSource: DataSource;
  let timeEntryRepository: Repository<TimeEntry>;

  // Test user and company IDs
  const testUserId = 'test-user-001';
  const testCompanyId = 'test-company-001';

  beforeAll(async () => {
    // Create testing module with real database
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...TEST_DB_CONFIG,
          entities: [TimeEntry],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([TimeEntry]),
      ],
      providers: [TimeEntriesService],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
    dataSource = module.get<DataSource>(getDataSourceToken());
    timeEntryRepository = dataSource.getRepository(TimeEntry);

    // Create the unique partial index manually (normally done by migration)
    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_time_entry_running_timer_unique"
      ON "time_entries" ("user_id", "company_id")
      WHERE "is_running" = true AND "deleted_at" IS NULL
    `);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up time entries before each test
    await timeEntryRepository.delete({});
  });

  describe('Timer Concurrency', () => {
    it('should allow starting a timer when no timer exists', async () => {
      const result = await service.startTimer(testUserId, {
        description: 'Test timer',
        companyId: testCompanyId,
      });

      expect(result).toBeDefined();
      expect(result.isRunning).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(result.endTime).toBeNull();
    });

    it('should prevent starting a timer when one is already running', async () => {
      // Start first timer
      await service.startTimer(testUserId, {
        description: 'First timer',
        companyId: testCompanyId,
      });

      // Attempt to start second timer
      await expect(
        service.startTimer(testUserId, {
          description: 'Second timer',
          companyId: testCompanyId,
        })
      ).rejects.toThrow(ConflictException);

      // Verify only one timer exists
      const timers = await timeEntryRepository.find({
        where: { userId: testUserId, isRunning: true },
      });
      expect(timers).toHaveLength(1);
    });

    it('should prevent concurrent timer starts for the same user', async () => {
      // Start two timers concurrently
      const results = await runConcurrently([
        () =>
          service.startTimer(testUserId, {
            description: 'Timer 1',
            companyId: testCompanyId,
          }),
        () =>
          service.startTimer(testUserId, {
            description: 'Timer 2',
            companyId: testCompanyId,
          }),
      ]);

      // Exactly one should succeed
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      // Verify the failure is a ConflictException
      const failedResult = failures[0] as PromiseRejectedResult;
      expect(failedResult.reason).toBeInstanceOf(ConflictException);

      // Verify only one timer exists in database
      const timers = await timeEntryRepository.find({
        where: { userId: testUserId, isRunning: true },
      });
      expect(timers).toHaveLength(1);
    });

    it('should allow different users to start timers concurrently', async () => {
      const user1 = 'user-001';
      const user2 = 'user-002';

      // Start timers for different users concurrently
      const results = await runConcurrently([
        () =>
          service.startTimer(user1, {
            description: 'User 1 timer',
            companyId: testCompanyId,
          }),
        () =>
          service.startTimer(user2, {
            description: 'User 2 timer',
            companyId: testCompanyId,
          }),
      ]);

      // Both should succeed
      const successes = results.filter((r) => r.status === 'fulfilled');
      expect(successes).toHaveLength(2);

      // Verify both timers exist
      const timers = await timeEntryRepository.find({
        where: { isRunning: true },
      });
      expect(timers).toHaveLength(2);
    });

    it('should allow starting a new timer after stopping the previous one', async () => {
      // Start first timer
      const timer1 = await service.startTimer(testUserId, {
        description: 'First timer',
        companyId: testCompanyId,
      });

      // Stop first timer
      await service.stopTimer(testUserId, testCompanyId);

      // Start second timer
      const timer2 = await service.startTimer(testUserId, {
        description: 'Second timer',
        companyId: testCompanyId,
      });

      expect(timer2).toBeDefined();
      expect(timer2.isRunning).toBe(true);
      expect(timer2.id).not.toBe(timer1.id);

      // Verify only one running timer
      const runningTimers = await timeEntryRepository.find({
        where: { userId: testUserId, isRunning: true },
      });
      expect(runningTimers).toHaveLength(1);
    });
  });

  describe('Unique Index Validation', () => {
    it('should enforce unique partial index at database level', async () => {
      // Insert a running timer directly using raw SQL
      await dataSource.query(
        `
        INSERT INTO time_entries (id, user_id, company_id, description, start_time, is_running)
        VALUES ($1, $2, $3, $4, NOW(), true)
      `,
        ['entry-1', testUserId, testCompanyId, 'Direct insert 1']
      );

      // Attempt to insert another running timer directly
      await expect(
        dataSource.query(
          `
          INSERT INTO time_entries (id, user_id, company_id, description, start_time, is_running)
          VALUES ($1, $2, $3, $4, NOW(), true)
        `,
          ['entry-2', testUserId, testCompanyId, 'Direct insert 2']
        )
      ).rejects.toThrow();
    });

    it('should allow multiple completed entries for the same user', async () => {
      // Insert multiple completed entries
      const entries = [
        { id: 'completed-1', description: 'Completed 1' },
        { id: 'completed-2', description: 'Completed 2' },
        { id: 'completed-3', description: 'Completed 3' },
      ];

      for (const entry of entries) {
        await dataSource.query(
          `
          INSERT INTO time_entries (id, user_id, company_id, description, start_time, end_time, is_running)
          VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour', NOW(), false)
        `,
          [entry.id, testUserId, testCompanyId, entry.description]
        );
      }

      // All should exist
      const allEntries = await timeEntryRepository.find({
        where: { userId: testUserId },
      });
      expect(allEntries).toHaveLength(3);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should isolate timers between companies', async () => {
      const company1 = 'company-001';
      const company2 = 'company-002';

      // Start timers in different companies for the same user
      const timer1 = await service.startTimer(testUserId, {
        description: 'Company 1 timer',
        companyId: company1,
      });

      const timer2 = await service.startTimer(testUserId, {
        description: 'Company 2 timer',
        companyId: company2,
      });

      // Both should succeed (different companies = different tenants)
      expect(timer1.companyId).toBe(company1);
      expect(timer2.companyId).toBe(company2);

      // Verify both exist
      const allTimers = await timeEntryRepository.find({
        where: { userId: testUserId, isRunning: true },
      });
      expect(allTimers).toHaveLength(2);
    });
  });
});
