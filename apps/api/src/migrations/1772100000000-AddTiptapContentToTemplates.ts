import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTiptapContentToTemplates1772100000000 implements MigrationInterface {
  name = 'AddTiptapContentToTemplates1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_templates" ADD "tiptapContent" jsonb`);
    await queryRunner.query(`ALTER TABLE "offer_templates" ADD "tiptapContent" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offer_templates" DROP COLUMN "tiptapContent"`);
    await queryRunner.query(`ALTER TABLE "document_templates" DROP COLUMN "tiptapContent"`);
  }
}
