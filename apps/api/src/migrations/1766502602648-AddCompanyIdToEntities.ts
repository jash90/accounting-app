import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyIdToEntities1766502602648 implements MigrationInterface {
    name = 'AddCompanyIdToEntities1766502602648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" DROP CONSTRAINT IF EXISTS "UQ_53ce6cb03c435c964ead03b7842"`);
        await queryRunner.query(`ALTER TABLE "notification_settings" DROP CONSTRAINT IF EXISTS "UQ_78a1734f847d34c65a06db0e200"`);

        // Add columns as nullable first to handle existing data
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ADD "companyId" uuid`);
        await queryRunner.query(`ALTER TABLE "change_logs" ADD "companyId" uuid`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ADD "companyId" uuid`);

        // Populate companyId from related entities for existing data
        // client_custom_field_values gets companyId from client
        await queryRunner.query(`
            UPDATE "client_custom_field_values" ccfv
            SET "companyId" = c."companyId"
            FROM "clients" c
            WHERE ccfv."clientId" = c."id" AND ccfv."companyId" IS NULL
        `);

        // change_logs and notification_settings may need manual population or default
        // For now, delete orphaned records without valid company reference
        await queryRunner.query(`DELETE FROM "change_logs" WHERE "companyId" IS NULL`);
        await queryRunner.query(`DELETE FROM "notification_settings" WHERE "companyId" IS NULL`);

        // Now make columns NOT NULL
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ALTER COLUMN "companyId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "change_logs" ALTER COLUMN "companyId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ALTER COLUMN "companyId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_aa1d122f0696c5824bc1535554" ON "client_custom_field_values" ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9bd0b0a952ec9c81efe796e9d0" ON "change_logs" ("companyId", "entityType", "entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b7ed63f45c31b498eca6995a77" ON "change_logs" ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5366d45a122c067dc009cbccb" ON "notification_settings" ("companyId", "moduleSlug") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f235818b8aa5cc5edc3a018bf" ON "notification_settings" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ADD CONSTRAINT "UQ_32573fef5c4c33b059fdf0676e4" UNIQUE ("companyId", "clientId", "fieldDefinitionId")`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ADD CONSTRAINT "UQ_0f0567f6ae210a1230f8c08f646" UNIQUE ("companyId", "userId", "moduleSlug")`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ADD CONSTRAINT "FK_aa1d122f0696c5824bc1535554f" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "change_logs" ADD CONSTRAINT "FK_b7ed63f45c31b498eca6995a775" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ADD CONSTRAINT "FK_5f235818b8aa5cc5edc3a018bf6" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_settings" DROP CONSTRAINT "FK_5f235818b8aa5cc5edc3a018bf6"`);
        await queryRunner.query(`ALTER TABLE "change_logs" DROP CONSTRAINT "FK_b7ed63f45c31b498eca6995a775"`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" DROP CONSTRAINT "FK_aa1d122f0696c5824bc1535554f"`);
        await queryRunner.query(`ALTER TABLE "notification_settings" DROP CONSTRAINT "UQ_0f0567f6ae210a1230f8c08f646"`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" DROP CONSTRAINT "UQ_32573fef5c4c33b059fdf0676e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f235818b8aa5cc5edc3a018bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5366d45a122c067dc009cbccb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b7ed63f45c31b498eca6995a77"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bd0b0a952ec9c81efe796e9d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa1d122f0696c5824bc1535554"`);
        await queryRunner.query(`ALTER TABLE "notification_settings" DROP COLUMN "companyId"`);
        await queryRunner.query(`ALTER TABLE "change_logs" DROP COLUMN "companyId"`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" DROP COLUMN "companyId"`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ADD CONSTRAINT "UQ_78a1734f847d34c65a06db0e200" UNIQUE ("userId", "moduleSlug")`);
        await queryRunner.query(`ALTER TABLE "client_custom_field_values" ADD CONSTRAINT "UQ_53ce6cb03c435c964ead03b7842" UNIQUE ("clientId", "fieldDefinitionId")`);
    }

}
