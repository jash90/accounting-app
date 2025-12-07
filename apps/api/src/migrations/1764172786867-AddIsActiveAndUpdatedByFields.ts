import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveAndUpdatedByFields1764172786867 implements MigrationInterface {
    name = 'AddIsActiveAndUpdatedByFields1764172786867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_field_definitions" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "client_icons" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "updatedById" uuid`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_a04d443b4a49fad8843337faa1e" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_a04d443b4a49fad8843337faa1e"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "client_icons" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "client_field_definitions" DROP COLUMN "isActive"`);
    }

}
