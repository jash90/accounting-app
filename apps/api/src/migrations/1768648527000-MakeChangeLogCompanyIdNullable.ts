import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class MakeChangeLogCompanyIdNullable1737116000000 implements MigrationInterface {
  name = 'MakeChangeLogCompanyIdNullable1737116000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    await queryRunner.query(`
      ALTER TABLE "change_logs" 
      DROP CONSTRAINT IF EXISTS "FK_change_logs_company"
    `);

    // Make companyId nullable
    await queryRunner.query(`
      ALTER TABLE "change_logs" 
      ALTER COLUMN "companyId" DROP NOT NULL
    `);

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
