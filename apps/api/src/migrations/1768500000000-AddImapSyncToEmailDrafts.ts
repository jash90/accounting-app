import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImapSyncToEmailDrafts1768500000000 implements MigrationInterface {
  name = 'AddImapSyncToEmailDrafts1768500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add IMAP synchronization columns to email_drafts table
    await queryRunner.query(`
      ALTER TABLE "email_drafts"
      ADD COLUMN IF NOT EXISTS "imapUid" bigint,
      ADD COLUMN IF NOT EXISTS "imapMailbox" varchar(255),
      ADD COLUMN IF NOT EXISTS "imapSyncedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "syncStatus" varchar(20) NOT NULL DEFAULT 'local'
    `);

    // Add index for IMAP UID lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_drafts_imapUid" ON "email_drafts"("imapUid")
    `);

    // Add index for sync status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_email_drafts_syncStatus" ON "email_drafts"("syncStatus")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_drafts_syncStatus"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_email_drafts_imapUid"`);
    await queryRunner.query(`
      ALTER TABLE "email_drafts"
      DROP COLUMN IF EXISTS "syncStatus",
      DROP COLUMN IF EXISTS "imapSyncedAt",
      DROP COLUMN IF EXISTS "imapMailbox",
      DROP COLUMN IF EXISTS "imapUid"
    `);
  }
}
