import { type MigrationInterface, type QueryRunner } from 'typeorm';

const BATCH_SIZE = 1000;

export class EnhanceClientsModule1764300000000 implements MigrationInterface {
  name = 'EnhanceClientsModule1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================
    // 1. CLIENT ICONS TABLE - Add new columns for multi-type icons
    // =====================================================

    // Add iconType column with default 'custom' for existing file-based icons
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ADD COLUMN IF NOT EXISTS "iconType" VARCHAR(20) DEFAULT 'custom'
    `);

    // Add iconValue for Lucide icon name or emoji character
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ADD COLUMN IF NOT EXISTS "iconValue" VARCHAR(100)
    `);

    // Add autoAssignCondition as JSONB for condition-based auto-assignment
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ADD COLUMN IF NOT EXISTS "autoAssignCondition" JSONB
    `);

    // Add tooltip for hover text
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ADD COLUMN IF NOT EXISTS "tooltip" VARCHAR(255)
    `);

    // Make file columns nullable (only required for 'custom' type)
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ALTER COLUMN "fileName" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ALTER COLUMN "filePath" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ALTER COLUMN "mimeType" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      ALTER COLUMN "fileSize" DROP NOT NULL
    `);

    // =====================================================
    // 2. CLIENT ICON ASSIGNMENTS TABLE - Add isAutoAssigned flag
    // =====================================================

    await queryRunner.query(`
      ALTER TABLE "client_icon_assignments"
      ADD COLUMN IF NOT EXISTS "isAutoAssigned" BOOLEAN DEFAULT false
    `);

    // =====================================================
    // 3. CLIENTS TABLE - Add new fields
    // =====================================================

    // Add receiveEmailCopy boolean
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "receiveEmailCopy" BOOLEAN DEFAULT false
    `);

    // Add gtuCodes array column
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "gtuCodes" TEXT[]
    `);

    // Migrate existing gtuCode data to gtuCodes array in batches
    // This prevents lock contention on large tables
    let updatedRows: number;
    let totalMigrated = 0;
    do {
      const result = await queryRunner.query(`
        WITH batch AS (
          SELECT id FROM "clients"
          WHERE "gtuCode" IS NOT NULL AND "gtuCode" != '' AND "gtuCodes" IS NULL
          LIMIT ${BATCH_SIZE}
        )
        UPDATE "clients" c
        SET "gtuCodes" = ARRAY[c."gtuCode"]
        FROM batch
        WHERE c.id = batch.id
        RETURNING c.id
      `);
      updatedRows = Array.isArray(result) ? result.length : 0;
      totalMigrated += updatedRows;
    } while (updatedRows === BATCH_SIZE);

    if (totalMigrated > 0) {
      console.log(`Migrated ${totalMigrated} gtuCode values to gtuCodes array`);
    }

    // Create AmlGroup enum type if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "clients_amlgroup_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new amlGroup enum column (keep existing string column for now)
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "amlGroupEnum" "clients_amlgroup_enum"
    `);

    // Migrate existing amlGroup string data to enum in batches
    // LOW mapping
    let lowMigrated = 0;
    do {
      const result = await queryRunner.query(`
        WITH batch AS (
          SELECT id FROM "clients"
          WHERE LOWER("amlGroup") IN ('low', 'niskie', 'niski', 'l')
          AND "amlGroupEnum" IS NULL
          LIMIT ${BATCH_SIZE}
        )
        UPDATE "clients" c SET "amlGroupEnum" = 'LOW'
        FROM batch WHERE c.id = batch.id
        RETURNING c.id
      `);
      updatedRows = Array.isArray(result) ? result.length : 0;
      lowMigrated += updatedRows;
    } while (updatedRows === BATCH_SIZE);

    // MEDIUM mapping
    let mediumMigrated = 0;
    do {
      const result = await queryRunner.query(`
        WITH batch AS (
          SELECT id FROM "clients"
          WHERE LOWER("amlGroup") IN ('medium', 'srednie', 'średnie', 'sredni', 'm')
          AND "amlGroupEnum" IS NULL
          LIMIT ${BATCH_SIZE}
        )
        UPDATE "clients" c SET "amlGroupEnum" = 'MEDIUM'
        FROM batch WHERE c.id = batch.id
        RETURNING c.id
      `);
      updatedRows = Array.isArray(result) ? result.length : 0;
      mediumMigrated += updatedRows;
    } while (updatedRows === BATCH_SIZE);

    // HIGH mapping
    let highMigrated = 0;
    do {
      const result = await queryRunner.query(`
        WITH batch AS (
          SELECT id FROM "clients"
          WHERE LOWER("amlGroup") IN ('high', 'wysokie', 'wysoki', 'h')
          AND "amlGroupEnum" IS NULL
          LIMIT ${BATCH_SIZE}
        )
        UPDATE "clients" c SET "amlGroupEnum" = 'HIGH'
        FROM batch WHERE c.id = batch.id
        RETURNING c.id
      `);
      updatedRows = Array.isArray(result) ? result.length : 0;
      highMigrated += updatedRows;
    } while (updatedRows === BATCH_SIZE);

    // Fallback: Set unmapped amlGroup values to LOW with warning
    // This handles any non-standard values that don't match known patterns
    const unmappedResult = await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum" = 'LOW'
      WHERE "amlGroup" IS NOT NULL AND "amlGroupEnum" IS NULL
      RETURNING id, "amlGroup"
    `);
    const unmappedCount = Array.isArray(unmappedResult) ? unmappedResult.length : 0;

    if (unmappedCount > 0) {
      console.warn(
        `WARNING: ${unmappedCount} clients had unmapped AML values that defaulted to LOW. ` +
          `Affected values: ${[...new Set(unmappedResult.map((r: { amlGroup: string }) => r.amlGroup))].join(', ')}`
      );
    }

    console.log(
      `AML migration complete: LOW=${lowMigrated}, MEDIUM=${mediumMigrated}, HIGH=${highMigrated}, FALLBACK=${unmappedCount}`
    );

    // =====================================================
    // 4. Add indexes for new columns
    // =====================================================

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_icons_iconType"
      ON "client_icons" ("iconType")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_icon_assignments_isAutoAssigned"
      ON "client_icon_assignments" ("isAutoAssigned")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_client_icon_assignments_isAutoAssigned"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_client_icons_iconType"
    `);

    // Preserve data: migrate gtuCodes[1] back to gtuCode before dropping
    // Note: This loses any additional codes beyond the first one
    const preserveResult = await queryRunner.query(`
      UPDATE "clients" SET "gtuCode" = "gtuCodes"[1]
      WHERE "gtuCodes" IS NOT NULL AND array_length("gtuCodes", 1) > 0 AND "gtuCode" IS NULL
      RETURNING id
    `);
    const preservedCount = Array.isArray(preserveResult) ? preserveResult.length : 0;
    if (preservedCount > 0) {
      console.warn(
        `WARNING: Migrated ${preservedCount} gtuCodes back to gtuCode. ` +
          `If any clients had multiple GTU codes, only the first was preserved.`
      );
    }

    // Drop new columns from clients table
    await queryRunner.query(`
      ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "amlGroupEnum"
    `);

    await queryRunner.query(`
      ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "gtuCodes"
    `);

    await queryRunner.query(`
      ALTER TABLE "clients"
      DROP COLUMN IF EXISTS "receiveEmailCopy"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "clients_amlgroup_enum"
    `);

    // Drop isAutoAssigned from client_icon_assignments
    await queryRunner.query(`
      ALTER TABLE "client_icon_assignments"
      DROP COLUMN IF EXISTS "isAutoAssigned"
    `);

    // Drop new columns from client_icons
    await queryRunner.query(`
      ALTER TABLE "client_icons"
      DROP COLUMN IF EXISTS "tooltip"
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      DROP COLUMN IF EXISTS "autoAssignCondition"
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      DROP COLUMN IF EXISTS "iconValue"
    `);

    await queryRunner.query(`
      ALTER TABLE "client_icons"
      DROP COLUMN IF EXISTS "iconType"
    `);

    // Note: NOT restoring NOT NULL on file columns as there may be
    // Lucide/emoji icons that don't have file data. This is intentional.
  }
}
