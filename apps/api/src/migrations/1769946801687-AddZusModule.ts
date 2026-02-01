import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddZusModule1769946801687 implements MigrationInterface {
  name = 'AddZusModule1769946801687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."zus_contributions_status_enum" AS ENUM('DRAFT', 'CALCULATED', 'PAID', 'OVERDUE')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."zus_contributions_discounttype_enum" AS ENUM('NONE', 'STARTUP_RELIEF', 'SMALL_ZUS', 'SMALL_ZUS_PLUS')`
    );
    await queryRunner.query(
      `CREATE TABLE "zus_contributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "clientId" uuid NOT NULL, "periodMonth" integer NOT NULL, "periodYear" integer NOT NULL, "status" "public"."zus_contributions_status_enum" NOT NULL DEFAULT 'DRAFT', "dueDate" date NOT NULL, "paidDate" date, "retirementAmount" integer NOT NULL DEFAULT '0', "disabilityAmount" integer NOT NULL DEFAULT '0', "sicknessAmount" integer NOT NULL DEFAULT '0', "accidentAmount" integer NOT NULL DEFAULT '0', "laborFundAmount" integer NOT NULL DEFAULT '0', "healthAmount" integer NOT NULL DEFAULT '0', "totalSocialAmount" integer NOT NULL DEFAULT '0', "totalAmount" integer NOT NULL DEFAULT '0', "socialBasis" integer NOT NULL, "healthBasis" integer NOT NULL, "discountType" "public"."zus_contributions_discounttype_enum" NOT NULL, "sicknessOptedIn" boolean NOT NULL DEFAULT false, "notes" text, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d00b04f06d2d6a289474e3d0948" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eefcad48506b73af3d64238b32" ON "zus_contributions" ("dueDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eaeb1c7d7c51433c4c5528b8a2" ON "zus_contributions" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81bf83dbf7930eb7f7edd3d5a5" ON "zus_contributions" ("companyId", "periodMonth", "periodYear") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6bc7b006c8df58db724b114eff" ON "zus_contributions" ("periodMonth", "periodYear") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de882150875795e9a3225ba508" ON "zus_contributions" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e1dd12c045a0bf0b446c2eec15" ON "zus_contributions" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d598f3b703cb1f18ff4e138d4" ON "zus_contributions" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."zus_client_settings_discounttype_enum" AS ENUM('NONE', 'STARTUP_RELIEF', 'SMALL_ZUS', 'SMALL_ZUS_PLUS')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."zus_client_settings_healthcontributiontype_enum" AS ENUM('SCALE', 'LINEAR', 'LUMP_SUM', 'TAX_CARD')`
    );
    await queryRunner.query(
      `CREATE TABLE "zus_client_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "clientId" uuid NOT NULL, "discountType" "public"."zus_client_settings_discounttype_enum" NOT NULL DEFAULT 'NONE', "discountStartDate" date, "discountEndDate" date, "healthContributionType" "public"."zus_client_settings_healthcontributiontype_enum" NOT NULL DEFAULT 'SCALE', "sicknessInsuranceOptIn" boolean NOT NULL DEFAULT false, "paymentDay" integer NOT NULL DEFAULT '15', "accidentRate" numeric(5,4) NOT NULL DEFAULT '0.0167', "isActive" boolean NOT NULL DEFAULT true, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_518f08ec361b386f045a8a0268c" UNIQUE ("clientId"), CONSTRAINT "PK_8ab703e88ddf325e55f7afcac76" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f35da3d40269681de9df4ac3e0" ON "zus_client_settings" ("companyId", "isActive") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_518f08ec361b386f045a8a0268" ON "zus_client_settings" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4ee7af12731eeed3d2e2feffd7" ON "zus_client_settings" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."zus_rates_ratetype_enum" AS ENUM('FULL_BASIS', 'SMALL_ZUS_BASIS', 'MINIMUM_WAGE', 'AVERAGE_WAGE', 'HEALTH_MIN', 'LUMP_SUM_TIER_1', 'LUMP_SUM_TIER_2', 'LUMP_SUM_TIER_3')`
    );
    await queryRunner.query(
      `CREATE TABLE "zus_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rateType" "public"."zus_rates_ratetype_enum" NOT NULL, "value" integer NOT NULL, "validFrom" date NOT NULL, "validTo" date, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_145d96350a9245dd8a14d49d8c4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_716514bcef6fa4c71d9820ea03" ON "zus_rates" ("rateType", "validFrom") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfe71b24008fe03c065312af9c" ON "zus_rates" ("validFrom", "validTo") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c59c95983849e4a13f7f17a79" ON "zus_rates" ("rateType") `
    );
    await queryRunner.query(
      `ALTER TYPE "public"."client_field_definitions_fieldtype_enum" RENAME TO "client_field_definitions_fieldtype_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_field_definitions_fieldtype_enum" AS ENUM('TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'ENUM', 'MULTISELECT', 'EMAIL', 'PHONE', 'URL')`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ALTER COLUMN "fieldType" TYPE "public"."client_field_definitions_fieldtype_enum" USING "fieldType"::"text"::"public"."client_field_definitions_fieldtype_enum"`
    );
    await queryRunner.query(`DROP TYPE "public"."client_field_definitions_fieldtype_enum_old"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0f306f258088148a9b59c5f9e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9bd0b0a952ec9c81efe796e9d0"`);
    await queryRunner.query(
      `ALTER TABLE "change_logs" ALTER COLUMN "entityId" TYPE uuid USING "entityId"::uuid`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd0b0a952ec9c81efe796e9d0" ON "change_logs" ("companyId", "entityType", "entityId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f306f258088148a9b59c5f9e4" ON "change_logs" ("entityType", "entityId") `
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" ADD CONSTRAINT "FK_8d598f3b703cb1f18ff4e138d4b" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" ADD CONSTRAINT "FK_e1dd12c045a0bf0b446c2eec155" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" ADD CONSTRAINT "FK_9fe5a643b6729f7de66be8dcaa6" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" ADD CONSTRAINT "FK_3c93681590d3986094e0e54d9fd" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ADD CONSTRAINT "FK_4ee7af12731eeed3d2e2feffd70" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ADD CONSTRAINT "FK_518f08ec361b386f045a8a0268c" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ADD CONSTRAINT "FK_983150e65968a6b8f851802c7f2" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ADD CONSTRAINT "FK_b86a6317d71a1626d4a3f911f66" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" DROP CONSTRAINT "FK_b86a6317d71a1626d4a3f911f66"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" DROP CONSTRAINT "FK_983150e65968a6b8f851802c7f2"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" DROP CONSTRAINT "FK_518f08ec361b386f045a8a0268c"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" DROP CONSTRAINT "FK_4ee7af12731eeed3d2e2feffd70"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP CONSTRAINT "FK_3c93681590d3986094e0e54d9fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP CONSTRAINT "FK_9fe5a643b6729f7de66be8dcaa6"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP CONSTRAINT "FK_e1dd12c045a0bf0b446c2eec155"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP CONSTRAINT "FK_8d598f3b703cb1f18ff4e138d4b"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_0f306f258088148a9b59c5f9e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9bd0b0a952ec9c81efe796e9d0"`);
    await queryRunner.query(
      `ALTER TABLE "change_logs" ALTER COLUMN "entityId" TYPE character varying USING "entityId"::text`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd0b0a952ec9c81efe796e9d0" ON "change_logs" ("entityType", "entityId", "companyId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f306f258088148a9b59c5f9e4" ON "change_logs" ("entityType", "entityId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_field_definitions_fieldtype_enum_old" AS ENUM('BOOLEAN', 'DATE', 'DATETIME', 'DATE_RANGE_WITH_REMINDER', 'EMAIL', 'ENUM', 'MULTISELECT', 'NUMBER', 'PHONE', 'TEXT', 'URL')`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ALTER COLUMN "fieldType" TYPE "public"."client_field_definitions_fieldtype_enum_old" USING "fieldType"::"text"::"public"."client_field_definitions_fieldtype_enum_old"`
    );
    await queryRunner.query(`DROP TYPE "public"."client_field_definitions_fieldtype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."client_field_definitions_fieldtype_enum_old" RENAME TO "client_field_definitions_fieldtype_enum"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_6c59c95983849e4a13f7f17a79"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cfe71b24008fe03c065312af9c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_716514bcef6fa4c71d9820ea03"`);
    await queryRunner.query(`DROP TABLE "zus_rates"`);
    await queryRunner.query(`DROP TYPE "public"."zus_rates_ratetype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4ee7af12731eeed3d2e2feffd7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_518f08ec361b386f045a8a0268"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f35da3d40269681de9df4ac3e0"`);
    await queryRunner.query(`DROP TABLE "zus_client_settings"`);
    await queryRunner.query(`DROP TYPE "public"."zus_client_settings_healthcontributiontype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."zus_client_settings_discounttype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8d598f3b703cb1f18ff4e138d4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e1dd12c045a0bf0b446c2eec15"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_de882150875795e9a3225ba508"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6bc7b006c8df58db724b114eff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_81bf83dbf7930eb7f7edd3d5a5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eaeb1c7d7c51433c4c5528b8a2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eefcad48506b73af3d64238b32"`);
    await queryRunner.query(`DROP TABLE "zus_contributions"`);
    await queryRunner.query(`DROP TYPE "public"."zus_contributions_discounttype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."zus_contributions_status_enum"`);
  }
}
