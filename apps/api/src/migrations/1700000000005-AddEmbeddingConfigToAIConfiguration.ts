import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingConfigToAIConfiguration1700000000005
  implements MigrationInterface
{
  name = 'AddEmbeddingConfigToAIConfiguration1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add embeddingProvider column with default value (IF NOT EXISTS for idempotency)
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD COLUMN IF NOT EXISTS "embeddingProvider" character varying DEFAULT 'openai'
    `);

    // Add embeddingApiKey column (nullable, encrypted value)
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD COLUMN IF NOT EXISTS "embeddingApiKey" text
    `);

    // Add embeddingModel column with default value
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD COLUMN IF NOT EXISTS "embeddingModel" character varying(100) DEFAULT 'text-embedding-ada-002'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_configurations" DROP COLUMN IF EXISTS "embeddingModel"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_configurations" DROP COLUMN IF EXISTS "embeddingApiKey"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_configurations" DROP COLUMN IF EXISTS "embeddingProvider"
    `);
  }
}
