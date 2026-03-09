import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSettlementsModule1769623340588 implements MigrationInterface {
  name = 'AddSettlementsModule1769623340588';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the settlement status enum
    await queryRunner.query(
      `CREATE TYPE "public"."monthly_settlements_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED')`
    );

    // Create monthly_settlements table
    await queryRunner.query(
      `CREATE TABLE "monthly_settlements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "userId" uuid, "assignedById" uuid, "month" smallint NOT NULL, "year" smallint NOT NULL, "status" "public"."monthly_settlements_status_enum" NOT NULL DEFAULT 'PENDING', "documentsDate" date, "invoiceCount" integer NOT NULL DEFAULT '0', "notes" text, "settledAt" TIMESTAMP, "settledById" uuid, "priority" smallint NOT NULL DEFAULT '0', "deadline" date, "documentsComplete" boolean NOT NULL DEFAULT false, "requiresAttention" boolean NOT NULL DEFAULT false, "attentionReason" character varying, "statusHistory" jsonb, "companyId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1036f0d2b83017118211a2b03b2" UNIQUE ("companyId", "clientId", "month", "year"), CONSTRAINT "PK_5b730b7a3fdac19b591f9a6640e" PRIMARY KEY ("id"))`
    );

    // Create indexes for monthly_settlements
    await queryRunner.query(
      `CREATE INDEX "IDX_5fe6e57036535777d4e7517ae4" ON "monthly_settlements" ("companyId", "userId", "month", "year") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8995772252c46a773e21d94803" ON "monthly_settlements" ("companyId", "month", "year") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e78714158d996a055a42290aa8" ON "monthly_settlements" ("companyId") `
    );

    // Create settlement_comments table
    await queryRunner.query(
      `CREATE TABLE "settlement_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "settlementId" uuid NOT NULL, "userId" uuid NOT NULL, "content" text NOT NULL, "isInternal" boolean NOT NULL DEFAULT true, "companyId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3d16f9b00e64befa14e69519cf3" PRIMARY KEY ("id"))`
    );

    // Create indexes for settlement_comments
    await queryRunner.query(
      `CREATE INDEX "IDX_12f60c3d18b3a8db6e3b02153a" ON "settlement_comments" ("companyId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29d2d08d9dc4e83d2e7e224467" ON "settlement_comments" ("settlementId") `
    );

    // Add foreign key constraints for monthly_settlements
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" ADD CONSTRAINT "FK_800284b3850ac27fe7f8c7f3115" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" ADD CONSTRAINT "FK_4493bc6c7f7a76f7dc5e6da8e8c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" ADD CONSTRAINT "FK_b79164396631c414317dfa26853" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" ADD CONSTRAINT "FK_6fba0e96292f5f76d054e60cc74" FOREIGN KEY ("settledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" ADD CONSTRAINT "FK_e78714158d996a055a42290aa87" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Add foreign key constraints for settlement_comments
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" ADD CONSTRAINT "FK_29d2d08d9dc4e83d2e7e2244677" FOREIGN KEY ("settlementId") REFERENCES "monthly_settlements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" ADD CONSTRAINT "FK_682c43016a2811a5a8e7b94b8f3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" ADD CONSTRAINT "FK_12f60c3d18b3a8db6e3b02153a2" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints for settlement_comments
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" DROP CONSTRAINT "FK_12f60c3d18b3a8db6e3b02153a2"`
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" DROP CONSTRAINT "FK_682c43016a2811a5a8e7b94b8f3"`
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_comments" DROP CONSTRAINT "FK_29d2d08d9dc4e83d2e7e2244677"`
    );

    // Drop foreign key constraints for monthly_settlements
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" DROP CONSTRAINT "FK_e78714158d996a055a42290aa87"`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" DROP CONSTRAINT "FK_6fba0e96292f5f76d054e60cc74"`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" DROP CONSTRAINT "FK_b79164396631c414317dfa26853"`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" DROP CONSTRAINT "FK_4493bc6c7f7a76f7dc5e6da8e8c"`
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_settlements" DROP CONSTRAINT "FK_800284b3850ac27fe7f8c7f3115"`
    );

    // Drop indexes and table for settlement_comments
    await queryRunner.query(`DROP INDEX "public"."IDX_29d2d08d9dc4e83d2e7e224467"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_12f60c3d18b3a8db6e3b02153a"`);
    await queryRunner.query(`DROP TABLE "settlement_comments"`);

    // Drop indexes and table for monthly_settlements
    await queryRunner.query(`DROP INDEX "public"."IDX_e78714158d996a055a42290aa8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8995772252c46a773e21d94803"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5fe6e57036535777d4e7517ae4"`);
    await queryRunner.query(`DROP TABLE "monthly_settlements"`);

    // Drop the enum
    await queryRunner.query(`DROP TYPE "public"."monthly_settlements_status_enum"`);
  }
}
