import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRATION: AddPkdCodeToClient
 *
 * Adds the pkdCode column to the clients table.
 *
 * PKD (Polska Klasyfikacja Działalności) is the Polish Classification of Business Activities.
 * The pkdCode field stores the client's primary business activity code.
 *
 * Format: XX.XX or XX.XX.Z (e.g., "62.01" or "62.01.Z")
 * - First two digits: Section
 * - Next two digits: Class
 * - Optional ".Z" suffix: Specific activity type
 *
 * ORDERING: This migration runs before:
 * - DropProjectIdFromTimeEntries (1768834398570) - which removes projectId from time_entries
 * And after:
 * - UpdateAmlGroupEnum (1768800000000) - which updates the AML enum values
 */
export class AddPkdCodeToClient1768834398569 implements MigrationInterface {
  name = 'AddPkdCodeToClient1768834398569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pkdCode column to clients table
    // Max length of 10 accommodates format XX.XX.Z with some buffer
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "pkdCode" character varying(10)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the pkdCode column
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "pkdCode"`
    );
  }
}
