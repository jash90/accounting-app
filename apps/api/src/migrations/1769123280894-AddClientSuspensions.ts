import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientSuspensions1769123280894 implements MigrationInterface {
  name = 'AddClientSuspensions1769123280894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create client_suspensions table
    await queryRunner.query(`
            CREATE TABLE "client_suspensions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "companyId" uuid NOT NULL,
                "clientId" uuid NOT NULL,
                "startDate" date NOT NULL,
                "endDate" date,
                "reason" text,
                "createdById" uuid NOT NULL,
                "startDate7DayReminderSent" boolean NOT NULL DEFAULT false,
                "startDate1DayReminderSent" boolean NOT NULL DEFAULT false,
                "endDate7DayReminderSent" boolean NOT NULL DEFAULT false,
                "endDate1DayReminderSent" boolean NOT NULL DEFAULT false,
                "resumptionNotificationSent" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_client_suspensions" PRIMARY KEY ("id")
            )
        `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_companyId" ON "client_suspensions" ("companyId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_clientId" ON "client_suspensions" ("clientId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_companyId_clientId" ON "client_suspensions" ("companyId", "clientId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_startDate" ON "client_suspensions" ("startDate")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_suspensions_endDate" ON "client_suspensions" ("endDate")`
    );

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "client_suspensions"
            ADD CONSTRAINT "FK_client_suspensions_companyId"
            FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "client_suspensions"
            ADD CONSTRAINT "FK_client_suspensions_clientId"
            FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "client_suspensions"
            ADD CONSTRAINT "FK_client_suspensions_createdById"
            FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_createdById"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_clientId"`
    );
    await queryRunner.query(
      `ALTER TABLE "client_suspensions" DROP CONSTRAINT "FK_client_suspensions_companyId"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_endDate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_startDate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_companyId_clientId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_clientId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_client_suspensions_companyId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "client_suspensions"`);
  }
}
