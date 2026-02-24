import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentTables1771700300000 implements MigrationInterface {
  name = 'CreateDocumentTables1771700300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "templateFilePath" varchar(500),
        "templateFileName" varchar(255),
        "placeholders" jsonb,
        "category" varchar(50) NOT NULL DEFAULT 'other',
        "isActive" boolean NOT NULL DEFAULT true,
        "companyId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_document_templates_company" ON "document_templates" ("companyId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_document_templates_company_category" ON "document_templates" ("companyId", "category")`
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" ADD CONSTRAINT "FK_document_templates_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" ADD CONSTRAINT "FK_document_templates_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "generated_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "filePath" varchar(500),
        "fileName" varchar(255),
        "templateId" uuid,
        "generatedById" uuid NOT NULL,
        "metadata" jsonb,
        "sourceModule" varchar(100),
        "sourceEntityId" uuid,
        "companyId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generated_documents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_generated_documents_company" ON "generated_documents" ("companyId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_generated_documents_company_template" ON "generated_documents" ("companyId", "templateId")`
    );
    await queryRunner.query(
      `ALTER TABLE "generated_documents" ADD CONSTRAINT "FK_generated_documents_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "generated_documents" ADD CONSTRAINT "FK_generated_documents_template" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE SET NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "generated_documents" ADD CONSTRAINT "FK_generated_documents_generatedBy" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "generated_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_templates"`);
  }
}
