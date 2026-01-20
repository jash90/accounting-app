import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRATION: DropProjectIdFromTimeEntries
 *
 * Removes the projectId column from time_entries table.
 *
 * RATIONALE: The project-based time tracking was replaced with client-based tracking.
 * Time entries are now associated directly with clients instead of going through projects.
 *
 * DATA BACKUP:
 * - Creates a backup table "time_entries_project_backup" before dropping the column
 * - Preserves projectId associations for potential data recovery
 * - Backup created: 2026-01-20 (timestamp preserved in backup table's backedUpAt column)
 *
 * RECOVERY PROCEDURE:
 * If you need to restore projectId associations after rollback:
 * 1. Verify backup exists:
 *    SELECT COUNT(*) FROM time_entries_project_backup;
 *
 * 2. Run migration rollback:
 *    npm run migration:revert
 *
 * 3. Verify restoration:
 *    SELECT COUNT(*) FROM time_entries WHERE "projectId" IS NOT NULL;
 *
 * 4. If backup table doesn't exist, data recovery is not possible automatically.
 *    Manual restoration from database backups will be required.
 *
 * CLEANUP PROCEDURE:
 * After 90 days, if the migration is stable and rollback is no longer needed,
 * run the cleanup migration to drop the backup table:
 *    DROP TABLE IF EXISTS time_entries_project_backup;
 *
 * ROLLBACK:
 * The down() migration recreates the projectId column, index, and FK constraint,
 * and restores project associations from the backup table if it exists.
 * If the backup table doesn't exist, a warning is logged and the column is recreated empty.
 *
 * ORDERING: This migration should run after AddTimeTrackingModule (1768758559156)
 * which creates the time_entries table with projectId.
 */
export class DropProjectIdFromTimeEntries1768834398570 implements MigrationInterface {
  name = 'DropProjectIdFromTimeEntries1768834398570';
  private readonly migrationName = 'DropProjectIdFromTimeEntries';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Step 1: Create backup table and preserve projectId data
      console.warn(`[${this.migrationName}] Creating backup of projectId data before removal...`);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "time_entries_project_backup" (
          "timeEntryId" uuid NOT NULL PRIMARY KEY,
          "projectId" uuid,
          "backedUpAt" TIMESTAMP DEFAULT NOW()
        )
      `);

      await queryRunner.query(`
        INSERT INTO "time_entries_project_backup" ("timeEntryId", "projectId")
        SELECT "id", "projectId" FROM "time_entries" WHERE "projectId" IS NOT NULL
        ON CONFLICT ("timeEntryId") DO NOTHING
      `);

      // Log the number of backed up entries
      const result = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "time_entries_project_backup"`
      );
      console.log(`[${this.migrationName}] Backed up ${result[0]?.count || 0} time entry-project associations`);

      // Step 2: Drop the foreign key constraint
      await queryRunner.query(
        `ALTER TABLE "time_entries" DROP CONSTRAINT IF EXISTS "FK_f051d95ecf3cd671445ef0c9be8"`
      );

      // Step 3: Drop the index on (companyId, projectId)
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_23cbfc98b81c157d8c8f758925"`
      );

      // Step 4: Drop the projectId column
      console.warn(`[${this.migrationName}] Dropping projectId column from time_entries table...`);
      await queryRunner.query(
        `ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "projectId"`
      );

      await queryRunner.commitTransaction();
      console.log(`[${this.migrationName}] Migration complete. Backup data preserved in time_entries_project_backup table.`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(`[${this.migrationName}] Rolling back: recreating projectId column...`);

    // Step 1: Check if backup table exists before proceeding
    const backupExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'time_entries_project_backup'
      ) as exists
    `);

    if (!backupExists[0]?.exists) {
      console.warn(`[${this.migrationName}] ⚠️  WARNING: Backup table 'time_entries_project_backup' does not exist!`);
      console.warn(`[${this.migrationName}]    projectId column will be recreated but data cannot be restored.`);
      console.warn(`[${this.migrationName}]    If you need to restore project associations, restore from database backup first.`);
    } else {
      // Verify backup table has data
      const backupCount = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "time_entries_project_backup"`
      );
      console.log(`[${this.migrationName}] Backup table found with ${backupCount[0]?.count || 0} records.`);
    }

    // Step 2: Recreate the projectId column
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD "projectId" uuid`
    );

    // Step 3: Restore projectId data from backup table if it exists
    if (backupExists[0]?.exists) {
      console.log(`[${this.migrationName}] Restoring projectId data from backup table...`);
      await queryRunner.query(`
        UPDATE "time_entries" te
        SET "projectId" = backup."projectId"
        FROM "time_entries_project_backup" backup
        WHERE te."id" = backup."timeEntryId"
      `);

      const resultRestore = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "time_entries" WHERE "projectId" IS NOT NULL`
      );
      console.log(`[${this.migrationName}] ✅ Restored ${resultRestore[0]?.count || 0} time entry-project associations`);
    }

    // Step 4: Recreate the index
    await queryRunner.query(
      `CREATE INDEX "IDX_23cbfc98b81c157d8c8f758925" ON "time_entries" ("companyId", "projectId")`
    );

    // Step 5: Recreate the foreign key constraint (only if time_projects table exists)
    // This handles the case where DropTimeProjectsTable migration has already run
    const timeProjectsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'time_projects'
      ) as exists
    `);

    if (timeProjectsExists[0]?.exists) {
      await queryRunner.query(
        `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_f051d95ecf3cd671445ef0c9be8" FOREIGN KEY ("projectId") REFERENCES "time_projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      console.log(`[${this.migrationName}] FK constraint to time_projects recreated.`);
    } else {
      console.warn(`[${this.migrationName}] time_projects table does not exist - skipping FK constraint creation.`);
      console.warn(`[${this.migrationName}] Run the DropTimeProjectsTable rollback first to restore the table.`);
    }

    console.log(`[${this.migrationName}] Rollback complete.`);
  }
}
