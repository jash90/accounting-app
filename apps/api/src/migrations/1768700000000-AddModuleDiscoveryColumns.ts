import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModuleDiscoveryColumns1768700000000 implements MigrationInterface {
  name = 'AddModuleDiscoveryColumns1768700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for module source
    await queryRunner.query(`
      CREATE TYPE "module_source_enum" AS ENUM ('file', 'database', 'legacy')
    `);

    // Add new columns to modules table
    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "source" "module_source_enum" NOT NULL DEFAULT 'legacy'
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "version" VARCHAR NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "permissions" TEXT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "defaultPermissions" TEXT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "configPath" VARCHAR NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "icon" VARCHAR NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "category" VARCHAR NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "dependencies" TEXT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "config" JSONB NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "modules"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Create index for source column for faster queries
    await queryRunner.query(`
      CREATE INDEX "IDX_modules_source" ON "modules" ("source")
    `);

    // Create index for category for grouping
    await queryRunner.query(`
      CREATE INDEX "IDX_modules_category" ON "modules" ("category")
    `);
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
