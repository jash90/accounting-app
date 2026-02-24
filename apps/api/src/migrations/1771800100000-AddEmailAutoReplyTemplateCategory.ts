import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailAutoReplyTemplateCategory1771800100000 implements MigrationInterface {
  name = 'AddEmailAutoReplyTemplateCategory1771800100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_auto_reply_templates" ADD COLUMN IF NOT EXISTS "category" varchar(50)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_auto_reply_templates" DROP COLUMN IF EXISTS "category"`
    );
  }
}
