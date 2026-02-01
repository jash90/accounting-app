import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddEmployeeToZusContribution1769960000000 implements MigrationInterface {
  name = 'AddEmployeeToZusContribution1769960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add contributionType column with default 'OWNER' for existing records
    await queryRunner.query(`
      ALTER TABLE "zus_contributions"
      ADD COLUMN "contributionType" character varying(20) NOT NULL DEFAULT 'OWNER'
    `);

    // Add clientEmployeeId column (nullable)
    await queryRunner.query(`
      ALTER TABLE "zus_contributions"
      ADD COLUMN "clientEmployeeId" uuid
    `);

    // Add foreign key constraint to client_employees
    await queryRunner.query(`
      ALTER TABLE "zus_contributions"
      ADD CONSTRAINT "FK_zus_contributions_clientEmployeeId"
      FOREIGN KEY ("clientEmployeeId")
      REFERENCES "client_employees"("id")
      ON DELETE SET NULL
    `);

    // Add composite index for uniqueness check (client + employee + period)
    await queryRunner.query(`
      CREATE INDEX "IDX_zus_contributions_client_employee_period"
      ON "zus_contributions" ("clientId", "clientEmployeeId", "periodMonth", "periodYear")
    `);

    // Add index for contributionType filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_zus_contributions_contributionType"
      ON "zus_contributions" ("contributionType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zus_contributions_contributionType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zus_contributions_client_employee_period"`);

    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "zus_contributions"
      DROP CONSTRAINT IF EXISTS "FK_zus_contributions_clientEmployeeId"
    `);

    // Remove columns
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP COLUMN IF EXISTS "clientEmployeeId"`
    );
    await queryRunner.query(
      `ALTER TABLE "zus_contributions" DROP COLUMN IF EXISTS "contributionType"`
    );
  }
}
