import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRATION: AddOverlapDetectionIndex
 *
 * Adds an optimized index for detecting overlapping time entries.
 * This index speeds up the overlap check query that runs on every
 * time entry creation and update.
 *
 * INDEX COLUMNS:
 * - userId: Filter to same user
 * - companyId: Multi-tenant isolation
 * - startTime: Range overlap start bound
 * - endTime: Range overlap end bound (nullable for running timers)
 *
 * QUERY PATTERN OPTIMIZED:
 * ```sql
 * SELECT * FROM time_entries
 * WHERE userId = $1
 *   AND companyId = $2
 *   AND isActive = true
 *   AND (
 *     (startTime <= $newEnd AND endTime >= $newStart)
 *     OR (startTime <= $newEnd AND endTime IS NULL)
 *   )
 * ```
 *
 * PERFORMANCE IMPACT:
 * - Expected 10-50x speedup for overlap detection queries
 * - Minimal write overhead (single index update per time entry)
 *
 * ROLLBACK:
 * Safe to rollback - removes index only, no data loss.
 */
export class AddOverlapDetectionIndex1768980000000 implements MigrationInterface {
  name = 'AddOverlapDetectionIndex1768980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create composite index for overlap detection
    // Includes isActive filter as partial index condition for better selectivity
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_time_entry_overlap_detection"
      ON "time_entries" ("userId", "companyId", "startTime", "endTime")
      WHERE "isActive" = true
    `);

    console.log('[AddOverlapDetectionIndex] Created IDX_time_entry_overlap_detection index.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_time_entry_overlap_detection"
    `);

    console.log('[AddOverlapDetectionIndex] Dropped IDX_time_entry_overlap_detection index.');
  }
}
