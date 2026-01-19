import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPkdCodeToClient1768834398569 implements MigrationInterface {
    name = 'AddPkdCodeToClient1768834398569'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "time_entries" DROP CONSTRAINT "FK_f051d95ecf3cd671445ef0c9be8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23cbfc98b81c157d8c8f758925"`);
        await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN "projectId"`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "pkdCode" character varying(10)`);
        await queryRunner.query(`ALTER TYPE "public"."clients_amlgroupenum_enum" RENAME TO "clients_amlgroupenum_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."clients_amlgroupenum_enum" AS ENUM('LOW', 'STANDARD', 'ELEVATED', 'HIGH')`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "public"."clients_amlgroupenum_enum" USING "amlGroupEnum"::"text"::"public"."clients_amlgroupenum_enum"`);
        await queryRunner.query(`DROP TYPE "public"."clients_amlgroupenum_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."clients_amlgroupenum_enum_old" AS ENUM('LOW', 'MEDIUM', 'HIGH')`);
        await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "amlGroupEnum" TYPE "public"."clients_amlgroupenum_enum_old" USING "amlGroupEnum"::"text"::"public"."clients_amlgroupenum_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."clients_amlgroupenum_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."clients_amlgroupenum_enum_old" RENAME TO "clients_amlgroupenum_enum"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "pkdCode"`);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD "projectId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_23cbfc98b81c157d8c8f758925" ON "time_entries" ("companyId", "projectId") `);
        await queryRunner.query(`ALTER TABLE "time_entries" ADD CONSTRAINT "FK_f051d95ecf3cd671445ef0c9be8" FOREIGN KEY ("projectId") REFERENCES "time_projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
