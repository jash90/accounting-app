import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettlementSettings1771697664680 implements MigrationInterface {
  name = 'AddSettlementSettings1771697664680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_name_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_nip_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_nip"`);
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "UQ_offers_companyId_offerNumber"`
    );
    await queryRunner.query(
      `CREATE TABLE "settlement_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "defaultPriority" smallint NOT NULL DEFAULT '0', "defaultDeadlineDay" smallint, "autoAssignEnabled" boolean NOT NULL DEFAULT false, "autoAssignRules" jsonb, "notifyOnStatusChange" boolean NOT NULL DEFAULT true, "notifyOnDeadlineApproaching" boolean NOT NULL DEFAULT true, "deadlineWarningDays" smallint NOT NULL DEFAULT '3', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7cdf492e5a65fc1b5c975a3ad25" UNIQUE ("companyId"), CONSTRAINT "PK_0755ce2d6f928c048c91faa3f37" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7cdf492e5a65fc1b5c975a3ad2" ON "settlement_settings" ("companyId") `
    );
    await queryRunner.query(
      `ALTER TYPE "public"."client_field_definitions_fieldtype_enum" RENAME TO "client_field_definitions_fieldtype_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_field_definitions_fieldtype_enum" AS ENUM('TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'ENUM', 'MULTISELECT', 'EMAIL', 'PHONE', 'URL', 'DATE_RANGE_WITH_REMINDER')`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ALTER COLUMN "fieldType" TYPE "public"."client_field_definitions_fieldtype_enum" USING "fieldType"::"text"::"public"."client_field_definitions_fieldtype_enum"`
    );
    await queryRunner.query(`DROP TYPE "public"."client_field_definitions_fieldtype_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_68bb0d476bf177745b68796df9" ON "settlement_comments" ("settlementId", "companyId") `
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "UQ_7037aafee44cc14dfb1a86eb9fe" UNIQUE ("companyId", "offerNumber")`
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_settings" ADD CONSTRAINT "FK_7cdf492e5a65fc1b5c975a3ad25" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settlement_settings" DROP CONSTRAINT "FK_7cdf492e5a65fc1b5c975a3ad25"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "UQ_7037aafee44cc14dfb1a86eb9fe"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_68bb0d476bf177745b68796df9"`);
    await queryRunner.query(
      `CREATE TYPE "public"."client_field_definitions_fieldtype_enum_old" AS ENUM('TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'ENUM', 'MULTISELECT', 'EMAIL', 'PHONE', 'URL')`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ALTER COLUMN "fieldType" TYPE "public"."client_field_definitions_fieldtype_enum_old" USING "fieldType"::"text"::"public"."client_field_definitions_fieldtype_enum_old"`
    );
    await queryRunner.query(`DROP TYPE "public"."client_field_definitions_fieldtype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."client_field_definitions_fieldtype_enum_old" RENAME TO "client_field_definitions_fieldtype_enum"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_7cdf492e5a65fc1b5c975a3ad2"`);
    await queryRunner.query(`DROP TABLE "settlement_settings"`);
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "UQ_offers_companyId_offerNumber" UNIQUE ("offerNumber", "companyId")`
    );
    await queryRunner.query(`CREATE INDEX "IDX_clients_nip" ON "clients" ("nip") `);
    await queryRunner.query(`CREATE INDEX "IDX_clients_nip_trgm" ON "clients" ("nip") `);
    await queryRunner.query(`CREATE INDEX "IDX_clients_name_trgm" ON "clients" ("name") `);
  }
}
