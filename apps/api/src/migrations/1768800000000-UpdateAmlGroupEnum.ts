import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAmlGroupEnum1768800000000 implements MigrationInterface {
  name = 'UpdateAmlGroupEnum1768800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new values to the enum type
    await queryRunner.query(`
      ALTER TYPE "clients_amlgroupenum_enum" ADD VALUE IF NOT EXISTS 'STANDARD';
    `);
    await queryRunner.query(`
      ALTER TYPE "clients_amlgroupenum_enum" ADD VALUE IF NOT EXISTS 'ELEVATED';
    `);

    // Migrate existing MEDIUM values to STANDARD
    // Note: This requires recreating the enum since PostgreSQL doesn't allow renaming enum values directly
    // We'll create a temporary column, migrate data, and recreate the enum

    // First, check if there are any MEDIUM values to migrate
    const mediumCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM "clients" WHERE "amlGroupEnum" = 'MEDIUM';
    `);

    if (mediumCount[0]?.count > 0) {
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
        DROP TYPE IF EXISTS "clients_amlgroupenum_enum";
      `);
      await queryRunner.query(`
        CREATE TYPE "clients_amlgroupenum_enum" AS ENUM('LOW', 'STANDARD', 'ELEVATED', 'HIGH');
      `);
      await queryRunner.query(`
        ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "clients_amlgroupenum_enum" USING "amlGroupEnum_temp"::"clients_amlgroupenum_enum";
      `);

      // Drop temporary column
      await queryRunner.query(`
        ALTER TABLE "clients" DROP COLUMN IF EXISTS "amlGroupEnum_temp";
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Store the current values
    await queryRunner.query(`
      ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "amlGroupEnum_temp" VARCHAR(20);
    `);
    await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum_temp" = "amlGroupEnum"::text;
    `);
    // Map new values back to old
    await queryRunner.query(`
      UPDATE "clients" SET "amlGroupEnum_temp" = 'MEDIUM' WHERE "amlGroupEnum_temp" IN ('STANDARD', 'ELEVATED');
    `);

    // Drop and recreate the enum
    await queryRunner.query(`
      ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE VARCHAR(20) USING "amlGroupEnum"::text;
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "clients_amlgroupenum_enum";
    `);
    await queryRunner.query(`
      CREATE TYPE "clients_amlgroupenum_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH');
    `);
    await queryRunner.query(`
      ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "clients_amlgroupenum_enum" USING "amlGroupEnum_temp"::"clients_amlgroupenum_enum";
    `);

    // Drop temporary column
    await queryRunner.query(`
      ALTER TABLE "clients" DROP COLUMN IF EXISTS "amlGroupEnum_temp";
    `);
  }
}
