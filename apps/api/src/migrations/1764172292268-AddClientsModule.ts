import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddClientsModule1764172292268 implements MigrationInterface {
  name = 'AddClientsModule1764172292268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."client_field_definitions_fieldtype_enum" AS ENUM('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'ENUM')`
    );
    await queryRunner.query(
      `CREATE TABLE "client_field_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "label" character varying NOT NULL, "fieldType" "public"."client_field_definitions_fieldtype_enum" NOT NULL, "options" jsonb, "isRequired" boolean NOT NULL DEFAULT false, "validationRules" jsonb, "displayOrder" integer NOT NULL DEFAULT '0', "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c81b3a2e43bd35692cc85370f78" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8cbe2550d1476ff35c933986e" ON "client_field_definitions" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TABLE "client_custom_field_values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "fieldDefinitionId" uuid NOT NULL, "value" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_53ce6cb03c435c964ead03b7842" UNIQUE ("clientId", "fieldDefinitionId"), CONSTRAINT "PK_29bb750d3c7d78da0356709c451" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6239ad5fa512146bea9a4d52c6" ON "client_custom_field_values" ("fieldDefinitionId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e79c37e822b6d065373066ee93" ON "client_custom_field_values" ("clientId") `
    );
    await queryRunner.query(
      `CREATE TABLE "client_icons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "fileName" character varying NOT NULL, "filePath" character varying NOT NULL, "mimeType" character varying NOT NULL, "fileSize" integer NOT NULL, "color" character varying, "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a2359fc888bf02de49ac046340" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20165b2d4bc51a177cd751c80c" ON "client_icons" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TABLE "client_icon_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "iconId" uuid NOT NULL, "displayOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9fded9fe99821a2bd9adc679613" UNIQUE ("clientId", "iconId"), CONSTRAINT "PK_ce6862169200b080e8a8319c27f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bb2dc23b66d699e77d066c2f7" ON "client_icon_assignments" ("iconId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79e6d6c02dea47d9d2e5a783f2" ON "client_icon_assignments" ("clientId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_employmenttype_enum" AS ENUM('DG', 'DG_ETAT', 'DG_AKCJONARIUSZ', 'DG_HALF_TIME_BELOW_MIN', 'DG_HALF_TIME_ABOVE_MIN')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_vatstatus_enum" AS ENUM('VAT_MONTHLY', 'VAT_QUARTERLY', 'NO', 'NO_WATCH_LIMIT')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_taxscheme_enum" AS ENUM('PIT_17', 'PIT_19', 'LUMP_SUM', 'GENERAL')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_zusstatus_enum" AS ENUM('FULL', 'PREFERENTIAL', 'NONE')`
    );
    await queryRunner.query(
      `CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "nip" character varying, "email" character varying, "phone" character varying, "companyStartDate" date, "cooperationStartDate" date, "suspensionDate" date, "companySpecificity" text, "additionalInfo" text, "gtuCode" character varying, "amlGroup" character varying, "employmentType" "public"."clients_employmenttype_enum", "vatStatus" "public"."clients_vatstatus_enum", "taxScheme" "public"."clients_taxscheme_enum", "zusStatus" "public"."clients_zusstatus_enum", "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_99e921caf21faa2aab020476e4" ON "clients" ("name") `);
    await queryRunner.query(`CREATE INDEX "IDX_3179b31d0ad8eb8ac136f0e6b4" ON "clients" ("nip") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_5016a1ccedbea5f26d46376d6b" ON "clients" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."change_logs_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`
    );
    await queryRunner.query(
      `CREATE TABLE "change_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying NOT NULL, "entityId" character varying NOT NULL, "action" "public"."change_logs_action_enum" NOT NULL, "changes" jsonb NOT NULL, "changedById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62c55429d0fd1eca9cb304f4dea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_977373341a2e22ef02a9c87079" ON "change_logs" ("changedById") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f306f258088148a9b59c5f9e4" ON "change_logs" ("entityType", "entityId") `
    );
    await queryRunner.query(
      `CREATE TABLE "notification_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "moduleSlug" character varying NOT NULL, "receiveOnCreate" boolean NOT NULL DEFAULT true, "receiveOnUpdate" boolean NOT NULL DEFAULT true, "receiveOnDelete" boolean NOT NULL DEFAULT true, "isAdminCopy" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a1734f847d34c65a06db0e200" UNIQUE ("userId", "moduleSlug"), CONSTRAINT "PK_d131abd7996c475ef768d4559ba" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9791a0949e2e69442bc9defd9" ON "notification_settings" ("moduleSlug") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a8ffc3b89343043c9440d631e" ON "notification_settings" ("userId") `
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ADD CONSTRAINT "FK_c8cbe2550d1476ff35c933986e8" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" ADD CONSTRAINT "FK_90263618895a931bd3502b8d26d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_custom_field_values" ADD CONSTRAINT "FK_e79c37e822b6d065373066ee933" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_custom_field_values" ADD CONSTRAINT "FK_6239ad5fa512146bea9a4d52c63" FOREIGN KEY ("fieldDefinitionId") REFERENCES "client_field_definitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icons" ADD CONSTRAINT "FK_20165b2d4bc51a177cd751c80c4" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icons" ADD CONSTRAINT "FK_705feadffad605a873a297d2d0e" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icon_assignments" ADD CONSTRAINT "FK_79e6d6c02dea47d9d2e5a783f26" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icon_assignments" ADD CONSTRAINT "FK_9bb2dc23b66d699e77d066c2f7b" FOREIGN KEY ("iconId") REFERENCES "client_icons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_5016a1ccedbea5f26d46376d6b2" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_d9da07105d53c46866e802f2590" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "change_logs" ADD CONSTRAINT "FK_977373341a2e22ef02a9c870796" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" ADD CONSTRAINT "FK_5a8ffc3b89343043c9440d631e2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_settings" DROP CONSTRAINT "FK_5a8ffc3b89343043c9440d631e2"`
    );
    await queryRunner.query(
      `ALTER TABLE "change_logs" DROP CONSTRAINT "FK_977373341a2e22ef02a9c870796"`
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_d9da07105d53c46866e802f2590"`
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_5016a1ccedbea5f26d46376d6b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icon_assignments" DROP CONSTRAINT "FK_9bb2dc23b66d699e77d066c2f7b"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icon_assignments" DROP CONSTRAINT "FK_79e6d6c02dea47d9d2e5a783f26"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icons" DROP CONSTRAINT "FK_705feadffad605a873a297d2d0e"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_icons" DROP CONSTRAINT "FK_20165b2d4bc51a177cd751c80c4"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_custom_field_values" DROP CONSTRAINT "FK_6239ad5fa512146bea9a4d52c63"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_custom_field_values" DROP CONSTRAINT "FK_e79c37e822b6d065373066ee933"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" DROP CONSTRAINT "FK_90263618895a931bd3502b8d26d"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_field_definitions" DROP CONSTRAINT "FK_c8cbe2550d1476ff35c933986e8"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_5a8ffc3b89343043c9440d631e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a9791a0949e2e69442bc9defd9"`);
    await queryRunner.query(`DROP TABLE "notification_settings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0f306f258088148a9b59c5f9e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_977373341a2e22ef02a9c87079"`);
    await queryRunner.query(`DROP TABLE "change_logs"`);
    await queryRunner.query(`DROP TYPE "public"."change_logs_action_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5016a1ccedbea5f26d46376d6b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3179b31d0ad8eb8ac136f0e6b4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_99e921caf21faa2aab020476e4"`);
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TYPE "public"."clients_zusstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clients_taxscheme_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clients_vatstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clients_employmenttype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_79e6d6c02dea47d9d2e5a783f2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9bb2dc23b66d699e77d066c2f7"`);
    await queryRunner.query(`DROP TABLE "client_icon_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_20165b2d4bc51a177cd751c80c"`);
    await queryRunner.query(`DROP TABLE "client_icons"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e79c37e822b6d065373066ee93"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6239ad5fa512146bea9a4d52c6"`);
    await queryRunner.query(`DROP TABLE "client_custom_field_values"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c8cbe2550d1476ff35c933986e"`);
    await queryRunner.query(`DROP TABLE "client_field_definitions"`);
    await queryRunner.query(`DROP TYPE "public"."client_field_definitions_fieldtype_enum"`);
  }
}
