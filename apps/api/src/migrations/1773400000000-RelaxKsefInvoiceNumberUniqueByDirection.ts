import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Replaces the `(companyId, invoiceNumber)` unique key on `ksef_invoices`
 * with `(companyId, invoiceNumber, direction)`.
 *
 * Why: invoice numbers are issued per direction. A vendor's incoming
 * invoice can share a number with one of our outgoing invoices, and the
 * old constraint blocked sync's reconciliation lookup from finding the
 * right row in the bidirectional sync flow — pulling a vendor invoice
 * with a colliding number would either fail with a unique-constraint
 * violation OR (after the reconciliation path was added) silently
 * overwrite the wrong row.
 *
 * The constraint name TypeORM auto-generated for the old @Unique was
 * `UQ_<hash>` — to keep the migration deterministic across environments
 * we drop by the column-list signature instead, using PostgreSQL's
 * `pg_constraint` lookup.
 */
export class RelaxKsefInvoiceNumberUniqueByDirection1773400000000
  implements MigrationInterface
{
  name = 'RelaxKsefInvoiceNumberUniqueByDirection1773400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop any existing UNIQUE that covers exactly (companyId, invoiceNumber)
    // — TypeORM names them with a hash so we look up by definition.
    const oldConstraints: Array<{ conname: string }> = await queryRunner.query(
      `SELECT con.conname
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
         JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'ksef_invoices'
          AND con.contype = 'u'
          AND (
            SELECT array_agg(att.attname ORDER BY att.attnum)
              FROM unnest(con.conkey) k
              JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k
          ) = ARRAY['companyId', 'invoiceNumber']::name[]`,
    );
    for (const { conname } of oldConstraints) {
      await queryRunner.query(
        `ALTER TABLE "ksef_invoices" DROP CONSTRAINT "${conname}"`,
      );
    }

    // Add the new compound unique. Use a stable, explicit name so
    // tooling (and the down migration) can find it deterministically.
    await queryRunner.query(`
      ALTER TABLE "ksef_invoices"
      ADD CONSTRAINT "UQ_ksef_invoices_company_invoice_direction"
      UNIQUE ("companyId", "invoiceNumber", "direction")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: drop the per-direction key, restore the per-(company,number)
    // key. Note: if any rows now exist that share the same
    // (companyId, invoiceNumber) across different directions, this down
    // migration WILL fail — that's the correct behavior (the data shape
    // intentionally diverges from the old constraint).
    await queryRunner.query(`
      ALTER TABLE "ksef_invoices"
      DROP CONSTRAINT IF EXISTS "UQ_ksef_invoices_company_invoice_direction"
    `);
    await queryRunner.query(`
      ALTER TABLE "ksef_invoices"
      ADD CONSTRAINT "UQ_ksef_invoices_company_invoice"
      UNIQUE ("companyId", "invoiceNumber")
    `);
  }
}
