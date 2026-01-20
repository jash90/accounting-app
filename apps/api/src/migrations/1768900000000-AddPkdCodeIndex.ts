import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRATION: AddPkdCodeIndex
 *
 * Adds an index on the clients.pkdCode column to improve query performance
 * when filtering clients by PKD code.
 *
 * ORDERING: This migration runs after all previous client-related migrations.
 */
export class AddPkdCodeIndex1768900000000 implements MigrationInterface {
  name = 'AddPkdCodeIndex1768900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create index on pkdCode column for faster filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clients_pkdCode" ON "clients" ("pkdCode");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_clients_pkdCode";
    `);
  }
}
