import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSuspensionDateFromClients1769200000000 implements MigrationInterface {
  name = 'RemoveSuspensionDateFromClients1769200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the deprecated suspensionDate column from clients table
    // Suspension history is now managed via client_suspensions table
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "suspensionDate"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the suspensionDate column if needed to rollback
    await queryRunner.query(`ALTER TABLE "clients" ADD COLUMN "suspensionDate" date`);
  }
}
