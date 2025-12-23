import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDatabaseIndexes1766478546257 implements MigrationInterface {
    name = 'AddDatabaseIndexes1766478546257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_companies_owner"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_company"`);
        await queryRunner.query(`CREATE INDEX "IDX_b48860677afe62cd96e1265948" ON "clients" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f760a14ed395d73bbbe688764" ON "clients" ("zusStatus") `);
        await queryRunner.query(`CREATE INDEX "IDX_62c34340705568e5b02222d4f2" ON "clients" ("taxScheme") `);
        await queryRunner.query(`CREATE INDEX "IDX_72732477bbddafce14380fd91d" ON "clients" ("vatStatus") `);
        await queryRunner.query(`CREATE INDEX "IDX_dad21d0dbcd0c984f479599f39" ON "clients" ("employmentType") `);
        await queryRunner.query(`CREATE INDEX "IDX_11858a8861bfe7496d663ffd05" ON "clients" ("companyId", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_21aa72858a258ab9a71969c7bf" ON "clients" ("companyId", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_605e81319be9823d9666a1b43e" ON "companies" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_a58fba747b0d4bc3fdfa6ad250" ON "companies" ("isSystemCompany") `);
        await queryRunner.query(`CREATE INDEX "IDX_6dcdcbb7d72f64602307ec4ab3" ON "companies" ("ownerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_ce9dccc3162cbe075e0ab77108" ON "users" ("companyId", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_6f9395c9037632a31107c8a9e5" ON "users" ("companyId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6f9395c9037632a31107c8a9e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce9dccc3162cbe075e0ab77108"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6dcdcbb7d72f64602307ec4ab3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a58fba747b0d4bc3fdfa6ad250"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_605e81319be9823d9666a1b43e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_21aa72858a258ab9a71969c7bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11858a8861bfe7496d663ffd05"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dad21d0dbcd0c984f479599f39"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_72732477bbddafce14380fd91d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62c34340705568e5b02222d4f2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f760a14ed395d73bbbe688764"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b48860677afe62cd96e1265948"`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_companies_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
