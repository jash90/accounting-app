import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Replaces the case-sensitive unique constraint on users.email with a
 * case-insensitive functional index using LOWER(email).
 *
 * This matches the AuthService query pattern: WHERE LOWER(email) = LOWER(:email)
 * and prevents duplicate registrations like "Admin@test.com" vs "admin@test.com".
 */
export class AddCaseInsensitiveEmailIndex1772000000001 implements MigrationInterface {
  name = 'AddCaseInsensitiveEmailIndex1772000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check for case-insensitive duplicates before creating unique index
    const duplicates = await queryRunner.query(`
      SELECT LOWER(email) as lower_email, COUNT(*) as cnt
      FROM users
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      throw new Error(
        `Cannot create case-insensitive unique index: found ${duplicates.length} duplicate email(s). ` +
          `Resolve duplicates first: ${duplicates.map((d: { lower_email: string }) => d.lower_email).join(', ')}`
      );
    }

    // Drop existing case-sensitive unique constraint/index
    // TypeORM generates either a constraint or index depending on version
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Try dropping as a constraint first
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
            AND constraint_name IN (
              SELECT conname FROM pg_constraint
              WHERE conrelid = 'users'::regclass
                AND contype = 'u'
                AND EXISTS (
                  SELECT 1 FROM pg_attribute
                  WHERE attrelid = 'users'::regclass
                    AND attname = 'email'
                    AND attnum = ANY(conkey)
                )
            )
        ) THEN
          EXECUTE (
            SELECT 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(conname)
            FROM pg_constraint
            WHERE conrelid = 'users'::regclass
              AND contype = 'u'
              AND EXISTS (
                SELECT 1 FROM pg_attribute
                WHERE attrelid = 'users'::regclass
                  AND attname = 'email'
                  AND attnum = ANY(conkey)
              )
            LIMIT 1
          );
        END IF;
      END $$;
    `);

    // Drop any remaining unique index on email
    await queryRunner.query(`
      DO $$
      DECLARE
        idx_name text;
      BEGIN
        SELECT indexname INTO idx_name
        FROM pg_indexes
        WHERE tablename = 'users'
          AND indexdef LIKE '%UNIQUE%'
          AND indexdef LIKE '%email%'
          AND indexdef NOT LIKE '%lower%'
        LIMIT 1;

        IF idx_name IS NOT NULL THEN
          EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_name);
        END IF;
      END $$;
    `);

    // Create case-insensitive unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email_lower" ON "users" (LOWER("email"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the case-insensitive index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_lower"`);

    // Restore the original case-sensitive unique constraint
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")
    `);
  }
}
