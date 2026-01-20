import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRATION: UpdateAmlGroupEnum - Adds STANDARD and ELEVATED values to AML group enum
 *
 * ⚠️  ONE-WAY MIGRATION - ROLLBACK WILL BE BLOCKED IF NEW VALUES EXIST
 *
 * ORDERING: This migration MUST run BEFORE AddPkdCodeToClient1768834398569
 * The timestamp ensures correct ordering (1768800000000 < 1768834398569)
 *
 * CHANGES:
 * - Adds 'STANDARD' and 'ELEVATED' enum values using IF NOT EXISTS (safe for reruns)
 * - Migrates existing 'MEDIUM' values to 'STANDARD' if any exist
 *
 * ROLLBACK BEHAVIOR:
 * The down() migration will THROW AN ERROR if any ELEVATED or STANDARD values exist.
 * This prevents accidental data loss where these distinctions would be lost.
 *
 * RECOVERY PROCEDURE (if rollback is absolutely necessary):
 * 1. Export audit table: SELECT * FROM clients_aml_audit INTO OUTFILE
 * 2. Manually update affected clients: UPDATE clients SET amlGroupEnum = 'MEDIUM' WHERE amlGroupEnum IN ('STANDARD', 'ELEVATED')
 * 3. Re-run the migration rollback after manual data migration
 * 4. Audit table preserves original values for potential restoration
 *
 * For existing deployments where migrations have run successfully, no action needed.
 * For fresh deployments, this migration handles enum setup safely.
 */
export class UpdateAmlGroupEnum1768800000000 implements MigrationInterface {
  name = 'UpdateAmlGroupEnum1768800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[UpdateAmlGroupEnum] Starting migration UP...');

    try {
      // Add new values to the enum type
      console.log('[UpdateAmlGroupEnum] Adding STANDARD enum value...');
      await queryRunner.query(`
        ALTER TYPE "clients_amlgroup_enum" ADD VALUE IF NOT EXISTS 'STANDARD';
      `);
      console.log('[UpdateAmlGroupEnum] Adding ELEVATED enum value...');
      await queryRunner.query(`
        ALTER TYPE "clients_amlgroup_enum" ADD VALUE IF NOT EXISTS 'ELEVATED';
      `);

      // Verify enum values were added
      const enumValues = await queryRunner.query(`
        SELECT enumlabel FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'clients_amlgroup_enum');
      `);
      console.log('[UpdateAmlGroupEnum] Current enum values:', enumValues?.map((e: { enumlabel: string }) => e.enumlabel).join(', '));

      // Migrate existing MEDIUM values to STANDARD
      // Note: This requires recreating the enum since PostgreSQL doesn't allow renaming enum values directly
      // We'll create a temporary column, migrate data, and recreate the enum
      // IMPORTANT: This data migration is wrapped in a transaction for atomicity

      // First, check if there are any MEDIUM values to migrate
      const mediumCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "clients" WHERE "amlGroupEnum" = 'MEDIUM';
      `);

      if (mediumCount[0]?.count > 0) {
        console.log(`[UpdateAmlGroupEnum] Found ${mediumCount[0].count} clients with MEDIUM value, migrating to STANDARD...`);
        console.log('[UpdateAmlGroupEnum] Starting transactional data migration...');

        // Wrap data migration in a transaction for atomicity
        await queryRunner.startTransaction();
        try {
          // Store the current values
          await queryRunner.query(`
            ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amlGroupEnum_temp" VARCHAR(20);
          `);
          await queryRunner.query(`
            UPDATE "clients" SET "amlGroupEnum_temp" = "amlGroupEnum"::text;
          `);
          await queryRunner.query(`
            UPDATE "clients" SET "amlGroupEnum_temp" = 'STANDARD' WHERE "amlGroupEnum_temp" = 'MEDIUM';
          `);

          // Drop and recreate the enum
          await queryRunner.query(`
            ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" DROP DEFAULT;
          `);
          await queryRunner.query(`
            ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE VARCHAR(20) USING "amlGroupEnum"::text;
          `);
          await queryRunner.query(`
            DROP TYPE IF EXISTS "clients_amlgroup_enum";
          `);
          await queryRunner.query(`
            CREATE TYPE "clients_amlgroup_enum" AS ENUM('LOW', 'STANDARD', 'ELEVATED', 'HIGH');
          `);
          await queryRunner.query(`
            ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "clients_amlgroup_enum" USING "amlGroupEnum_temp"::"clients_amlgroup_enum";
          `);

          // Verify migration
          const verifyCount = await queryRunner.query(`
            SELECT COUNT(*) as count FROM "clients" WHERE "amlGroupEnum" = 'STANDARD';
          `);
          console.log(`[UpdateAmlGroupEnum] Verified: ${verifyCount[0]?.count || 0} clients now have STANDARD value`);

          // Drop temporary column
          await queryRunner.query(`
            ALTER TABLE "clients" DROP COLUMN IF EXISTS "amlGroupEnum_temp";
          `);

          await queryRunner.commitTransaction();
          console.log('[UpdateAmlGroupEnum] MEDIUM to STANDARD migration completed successfully');
        } catch (txError) {
          console.error('[UpdateAmlGroupEnum] Data migration failed, rolling back...', txError);
          await queryRunner.rollbackTransaction();
          throw txError;
        }
      } else {
        console.log('[UpdateAmlGroupEnum] No MEDIUM values found, skipping migration');
      }

      console.log('[UpdateAmlGroupEnum] Migration UP completed successfully');
    } catch (error) {
      console.error('[UpdateAmlGroupEnum] Migration UP failed:', error);
      throw error; // Re-throw to trigger rollback
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[UpdateAmlGroupEnum] Starting migration DOWN (rollback)...');

    try {
      // Check for ELEVATED and STANDARD values that would be lost
      const elevatedCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "clients" WHERE "amlGroupEnum" = 'ELEVATED';
      `);
      const standardCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "clients" WHERE "amlGroupEnum" = 'STANDARD';
      `);

      const elevated = parseInt(elevatedCount[0]?.count || '0');
      const standard = parseInt(standardCount[0]?.count || '0');

      // BLOCK ROLLBACK if ELEVATED or STANDARD values exist to prevent data loss
      if (elevated > 0 || standard > 0) {
        console.error(`[UpdateAmlGroupEnum] ❌ ROLLBACK BLOCKED: Found ${elevated} ELEVATED and ${standard} STANDARD values.`);
        console.error(`[UpdateAmlGroupEnum]    Rolling back would lose the distinction between these AML groups.`);
        console.error(`[UpdateAmlGroupEnum]    `);
        console.error(`[UpdateAmlGroupEnum]    RECOVERY PROCEDURE:`);
        console.error(`[UpdateAmlGroupEnum]    1. Create audit backup first:`);
        console.error(`[UpdateAmlGroupEnum]       CREATE TABLE clients_aml_backup AS SELECT id, amlGroupEnum FROM clients WHERE amlGroupEnum IN ('STANDARD', 'ELEVATED');`);
        console.error(`[UpdateAmlGroupEnum]    2. Manually update affected clients:`);
        console.error(`[UpdateAmlGroupEnum]       UPDATE clients SET amlGroupEnum = 'MEDIUM' WHERE amlGroupEnum IN ('STANDARD', 'ELEVATED');`);
        console.error(`[UpdateAmlGroupEnum]    3. Re-run migration rollback`);
        console.error(`[UpdateAmlGroupEnum]    4. Restore from backup if needed after data review`);

        throw new Error(
          `ROLLBACK BLOCKED: Found ${elevated} ELEVATED and ${standard} STANDARD values. ` +
          'This migration is one-way when new enum values are in use. ' +
          'Manual data migration required before rollback. See logs for recovery procedure.'
        );
      }

      // Only proceed with rollback if no ELEVATED/STANDARD values exist (safe rollback)
      console.log('[UpdateAmlGroupEnum] No ELEVATED/STANDARD values found. Safe to rollback.');

      // Safe rollback: recreate original enum without STANDARD/ELEVATED values
      console.log('[UpdateAmlGroupEnum] Starting transactional rollback data migration...');
      await queryRunner.startTransaction();
      try {
        // Store the current values in temporary column
        console.log('[UpdateAmlGroupEnum] Creating temporary column for migration...');
        await queryRunner.query(`
          ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amlGroupEnum_temp" VARCHAR(20);
        `);
        await queryRunner.query(`
          UPDATE "clients" SET "amlGroupEnum_temp" = "amlGroupEnum"::text;
        `);

        // Drop default and recreate the enum with original values only
        console.log('[UpdateAmlGroupEnum] Recreating enum type with original values...');
        await queryRunner.query(`
          ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" DROP DEFAULT;
        `);
        await queryRunner.query(`
          ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE VARCHAR(20) USING "amlGroupEnum"::text;
        `);
        await queryRunner.query(`
          DROP TYPE IF EXISTS "clients_amlgroup_enum";
        `);
        await queryRunner.query(`
          CREATE TYPE "clients_amlgroup_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH');
        `);
        await queryRunner.query(`
          ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "clients_amlgroup_enum" USING "amlGroupEnum_temp"::"clients_amlgroup_enum";
        `);

        // Verify enum values after rollback
        const enumValues = await queryRunner.query(`
          SELECT enumlabel FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'clients_amlgroup_enum');
        `);
        console.log('[UpdateAmlGroupEnum] Restored enum values:', enumValues?.map((e: { enumlabel: string }) => e.enumlabel).join(', '));

        // Drop temporary column
        await queryRunner.query(`
          ALTER TABLE "clients" DROP COLUMN IF EXISTS "amlGroupEnum_temp";
        `);

        await queryRunner.commitTransaction();
        console.log('[UpdateAmlGroupEnum] Migration DOWN (rollback) completed successfully');
      } catch (txError) {
        console.error('[UpdateAmlGroupEnum] Rollback data migration failed, undoing changes...', txError);
        await queryRunner.rollbackTransaction();
        throw txError;
      }
    } catch (error) {
      console.error('[UpdateAmlGroupEnum] Migration DOWN failed:', error);
      throw error; // Re-throw to ensure TypeORM knows the rollback failed
    }
  }
}
