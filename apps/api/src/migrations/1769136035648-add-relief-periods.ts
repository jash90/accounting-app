import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReliefPeriods1769136035648 implements MigrationInterface {
  name = 'AddReliefPeriods1769136035648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_createdById"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_clientId"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_companyId"`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_time_entries_lockedBy"`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d"`
    );
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_actor"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_recipient"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_clientId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_companyId_clientId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_startDate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_endDate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_clients_pkdCode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_time_entries_one_running_per_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_time_entries_timer_lookup"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_time_entries_locked"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_time_entry_overlap_detection"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_moduleSlug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_read_archived"`);
    await queryRunner.query(
      `CREATE TYPE "public"."client_relief_periods_relieftype_enum" AS ENUM('ULGA_NA_START', 'MALY_ZUS')`
    );
    await queryRunner.query(
      `CREATE TABLE "client_relief_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "clientId" uuid NOT NULL, "reliefType" "public"."client_relief_periods_relieftype_enum" NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "endDate7DayReminderSent" boolean NOT NULL DEFAULT false, "endDate1DayReminderSent" boolean NOT NULL DEFAULT false, "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d99122a8822b7eb9c6444949de6" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0864672ae4e3abc91d525b1da2" ON "client_relief_periods" ("reliefType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a61246f80ddf672331fa78839" ON "client_relief_periods" ("endDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9cade5824f497c86cb586b4ad0" ON "client_relief_periods" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89812285e0544f8808ffc6490c" ON "client_relief_periods" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f4e476d731573165287b30752" ON "client_relief_periods" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TABLE "custom_field_reminders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "clientId" uuid NOT NULL, "fieldDefinitionId" uuid NOT NULL, "fieldValueId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "endDate7DayReminderSent" boolean NOT NULL DEFAULT false, "endDate1DayReminderSent" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4763691d31dfff69ed6609c9bf" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e3723599d7701bb1731a613b1" ON "custom_field_reminders" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e6c0451cbeb7169d38ff12a71" ON "custom_field_reminders" ("endDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f22697b3a53506ca0032959ea" ON "custom_field_reminders" ("fieldDefinitionId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bbae3b19a4169c0e55d61fb62a" ON "custom_field_reminders" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8bd2b154d82caa86a7a6d97bf" ON "custom_field_reminders" ("companyId") `
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
      `CREATE INDEX "IDX_df0c27d87061cb414a69561236" ON "client_suspensions" ("endDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_001c49d1e3f71f7b42986ec7f0" ON "client_suspensions" ("startDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_573177fbbf9d6a2821ed1b6f66" ON "client_suspensions" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_badac4bd2f19d00140551251e4" ON "client_suspensions" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66994296a97c77d0bc60ddbb0a" ON "client_suspensions" ("companyId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1480300a1e0821a0e9692dcdbb" ON "clients" ("pkdCode") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61c6459850b0a685d227ef9e21" ON "time_entries" ("userId", "companyId", "isRunning", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_182c3a07bbd68f107ceb4f052b" ON "notifications" ("moduleSlug") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aef1c7aef3725068e5540f8f00" ON "notifications" ("type") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5c2c939801558c92b39c03cdc9" ON "notifications" ("companyId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22dbdf106e7981d0d8e1aed884" ON "notifications" ("recipientId", "createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e536d4c6b2f57bb703ba5b51f" ON "notifications" ("recipientId", "isRead", "isArchived") `
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_66994296a97c77d0bc60ddbb0a9" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_badac4bd2f19d00140551251e48" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_8c5cecb628e31265d3b07c91310" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" ADD CONSTRAINT "FK_5f4e476d731573165287b307521" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" ADD CONSTRAINT "FK_89812285e0544f8808ffc6490cb" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" ADD CONSTRAINT "FK_d9aaf2defc115f67d151522e8e7" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" ADD CONSTRAINT "FK_c8bd2b154d82caa86a7a6d97bf6" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" ADD CONSTRAINT "FK_bbae3b19a4169c0e55d61fb62ae" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" ADD CONSTRAINT "FK_7f22697b3a53506ca0032959ea1" FOREIGN KEY ("fieldDefinitionId") REFERENCES "client_field_definitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" ADD CONSTRAINT "FK_5d7557f28bc62750ebd40966fb1" FOREIGN KEY ("fieldValueId") REFERENCES "client_custom_field_values"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_977565442856441fee0c347a9a0" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_db873ba9a123711a4bff527ccd5" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_5c2c939801558c92b39c03cdc93" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_44412a2d6f162ff4dc1697d0db7" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_44412a2d6f162ff4dc1697d0db7"`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_5c2c939801558c92b39c03cdc93"`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_db873ba9a123711a4bff527ccd5"`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_977565442856441fee0c347a9a0"`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d"`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" DROP CONSTRAINT "FK_5d7557f28bc62750ebd40966fb1"`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" DROP CONSTRAINT "FK_7f22697b3a53506ca0032959ea1"`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" DROP CONSTRAINT "FK_bbae3b19a4169c0e55d61fb62ae"`
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_reminders" DROP CONSTRAINT "FK_c8bd2b154d82caa86a7a6d97bf6"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" DROP CONSTRAINT "FK_d9aaf2defc115f67d151522e8e7"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" DROP CONSTRAINT "FK_89812285e0544f8808ffc6490cb"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_relief_periods" DROP CONSTRAINT "FK_5f4e476d731573165287b307521"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_8c5cecb628e31265d3b07c91310"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_badac4bd2f19d00140551251e48"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_66994296a97c77d0bc60ddbb0a9"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_6e536d4c6b2f57bb703ba5b51f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_22dbdf106e7981d0d8e1aed884"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5c2c939801558c92b39c03cdc9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aef1c7aef3725068e5540f8f00"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_182c3a07bbd68f107ceb4f052b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_61c6459850b0a685d227ef9e21"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1480300a1e0821a0e9692dcdbb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66994296a97c77d0bc60ddbb0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_badac4bd2f19d00140551251e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_573177fbbf9d6a2821ed1b6f66"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_001c49d1e3f71f7b42986ec7f0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_df0c27d87061cb414a69561236"`);
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
    await queryRunner.query(`DROP INDEX "public"."IDX_c8bd2b154d82caa86a7a6d97bf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bbae3b19a4169c0e55d61fb62a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7f22697b3a53506ca0032959ea"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0e6c0451cbeb7169d38ff12a71"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0e3723599d7701bb1731a613b1"`);
    await queryRunner.query(`DROP TABLE "custom_field_reminders"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5f4e476d731573165287b30752"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_89812285e0544f8808ffc6490c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9cade5824f497c86cb586b4ad0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5a61246f80ddf672331fa78839"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0864672ae4e3abc91d525b1da2"`);
    await queryRunner.query(`DROP TABLE "client_relief_periods"`);
    await queryRunner.query(`DROP TYPE "public"."client_relief_periods_relieftype_enum"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_read_archived" ON "notifications" ("recipientId", "isRead", "isArchived") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_createdAt" ON "notifications" ("recipientId", "createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_companyId" ON "notifications" ("companyId") `
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_moduleSlug" ON "notifications" ("moduleSlug") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_time_entry_overlap_detection" ON "time_entries" ("startTime", "endTime", "companyId", "userId") WHERE ("isActive" = true)`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_time_entries_locked" ON "time_entries" ("companyId", "isLocked") WHERE ("isLocked" = true)`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_time_entries_timer_lookup" ON "time_entries" ("isRunning", "companyId", "userId", "isActive") WHERE ("isActive" = true)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_time_entries_one_running_per_user" ON "time_entries" ("companyId", "userId") WHERE (("isRunning" = true) AND ("isActive" = true))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_clients_pkdCode" ON "clients" ("pkdCode") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_endDate" ON "client_suspensions" ("endDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_startDate" ON "client_suspensions" ("startDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_companyId_clientId" ON "client_suspensions" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_clientId" ON "client_suspensions" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_companyId" ON "client_suspensions" ("companyId") `
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD CONSTRAINT "FK_time_entries_lockedBy" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_client_suspensions_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_client_suspensions_clientId" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" ADD CONSTRAINT "FK_client_suspensions_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
