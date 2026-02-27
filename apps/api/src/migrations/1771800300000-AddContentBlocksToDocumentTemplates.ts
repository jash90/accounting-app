import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddContentBlocksToDocumentTemplates1771800300000 implements MigrationInterface {
  name = 'AddContentBlocksToDocumentTemplates1771800300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_templates" ADD "contentBlocks" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "document_templates" ADD "documentSourceType" varchar(20) NOT NULL DEFAULT 'text'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_templates" DROP COLUMN "documentSourceType"`);
    await queryRunner.query(`ALTER TABLE "document_templates" DROP COLUMN "contentBlocks"`);
  }
}
