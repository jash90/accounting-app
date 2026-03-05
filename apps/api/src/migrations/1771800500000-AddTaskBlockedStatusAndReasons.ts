import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTaskBlockedStatusAndReasons1771800500000 implements MigrationInterface {
  name = 'AddTaskBlockedStatusAndReasons1771800500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'blocked' value to the tasks_status_enum PostgreSQL enum
    await queryRunner.query(
      `ALTER TYPE "public"."tasks_status_enum" ADD VALUE IF NOT EXISTS 'blocked'`
    );

    // Add blockingReason column
    await queryRunner.query(`ALTER TABLE "tasks" ADD "blockingReason" character varying`);

    // Add cancellationReason column
    await queryRunner.query(`ALTER TABLE "tasks" ADD "cancellationReason" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "cancellationReason"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN IF EXISTS "blockingReason"`);
    // Note: PostgreSQL does not support removing enum values without recreating the type.
    // Manual intervention required to remove 'blocked' from tasks_status_enum.
  }
}
