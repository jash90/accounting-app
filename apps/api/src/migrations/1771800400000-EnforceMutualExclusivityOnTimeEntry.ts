import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceMutualExclusivityOnTimeEntry1771800400000 implements MigrationInterface {
  name = 'EnforceMutualExclusivityOnTimeEntry1771800400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Fix existing data (keep settlement, clear task when both set)
    await queryRunner.query(`
      UPDATE "time_entries"
      SET "taskId" = NULL
      WHERE "taskId" IS NOT NULL AND "settlementId" IS NOT NULL
    `);

    // Step 2: Add CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      ADD CONSTRAINT "CHK_time_entries_task_or_settlement"
      CHECK (NOT ("taskId" IS NOT NULL AND "settlementId" IS NOT NULL))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "time_entries"
      DROP CONSTRAINT "CHK_time_entries_task_or_settlement"
    `);
  }
}
