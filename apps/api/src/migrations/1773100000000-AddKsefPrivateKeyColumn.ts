import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddKsefPrivateKeyColumn1773100000000 implements MigrationInterface {
  name = 'AddKsefPrivateKeyColumn1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ksef_configurations"
      ADD COLUMN IF NOT EXISTS "encryptedPrivateKey" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ksef_configurations"
      DROP COLUMN IF EXISTS "encryptedPrivateKey"
    `);
  }
}
