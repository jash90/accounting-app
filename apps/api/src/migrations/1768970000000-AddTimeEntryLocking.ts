import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * MIGRATION: AddTimeEntryLocking
 *
 * Adds locking fields to time_entries table to prevent modifications
 * to approved or billed entries.
 *
 * FIELDS ADDED:
 * - isLocked: boolean - Whether the entry is locked for editing
 * - lockedAt: timestamp - When the entry was locked
 * - lockedById: uuid - User who locked the entry
 *
 * RATIONALE:
 * Time entries that have been approved or billed should not be modified
 * to maintain audit integrity and billing accuracy. This adds explicit
 * locking support to enforce this constraint at the database level.
 *
 * ROLLBACK:
 * Safe to rollback - removes the columns without data loss (locking metadata only).
 */
export class AddTimeEntryLocking1768970000000 implements MigrationInterface {
  name = 'AddTimeEntryLocking1768970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isLocked column with default false
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD COLUMN "isLocked" boolean NOT NULL DEFAULT false
    `);

    // Add lockedAt timestamp column
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD COLUMN "lockedAt" TIMESTAMP WITH TIME ZONE
    `);

    // Add lockedById column with foreign key
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD COLUMN "lockedById" uuid
    `);

    // Add foreign key constraint for lockedById
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD CONSTRAINT "FK_time_entries_lockedBy"
      FOREIGN KEY ("lockedById")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Create index for efficient locked entry queries
    await queryRunner.query(`
      CREATE INDEX "IDX_time_entries_locked"
      ON "time_entries" ("companyId", "isLocked")
      WHERE "isLocked" = true
    `);

    console.log(
      '[AddTimeEntryLocking] Migration complete. Added isLocked, lockedAt, lockedById columns.'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_time_entries_locked"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      DROP CONSTRAINT IF EXISTS "FK_time_entries_lockedBy"
    `);

    // Drop the columns
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      DROP COLUMN IF EXISTS "lockedById"
    `);

    await queryRunner.query(`
      ALTER TABLE "time_entries"
      DROP COLUMN IF EXISTS "lockedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "time_entries"
      DROP COLUMN IF EXISTS "isLocked"
    `);

    console.log('[AddTimeEntryLocking] Rollback complete. Removed locking columns.');
  }
}
