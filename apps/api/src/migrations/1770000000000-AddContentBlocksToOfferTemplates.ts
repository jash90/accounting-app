import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddContentBlocksToOfferTemplates1770000000000 implements MigrationInterface {
  name = 'AddContentBlocksToOfferTemplates1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offer_templates" ADD "contentBlocks" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "offer_templates" ADD "documentSourceType" varchar(20) NOT NULL DEFAULT 'file'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offer_templates" DROP COLUMN "documentSourceType"`);
    await queryRunner.query(`ALTER TABLE "offer_templates" DROP COLUMN "contentBlocks"`);
  }
}
