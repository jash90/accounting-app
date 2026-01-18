import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailClientModule1768394000000 implements MigrationInterface {
  name = 'AddEmailClientModule1768394000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_drafts table
    await queryRunner.query(`
      CREATE TABLE "email_drafts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "replyToMessageId" varchar,
        "to" text NOT NULL,
        "cc" text,
        "bcc" text,
        "subject" varchar,
        "textContent" text NOT NULL,
        "htmlContent" text,
        "attachmentPaths" jsonb,
        "isAiGenerated" boolean NOT NULL DEFAULT false,
        "aiPrompt" text,
        "aiOptions" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_email_drafts_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_email_drafts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_email_drafts_companyId" ON "email_drafts"("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_drafts_userId" ON "email_drafts"("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_drafts_isAiGenerated" ON "email_drafts"("isAiGenerated")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_email_drafts_isAiGenerated"`);
    await queryRunner.query(`DROP INDEX "IDX_email_drafts_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_email_drafts_companyId"`);
    await queryRunner.query(`DROP TABLE "email_drafts"`);
  }
}
