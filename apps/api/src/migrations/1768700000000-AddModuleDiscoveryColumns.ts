import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddModuleDiscoveryColumns1768700000000 implements MigrationInterface {
  name = 'AddModuleDiscoveryColumns1768700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // AddTasksModule (timestamp 1768644507694) may have already created modules_source_enum.
    // In that case, skip creating the old module_source_enum and use the existing type for source.
    const modulesSourceEnumExists = await queryRunner.query(`
      SELECT 1 FROM "pg_type"
      WHERE "typname" = 'modules_source_enum'
        AND "typnamespace" = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);

    if (modulesSourceEnumExists.length === 0) {
      // Fresh install without AddTasksModule having run: create module_source_enum
      await queryRunner.query(`
        CREATE TYPE "module_source_enum" AS ENUM ('file', 'database', 'legacy')
      `);
    }

    const sourceType =
      modulesSourceEnumExists.length > 0 ? '"modules_source_enum"' : '"module_source_enum"';

    // Add new columns to modules table (IF NOT EXISTS for idempotency)
    const sourceColExists = await queryRunner.query(`
      SELECT 1 FROM "information_schema"."columns"
      WHERE "table_schema" = 'public' AND "table_name" = 'modules' AND "column_name" = 'source'
    `);
    if (sourceColExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "modules"
        ADD COLUMN "source" ${sourceType} NOT NULL DEFAULT 'legacy'
      `);
    }

    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "version" VARCHAR NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "permissions" TEXT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "defaultPermissions" TEXT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "configPath" VARCHAR NULL`
    );
    await queryRunner.query(`ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "icon" VARCHAR NULL`);
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "category" VARCHAR NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "dependencies" TEXT NULL`
    );
    await queryRunner.query(`ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "config" JSONB NULL`);
    await queryRunner.query(
      `ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
    );

    // Create indexes (IF NOT EXISTS to support re-runs and cross-migration ordering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_modules_source" ON "modules" ("source")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_modules_category" ON "modules" ("category")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_modules_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_modules_source"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "config"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "dependencies"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "configPath"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "defaultPermissions"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "permissions"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "source"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "module_source_enum"`);
  }
}
