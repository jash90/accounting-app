import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds composite indexes on time_entries for efficient overlap detection queries.
 *
 * The time-entries service checks for overlapping entries using range queries:
 *   (start1 < end2) AND (end1 > start2)
 *
 * Two indexes are created:
 * 1. For completed entries (endTime IS NOT NULL) — range overlap checks
 * 2. For running timers (endTime IS NULL) — active timer lookups
 */
export class AddTimeEntryOverlapIndex1771900100000 implements MigrationInterface {
  name = 'AddTimeEntryOverlapIndex1771900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for overlap detection on completed entries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_time_entry_overlap"
      ON "time_entries" ("companyId", "userId", "startTime", "endTime")
      WHERE "endTime" IS NOT NULL
    `);

    // Index for finding running timers (open-ended entries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_time_entry_running"
      ON "time_entries" ("companyId", "userId")
      WHERE "endTime" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_time_entry_running"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_time_entry_overlap"`);
  }
}
