import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminTestCompanyFields1765991021360 implements MigrationInterface {
    name = 'AddAdminTestCompanyFields1765991021360'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" ADD "isTestCompany" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "activeCompanyId" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_993cd4e93dc84f17341702d059e" FOREIGN KEY ("activeCompanyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_993cd4e93dc84f17341702d059e"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "activeCompanyId"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "isTestCompany"`);
    }

}
