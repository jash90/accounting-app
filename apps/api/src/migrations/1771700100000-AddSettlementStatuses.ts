import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettlementStatuses1771700100000 implements MigrationInterface {
  name = 'AddSettlementStatuses1771700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "monthly_settlements_status_enum" ADD VALUE IF NOT EXISTS 'MISSING_INVOICE_VERIFICATION'`
    );
    await queryRunner.query(
      `ALTER TYPE "monthly_settlements_status_enum" ADD VALUE IF NOT EXISTS 'MISSING_INVOICE'`
    );
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // This is intentionally left empty as enum value removal requires table recreation
    return Promise.resolve();
  }
}
