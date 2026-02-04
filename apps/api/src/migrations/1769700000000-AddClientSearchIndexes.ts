import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientSearchIndexes1769700000000 implements MigrationInterface {
  name = 'AddClientSearchIndexes1769700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm extension for trigram indexes (improves ILIKE performance)
    // This is idempotent - IF NOT EXISTS prevents errors if already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Create GIN trigram indexes for ILIKE searches on clients table
    // These dramatically improve performance for pattern matching queries like:
    // WHERE name ILIKE '%search%' OR nip ILIKE '%search%'
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clients_name_trgm"
      ON "public"."clients" USING GIN ("name" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clients_nip_trgm"
      ON "public"."clients" USING GIN ("nip" gin_trgm_ops)
    `);

    // Add B-tree index on nip for exact matches and range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clients_nip"
      ON "public"."clients" ("nip")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_clients_nip"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_clients_nip_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_clients_name_trgm"`);
    // Note: We don't drop pg_trgm extension as it might be used by other indexes
  }
}
