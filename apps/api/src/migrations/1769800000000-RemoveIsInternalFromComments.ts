import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class RemoveIsInternalFromComments1769800000000 implements MigrationInterface {
  name = 'RemoveIsInternalFromComments1769800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use IF EXISTS to make migration idempotent - running twice won't fail
    await queryRunner.query(`ALTER TABLE "settlement_comments" DROP COLUMN IF EXISTS "isInternal"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" ADD "isInternal" boolean NOT NULL DEFAULT true`
    );
  }
}
