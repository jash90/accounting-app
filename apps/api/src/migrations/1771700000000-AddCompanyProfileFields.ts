import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyProfileFields1771700000000 implements MigrationInterface {
  name = 'AddCompanyProfileFields1771700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "nip" varchar(10)`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "regon" varchar(14)`);
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "street" varchar(255)`
    );
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "city" varchar(100)`);
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "postalCode" varchar(10)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "country" varchar(100) DEFAULT 'Polska'`
    );
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "phone" varchar(20)`);
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "bankAccount" varchar(50)`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ownerName" varchar(255)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "nip"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "regon"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "street"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "postalCode"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "country"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "bankAccount"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "ownerName"`);
  }
}
