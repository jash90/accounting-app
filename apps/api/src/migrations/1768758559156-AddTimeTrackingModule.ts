import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration to add Time Tracking module tables:
 * 1. Creates time_projects table for project management
 * 2. Creates time_entries table for time tracking entries
 * 3. Creates time_settings table for company-specific settings
 */
export class AddTimeTrackingModule1768758559156 implements MigrationInterface {
    name = 'AddTimeTrackingModule1768758559156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."time_projects_status_enum" AS ENUM('active', 'on_hold', 'completed', 'archived')`);
        await queryRunner.query(`CREATE TABLE "time_projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "code" character varying(50), "color" character varying(7), "status" "public"."time_projects_status_enum" NOT NULL DEFAULT 'active', "budgetMinutes" integer, "budgetAmount" numeric(12,2), "defaultHourlyRate" numeric(10,2), "currency" character varying(3) NOT NULL DEFAULT 'PLN', "isBillableByDefault" boolean NOT NULL DEFAULT true, "startDate" date, "endDate" date, "companyId" uuid NOT NULL, "clientId" uuid, "createdById" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_013ad2f9e73a800926795b0a1a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dbc052e97ee88e55d5a5c2f83d" ON "time_projects" ("companyId", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_0b5280f5383a6d42b38c362189" ON "time_projects" ("companyId", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_7d92334ac4cdf74dfb6730ebf3" ON "time_projects" ("companyId", "clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7e8ecd224849b3963104b67359" ON "time_projects" ("companyId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_68d2c5fcfba9c53a1a950ef53f" ON "time_projects" ("companyId") `);
        await queryRunner.query(`CREATE TYPE "public"."time_entries_status_enum" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'billed')`);
        await queryRunner.query(`CREATE TABLE "time_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying(255), "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE, "durationMinutes" integer, "isRunning" boolean NOT NULL DEFAULT false, "isBillable" boolean NOT NULL DEFAULT true, "hourlyRate" numeric(10,2), "totalAmount" numeric(10,2), "currency" character varying(3) NOT NULL DEFAULT 'PLN', "status" "public"."time_entries_status_enum" NOT NULL DEFAULT 'draft', "rejectionNote" text, "tags" text array, "companyId" uuid NOT NULL, "userId" uuid NOT NULL, "clientId" uuid, "taskId" uuid, "projectId" uuid, "approvedById" uuid, "approvedAt" TIMESTAMP WITH TIME ZONE, "submittedAt" TIMESTAMP WITH TIME ZONE, "billedAt" TIMESTAMP WITH TIME ZONE, "createdById" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8bc5f10269ba2fe88708904aa0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d10ac55e156e8a153d37caf419" ON "time_entries" ("userId", "startTime", "endTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d628c83d75443b5768b815763" ON "time_entries" ("companyId", "userId", "startTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_59439f970a47fd4090d94392b6" ON "time_entries" ("companyId", "isBillable") `);
        await queryRunner.query(`CREATE INDEX "IDX_23cbfc98b81c157d8c8f758925" ON "time_entries" ("companyId", "projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_28fc83e9251a17296efad0dae8" ON "time_entries" ("companyId", "taskId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e5d4cad0560eb46a0e51265d2" ON "time_entries" ("companyId", "clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c290cc89b60bbebc978bc065a5" ON "time_entries" ("companyId", "startTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c586de925509f25e62b000c84" ON "time_entries" ("companyId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_85bc606fd9be9d1ad1815b7407" ON "time_entries" ("companyId", "userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_88deb7df78583769f481908f08" ON "time_entries" ("companyId") `);
        await queryRunner.query(`CREATE TYPE "public"."time_settings_roundingmethod_enum" AS ENUM('none', 'up', 'down', 'nearest')`);
        await queryRunner.query(`CREATE TABLE "time_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "roundingMethod" "public"."time_settings_roundingmethod_enum" NOT NULL DEFAULT 'none', "roundingIntervalMinutes" smallint NOT NULL DEFAULT '15', "defaultHourlyRate" numeric(10,2), "defaultCurrency" character varying(3) NOT NULL DEFAULT 'PLN', "requireApproval" boolean NOT NULL DEFAULT false, "allowOverlappingEntries" boolean NOT NULL DEFAULT true, "workingHoursPerDay" smallint NOT NULL DEFAULT '8', "workingHoursPerWeek" smallint NOT NULL DEFAULT '40', "weekStartDay" smallint NOT NULL DEFAULT '1', "allowTimerMode" boolean NOT NULL DEFAULT true, "allowManualEntry" boolean NOT NULL DEFAULT true, "autoStopTimerAfterMinutes" integer NOT NULL DEFAULT '0', "minimumEntryMinutes" smallint NOT NULL DEFAULT '0', "maximumEntryMinutes" integer NOT NULL DEFAULT '0', "enableDailyReminder" boolean NOT NULL DEFAULT false, "dailyReminderTime" TIME, "lockEntriesAfterDays" smallint NOT NULL DEFAULT '0', "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_020e3cb781b95818f8ebaaaceb1" UNIQUE ("companyId"), CONSTRAINT "PK_72fe9fbb4fc09da61912a75a5d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_020e3cb781b95818f8ebaaaceb" ON "time_settings" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "time_projects" ADD CONSTRAINT "FK_68d2c5fcfba9c53a1a950ef53fc" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_projects" ADD CONSTRAINT "FK_197fdc9a4fa3ab18a603139960a" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_projects" ADD CONSTRAINT "FK_97bdbb339879ea6703254a059b6" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_88deb7df78583769f481908f088" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_d1b452d7f0d45863303b7d30000" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_54122708049eec426cbca8afbe9" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_8cfb57662e88d7c65010311661d" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_f051d95ecf3cd671445ef0c9be8" FOREIGN KEY ("projectId") REFERENCES "time_projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_fd757c406c5fb64febea3995dce" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_settings" ADD CONSTRAINT "FK_020e3cb781b95818f8ebaaaceb1" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "time_settings" ADD CONSTRAINT "FK_51fbe575f737f3439a3271a3898" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "time_settings" DROP CONSTRAINT "FK_51fbe575f737f3439a3271a3898"`);
        await queryRunner.query(`ALTER TABLE "time_settings" DROP CONSTRAINT "FK_020e3cb781b95818f8ebaaaceb1"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_93b21f91d7e795e367643bc3b8d"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_fd757c406c5fb64febea3995dce"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_f051d95ecf3cd671445ef0c9be8"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_8cfb57662e88d7c65010311661d"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_54122708049eec426cbca8afbe9"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_d1b452d7f0d45863303b7d30000"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_88deb7df78583769f481908f088"`);
        await queryRunner.query(`ALTER TABLE "time_projects" DROP CONSTRAINT "FK_97bdbb339879ea6703254a059b6"`);
        await queryRunner.query(`ALTER TABLE "time_projects" DROP CONSTRAINT "FK_197fdc9a4fa3ab18a603139960a"`);
        await queryRunner.query(`ALTER TABLE "time_projects" DROP CONSTRAINT "FK_68d2c5fcfba9c53a1a950ef53fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_020e3cb781b95818f8ebaaaceb"`);
        await queryRunner.query(`DROP TABLE "time_settings"`);
        await queryRunner.query(`DROP TYPE "public"."time_settings_roundingmethod_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88deb7df78583769f481908f08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85bc606fd9be9d1ad1815b7407"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c586de925509f25e62b000c84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c290cc89b60bbebc978bc065a5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e5d4cad0560eb46a0e51265d2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28fc83e9251a17296efad0dae8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23cbfc98b81c157d8c8f758925"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59439f970a47fd4090d94392b6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d628c83d75443b5768b815763"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d10ac55e156e8a153d37caf419"`);
        await queryRunner.query(`DROP TABLE "time_entries"`);
        await queryRunner.query(`DROP TYPE "public"."time_entries_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_68d2c5fcfba9c53a1a950ef53f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e8ecd224849b3963104b67359"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d92334ac4cdf74dfb6730ebf3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0b5280f5383a6d42b38c362189"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbc052e97ee88e55d5a5c2f83d"`);
        await queryRunner.query(`DROP TABLE "time_projects"`);
        await queryRunner.query(`DROP TYPE "public"."time_projects_status_enum"`);
    }

}
