import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class FixOfferNumberUniqueConstraint1769900000000 implements MigrationInterface {
  name = 'FixOfferNumberUniqueConstraint1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the global unique constraint on offerNumber
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "UQ_offers_offerNumber"`
    );
    // Also handle TypeORM auto-generated constraint names
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_offers_offerNumber"`);
    // Drop any unique index that may exist on just offerNumber
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offers_offerNumber_unique"`);

    // Find and drop any existing unique constraint on offerNumber column alone
    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        FOR constraint_name IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE rel.relname = 'offers'
            AND con.contype = 'u'
            AND array_length(con.conkey, 1) = 1
            AND con.conkey[1] = (
              SELECT attnum FROM pg_attribute
              WHERE attrelid = rel.oid AND attname = 'offerNumber'
            )
        LOOP
          EXECUTE format('ALTER TABLE "offers" DROP CONSTRAINT %I', constraint_name);
        END LOOP;
      END $$;
    `);

    // Add compound unique constraint on (companyId, offerNumber)
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "UQ_offers_companyId_offerNumber" UNIQUE ("companyId", "offerNumber")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the compound unique constraint
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "UQ_offers_companyId_offerNumber"`
    );

    // Restore the global unique constraint on offerNumber
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "UQ_offers_offerNumber" UNIQUE ("offerNumber")`
    );
  }
}
