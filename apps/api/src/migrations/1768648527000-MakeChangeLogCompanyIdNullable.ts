import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class MakeChangeLogCompanyIdNullable1737116000000 implements MigrationInterface {
  name = 'MakeChangeLogCompanyIdNullable1737116000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skip entirely if the change_logs table doesn't exist yet —
    // AddCompanyIdToEntities (timestamp 1766502602648) will add the column later.
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM "information_schema"."tables"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'change_logs'
    `);
    if (tableExists.length === 0) return;

    // Drop foreign key constraint first
    await queryRunner.query(`
      ALTER TABLE "change_logs"
      DROP CONSTRAINT IF EXISTS "FK_change_logs_company"
    `);

    // Check if companyId column exists; add it if missing, otherwise make it nullable
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'change_logs'
        AND "column_name" = 'companyId'
    `);

    if (columnExists.length === 0) {
      // Column doesn't exist yet — add it as nullable UUID
      await queryRunner.query(`
        ALTER TABLE "change_logs"
        ADD COLUMN "companyId" uuid
      `);
    } else {
      // Column exists — just drop the NOT NULL constraint
      await queryRunner.query(`
        ALTER TABLE "change_logs"
        ALTER COLUMN "companyId" DROP NOT NULL
      `);
    }

    // Re-add foreign key with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "change_logs"
      ADD CONSTRAINT "FK_change_logs_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: Rollback may fail if there are NULL companyId values
    await queryRunner.query(`
      ALTER TABLE "change_logs" 
      ALTER COLUMN "companyId" SET NOT NULL
    `);
  }
}
