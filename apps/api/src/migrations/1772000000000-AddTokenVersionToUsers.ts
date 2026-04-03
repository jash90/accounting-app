import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds tokenVersion column to users table for JWT revocation support.
 * When a user logs out or changes password, tokenVersion is incremented.
 * JwtStrategy.validate() compares the tokenVersion in the JWT payload
 * with the current value in the database to reject invalidated tokens.
 */
export class AddTokenVersionToUsers1772000000000 implements MigrationInterface {
  name = 'AddTokenVersionToUsers1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
  }
}
