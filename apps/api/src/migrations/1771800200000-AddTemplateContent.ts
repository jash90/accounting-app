import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateContent1771800200000 implements MigrationInterface {
  name = 'AddTemplateContent1771800200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "templateContent" text NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document_templates" DROP COLUMN IF EXISTS "templateContent"`
    );
  }
}
