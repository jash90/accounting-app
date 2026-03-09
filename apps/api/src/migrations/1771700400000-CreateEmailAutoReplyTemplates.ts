import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailAutoReplyTemplates1771700400000 implements MigrationInterface {
  name = 'CreateEmailAutoReplyTemplates1771700400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_auto_reply_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "triggerKeywords" text NOT NULL,
        "keywordMatchMode" varchar(10) NOT NULL DEFAULT 'any',
        "matchSubjectOnly" boolean NOT NULL DEFAULT false,
        "bodyTemplate" text NOT NULL,
        "tone" varchar(20) NOT NULL DEFAULT 'neutral',
        "customInstructions" text,
        "attachmentPaths" jsonb,
        "createdById" uuid,
        "matchCount" integer NOT NULL DEFAULT 0,
        "lastMatchedAt" timestamptz,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_auto_reply_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_email_auto_reply_templates_company" ON "email_auto_reply_templates" ("companyId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_email_auto_reply_templates_company_active" ON "email_auto_reply_templates" ("companyId", "isActive")`
    );
    await queryRunner.query(
      `ALTER TABLE "email_auto_reply_templates" ADD CONSTRAINT "FK_email_auto_reply_templates_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_auto_reply_templates"`);
  }
}
