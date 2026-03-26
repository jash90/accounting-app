import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddLeadCompanyEmailUniqueConstraint1771900000001 implements MigrationInterface {
  name = 'AddLeadCompanyEmailUniqueConstraint1771900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_leads_companyId_email" ON "leads" ("companyId", "email") WHERE "email" IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_leads_companyId_email"`);
  }
}
