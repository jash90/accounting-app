import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSimpleTextsTable1699999999999 implements MigrationInterface {
  name = 'CreateSimpleTextsTable1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "simple_texts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "simple_texts"`);
  }
}
