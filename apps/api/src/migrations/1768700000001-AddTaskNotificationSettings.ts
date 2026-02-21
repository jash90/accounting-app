import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTaskNotificationSettings1768700000001 implements MigrationInterface {
  name = 'AddTaskNotificationSettings1768700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new notification settings columns for task-related notifications
    await queryRunner.query(`
            ALTER TABLE "notification_settings"
            ADD COLUMN IF NOT EXISTS "receiveOnTaskCompleted" boolean NOT NULL DEFAULT true
        `);

    await queryRunner.query(`
            ALTER TABLE "notification_settings"
            ADD COLUMN IF NOT EXISTS "receiveOnTaskOverdue" boolean NOT NULL DEFAULT true
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "notification_settings"
            DROP COLUMN IF EXISTS "receiveOnTaskOverdue"
        `);

    await queryRunner.query(`
            ALTER TABLE "notification_settings"
            DROP COLUMN IF EXISTS "receiveOnTaskCompleted"
        `);
  }
}
