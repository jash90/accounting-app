import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTemplateFields1771697883012 implements MigrationInterface {
  name = 'AddTaskTemplateFields1771697883012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "isTemplate" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "recurrencePattern" jsonb`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "recurrenceEndDate" date`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "lastRecurrenceDate" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD "templateId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_8d1c72880eb711a743cf609fe15" FOREIGN KEY ("templateId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_8d1c72880eb711a743cf609fe15"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "templateId"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "lastRecurrenceDate"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "recurrenceEndDate"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "recurrencePattern"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "isTemplate"`);
  }
}
