import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddEmailConfiguration1765970314678 implements MigrationInterface {
  name = 'AddEmailConfiguration1765970314678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table if not exists (idempotent)
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "email_configurations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "companyId" uuid, "smtpHost" character varying NOT NULL, "smtpPort" integer NOT NULL, "smtpSecure" boolean NOT NULL DEFAULT true, "smtpUser" character varying NOT NULL, "smtpPassword" character varying NOT NULL, "imapHost" character varying NOT NULL, "imapPort" integer NOT NULL, "imapTls" boolean NOT NULL DEFAULT true, "imapUser" character varying NOT NULL, "imapPassword" character varying NOT NULL, "displayName" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_3e3092096d194f0ec72581ce09" UNIQUE ("userId"), CONSTRAINT "REL_c1ea24e681dbb94ba93d10f3b1" UNIQUE ("companyId"), CONSTRAINT "CHK_a587b16c0721cf71e5bdda8f19" CHECK (("userId" IS NOT NULL AND "companyId" IS NULL) OR ("userId" IS NULL AND "companyId" IS NOT NULL)), CONSTRAINT "PK_6061c4ae2e5113f027bf4cec9a4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "notificationFromEmail"`
    );
    // Add FK constraints (idempotent)
    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_3e3092096d194f0ec72581ce095') THEN
                    ALTER TABLE "email_configurations" ADD CONSTRAINT "FK_3e3092096d194f0ec72581ce095" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c1ea24e681dbb94ba93d10f3b1f') THEN
                    ALTER TABLE "email_configurations" ADD CONSTRAINT "FK_c1ea24e681dbb94ba93d10f3b1f" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_configurations" DROP CONSTRAINT "FK_c1ea24e681dbb94ba93d10f3b1f"`
    );
    await queryRunner.query(
      `ALTER TABLE "email_configurations" DROP CONSTRAINT "FK_3e3092096d194f0ec72581ce095"`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "notificationFromEmail" character varying`
    );
    await queryRunner.query(`DROP TABLE "email_configurations"`);
  }
}
