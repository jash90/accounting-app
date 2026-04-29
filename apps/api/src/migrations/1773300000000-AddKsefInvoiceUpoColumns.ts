import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds per-invoice UPO storage columns to `ksef_invoices`.
 *
 * Why three columns instead of one:
 *  - `upoXml`                       — the actual signed UPO body, captured
 *                                     when the scheduler successfully fetches
 *                                     the SAS download URL.
 *  - `upoDownloadUrl`               — the pre-signed Azure SAS URL returned
 *                                     by KSeF. We persist it as a fallback
 *                                     for the UI ("Pobierz UPO z KSeF"
 *                                     button) when capture failed.
 *  - `upoDownloadUrlExpirationDate` — when the SAS URL stops working. The
 *                                     UI uses this to know whether to even
 *                                     offer the fallback button.
 *
 * All three are nullable because:
 *  - existing rows pre-date this column
 *  - invoices that were rejected (or are still in DRAFT) never get a UPO
 */
export class AddKsefInvoiceUpoColumns1773300000000 implements MigrationInterface {
  name = 'AddKsefInvoiceUpoColumns1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ksef_invoices"
      ADD COLUMN IF NOT EXISTS "upoXml" TEXT,
      ADD COLUMN IF NOT EXISTS "upoDownloadUrl" VARCHAR,
      ADD COLUMN IF NOT EXISTS "upoDownloadUrlExpirationDate" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ksef_invoices"
      DROP COLUMN IF EXISTS "upoDownloadUrlExpirationDate",
      DROP COLUMN IF EXISTS "upoDownloadUrl",
      DROP COLUMN IF EXISTS "upoXml"
    `);
  }
}
