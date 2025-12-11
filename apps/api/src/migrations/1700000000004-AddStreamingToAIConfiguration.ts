import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreamingToAIConfiguration1700000000004 implements MigrationInterface {
  name = 'AddStreamingToAIConfiguration1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add enableStreaming column to ai_configurations table
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD COLUMN IF NOT EXISTS "enableStreaming" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove enableStreaming column
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      DROP COLUMN IF EXISTS "enableStreaming"
    `);
  }
}
