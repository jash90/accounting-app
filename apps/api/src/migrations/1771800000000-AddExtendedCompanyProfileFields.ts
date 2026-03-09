import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtendedCompanyProfileFields1771800000000 implements MigrationInterface {
  name = 'AddExtendedCompanyProfileFields1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "krs" varchar(17)`);
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "buildingNumber" varchar(10)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "apartmentNumber" varchar(10)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ownerFirstName" varchar(100)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ownerLastName" varchar(100)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ownerEmail" varchar(255)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ownerPhone" varchar(20)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "bankName" varchar(100)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "defaultEmailSignature" text`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "defaultDocumentFooter" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "krs"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "buildingNumber"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "apartmentNumber"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "ownerFirstName"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "ownerLastName"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "ownerEmail"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "ownerPhone"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "bankName"`);
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "defaultEmailSignature"`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "defaultDocumentFooter"`
    );
  }
}
