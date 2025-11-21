import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullCompanyIdInSimpleTexts1700000000000 implements MigrationInterface {
  name = 'AllowNullCompanyIdInSimpleTexts1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow NULL values for companyId in simple_texts table
    // This enables admin users to create entries without company association
    await queryRunner.query(`
      ALTER TABLE "simple_texts"
      ALTER COLUMN "companyId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Before re-adding NOT NULL constraint, delete admin entries (companyId = NULL)
    await queryRunner.query(`
      DELETE FROM "simple_texts"
      WHERE "companyId" IS NULL
    `);

    // Re-add NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE "simple_texts"
      ALTER COLUMN "companyId" SET NOT NULL
    `);
  }
}
