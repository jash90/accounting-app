import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettlementIdToTimeEntry1771700200000 implements MigrationInterface {
  name = 'AddSettlementIdToTimeEntry1771700200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "settlementId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_time_entries_settlement" FOREIGN KEY ("settlementId") REFERENCES "monthly_settlements"("id") ON DELETE SET NULL`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_time_entries_company_settlement" ON "time_entries" ("companyId", "settlementId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_time_entries_company_settlement"`);
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT IF EXISTS "FK_time_entries_settlement"`
    );
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "settlementId"`);
  }
}
