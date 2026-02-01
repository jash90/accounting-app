import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddClientEmployees1769954790166 implements MigrationInterface {
  name = 'AddClientEmployees1769954790166';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."client_employees_contracttype_enum" AS ENUM('UMOWA_O_PRACE', 'UMOWA_ZLECENIE', 'UMOWA_O_DZIELO')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_employees_workplacetype_enum" AS ENUM('OFFICE', 'REMOTE', 'HYBRID')`
    );
    await queryRunner.query(
      `CREATE TABLE "client_employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "clientId" uuid NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "pesel" character varying(11), "email" character varying(255), "phone" character varying(50), "contractType" "public"."client_employees_contracttype_enum" NOT NULL, "position" character varying(255), "startDate" date NOT NULL, "endDate" date, "grossSalary" integer, "workingHoursPerWeek" numeric(4,1), "vacationDaysPerYear" integer, "workplaceType" "public"."client_employees_workplacetype_enum", "hourlyRate" integer, "isStudent" boolean, "hasOtherInsurance" boolean, "projectDescription" text, "deliveryDate" date, "agreedAmount" integer, "isActive" boolean NOT NULL DEFAULT true, "notes" text, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9445972042265c8f60ae4ff2ede" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4a8bbce24a5d38ebc26eacc104" ON "client_employees" ("clientId", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a353dd176ab688786ce47a3ab" ON "client_employees" ("companyId", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_707d7c8ce1998a0757a0524b79" ON "client_employees" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c479f732fb3d452c7f8bf4ab9" ON "client_employees" ("companyId") `
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ALTER COLUMN "accidentRate" SET DEFAULT '0.0167'`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" ADD CONSTRAINT "FK_6c479f732fb3d452c7f8bf4ab97" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" ADD CONSTRAINT "FK_ee8d31d0bff4ed47d8da1e09b25" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" ADD CONSTRAINT "FK_080adf14869eabec533e0ba1c75" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" ADD CONSTRAINT "FK_364627720072bfa4c7aedf6968e" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_employees" DROP CONSTRAINT "FK_364627720072bfa4c7aedf6968e"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" DROP CONSTRAINT "FK_080adf14869eabec533e0ba1c75"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" DROP CONSTRAINT "FK_ee8d31d0bff4ed47d8da1e09b25"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_employees" DROP CONSTRAINT "FK_6c479f732fb3d452c7f8bf4ab97"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_client_settings" ALTER COLUMN "accidentRate" SET DEFAULT 0.0167`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_6c479f732fb3d452c7f8bf4ab9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_707d7c8ce1998a0757a0524b79"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a353dd176ab688786ce47a3ab"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4a8bbce24a5d38ebc26eacc104"`);
    await queryRunner.query(`DROP TABLE "client_employees"`);
    await queryRunner.query(`DROP TYPE "public"."client_employees_workplacetype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."client_employees_contracttype_enum"`);
  }
}
