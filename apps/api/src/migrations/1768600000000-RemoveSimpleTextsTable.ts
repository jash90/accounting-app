import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSimpleTextsTable1768600000000 implements MigrationInterface {
  name = 'RemoveSimpleTextsTable1768600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the simple_texts table as the module has been removed
    await queryRunner.query(`DROP TABLE IF EXISTS "simple_texts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create the table if reverting (not recommended - module is removed)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "simple_texts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid,
        "content" text NOT NULL,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_simple_texts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_simple_texts_company" FOREIGN KEY ("companyId")
          REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_simple_texts_user" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);
  }
}
