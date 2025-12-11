import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeApiKeyNullable1700000000006 implements MigrationInterface {
  name = 'MakeApiKeyNullable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow apiKey to be NULL to support reset/clearing functionality
    await queryRunner.query(`ALTER TABLE "ai_configurations" ALTER COLUMN "apiKey" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This will fail if there are NULL values in the column
    // To safely revert, first update NULL values to a placeholder or delete those rows
    await queryRunner.query(`ALTER TABLE "ai_configurations" ALTER COLUMN "apiKey" SET NOT NULL`);
  }
}
