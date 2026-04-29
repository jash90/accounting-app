import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKsefSalesDateColumn1773200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ksef_invoices" ADD COLUMN IF NOT EXISTS "salesDate" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ksef_invoices" DROP COLUMN IF EXISTS "salesDate"`,
    );
  }
}
