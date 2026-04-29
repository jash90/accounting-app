import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds the `refresh_tokens` table that backs OWASP-recommended
 * refresh-token rotation with reuse detection.
 *
 * Why: previously a refresh JWT could be reused indefinitely until expiry.
 * If a refresh token leaked (XSS, log spill, phishing), the attacker had a
 * 7-day window with no detection. The new flow:
 *
 *   1. Login issues a refresh JWT carrying `jti` and `family` claims.
 *   2. A row is inserted into `refresh_tokens` with `usedAt = NULL`.
 *   3. Each refresh marks the row used (`usedAt = NOW()`) and issues a new
 *      JWT + row that share the same `family`.
 *   4. If a `usedAt != NULL` token is presented again, the entire `family`
 *      is invalidated and the user's `tokenVersion` is bumped.
 *
 * Pre-migration tokens (which lack `jti`) are accepted ONCE for backward
 * compatibility and immediately replaced with a properly tracked token.
 *
 * @see libs/common/src/lib/entities/refresh-token.entity.ts
 * @see libs/auth/src/lib/services/auth.service.ts
 */
export class AddRefreshTokensTable1773500000000 implements MigrationInterface {
  name = 'AddRefreshTokensTable1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jti" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "family" uuid NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "usedAt" TIMESTAMPTZ,
        "replacedById" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_jti" UNIQUE ("jti"),
        CONSTRAINT "FK_refresh_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_family" ON "refresh_tokens" ("family")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_family"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
