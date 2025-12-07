import { MigrationInterface, QueryRunner } from 'typeorm';

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

    // Migrate existing gtuCode data to gtuCodes array
    await queryRunner.query(`
      UPDATE "clients"
      SET "gtuCodes" = ARRAY["gtuCode"]
      WHERE "gtuCode" IS NOT NULL AND "gtuCode" != '' AND "gtuCodes" IS NULL
    `);

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

    // Migrate existing amlGroup string data to enum
    await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum" = 'LOW'
      WHERE LOWER("amlGroup") IN ('low', 'niskie', 'niski', 'l')
      AND "amlGroupEnum" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum" = 'MEDIUM'
      WHERE LOWER("amlGroup") IN ('medium', 'srednie', 'średnie', 'sredni', 'm')
      AND "amlGroupEnum" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum" = 'HIGH'
      WHERE LOWER("amlGroup") IN ('high', 'wysokie', 'wysoki', 'h')
      AND "amlGroupEnum" IS NULL
    `);

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
