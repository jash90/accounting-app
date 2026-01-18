import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyNotificationEmail1764200000000 implements MigrationInterface {
  name = 'AddCompanyNotificationEmail1764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "notificationFromEmail" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "notificationFromEmail"
    `);
  }
}
