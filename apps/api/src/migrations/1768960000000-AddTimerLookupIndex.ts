import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * MIGRATION: AddTimerLookupIndex - Creates composite index for efficient timer lookups
 *
 * This index optimizes queries that filter by userId, companyId, isRunning, and isActive,
 * which is a common pattern when finding active timers for a user.
 *
 * The partial index only includes active records to minimize index size.
 */
export class AddTimerLookupIndex1768960000000 implements MigrationInterface {
  name = 'AddTimerLookupIndex1768960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[AddTimerLookupIndex] Starting migration UP...');

    // Check if index already exists
    const existingIndex = await queryRunner.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'time_entries'
        AND indexname = 'IDX_time_entries_timer_lookup'
    `);

    if (existingIndex && existingIndex.length > 0) {
      console.log('[AddTimerLookupIndex] Index already exists, skipping creation');
      return;
    }

    // Create composite partial index for efficient timer lookups
    // This index supports queries like:
    //   - Find running timer for user in company
    //   - List all active timers for a user
    //   - Check timer status
    console.log('[AddTimerLookupIndex] Creating composite index...');
    await queryRunner.query(`
      CREATE INDEX "IDX_time_entries_timer_lookup"
      ON "time_entries" ("userId", "companyId", "isRunning", "isActive")
      WHERE "isActive" = true
    `);

    console.log('[AddTimerLookupIndex] Migration UP completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[AddTimerLookupIndex] Starting migration DOWN...');
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_time_entries_timer_lookup"`);
    console.log('[AddTimerLookupIndex] Migration DOWN completed successfully');
  }
}
