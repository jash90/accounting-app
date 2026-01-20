import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTimeProjectsTable1768900000001 implements MigrationInterface {
  name = 'DropTimeProjectsTable1768900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      // Step 1: Check if table exists and has data - create backup if needed
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'time_projects'
        ) as exists
      `);

      if (tableExists[0]?.exists) {
        const rowCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "time_projects"`);
        const count = parseInt(rowCount[0]?.count || '0');

        if (count > 0) {
          console.warn(`[DropTimeProjectsTable] WARNING: Backing up ${count} rows before dropping table...`);

          // Create backup table preserving all data
          await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "time_projects_backup" AS
            SELECT *, NOW() as backed_up_at FROM "time_projects"
          `);

          console.log(`[DropTimeProjectsTable] ✅ Backup created in time_projects_backup table`);
          console.log(`[DropTimeProjectsTable] To restore: SELECT * FROM time_projects_backup`);
        } else {
          console.log(`[DropTimeProjectsTable] Table is empty, no backup needed`);
        }
      } else {
        console.log(`[DropTimeProjectsTable] Table does not exist, skipping backup`);
      }

      // Step 2: Drop the orphaned time_projects table and its enum
      // This table was created but never used in the codebase
      await queryRunner.query(`DROP TABLE IF EXISTS "time_projects" CASCADE`);
      await queryRunner.query(`DROP TYPE IF EXISTS "time_projects_status_enum"`);

      await queryRunner.commitTransaction();
      console.log(`[DropTimeProjectsTable] Migration complete.`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[DropTimeProjectsTable] Starting migration DOWN...');

    await queryRunner.startTransaction();
    try {
      // Step 1: Recreate the enum type (idempotent - handles case where type already exists)
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."time_projects_status_enum" AS ENUM('active', 'on_hold', 'completed', 'archived');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      // Step 2: Recreate the time_projects table with original schema
      await queryRunner.query(`
        CREATE TABLE "time_projects" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying(255) NOT NULL,
          "description" text,
          "code" character varying(50),
          "color" character varying(7),
          "status" "public"."time_projects_status_enum" NOT NULL DEFAULT 'active',
          "budgetMinutes" integer,
          "budgetAmount" numeric(12,2),
          "defaultHourlyRate" numeric(10,2),
          "currency" character varying(3) NOT NULL DEFAULT 'PLN',
          "isBillableByDefault" boolean NOT NULL DEFAULT true,
          "startDate" date,
          "endDate" date,
          "companyId" uuid NOT NULL,
          "clientId" uuid,
          "createdById" uuid NOT NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_013ad2f9e73a800926795b0a1a2" PRIMARY KEY ("id")
        )
      `);

      // Step 3: Recreate indexes
      await queryRunner.query(
        `CREATE INDEX "IDX_dbc052e97ee88e55d5a5c2f83d" ON "time_projects" ("companyId", "isActive")`
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_0b5280f5383a6d42b38c362189" ON "time_projects" ("companyId", "name")`
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_7d92334ac4cdf74dfb6730ebf3" ON "time_projects" ("companyId", "clientId")`
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_7e8ecd224849b3963104b67359" ON "time_projects" ("companyId", "status")`
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_68d2c5fcfba9c53a1a950ef53f" ON "time_projects" ("companyId")`
      );

      // Step 4: Recreate foreign key constraints
      await queryRunner.query(
        `ALTER TABLE "time_projects" ADD CONSTRAINT "FK_68d2c5fcfba9c53a1a950ef53fc" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE "time_projects" ADD CONSTRAINT "FK_197fdc9a4fa3ab18a603139960a" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE "time_projects" ADD CONSTRAINT "FK_97bdbb339879ea6703254a059b6" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
      );

      // Step 5: Restore data from backup if it exists
      const backupExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'time_projects_backup'
        ) as exists
      `);

      if (backupExists[0]?.exists) {
        console.log('[DropTimeProjectsTable] Restoring data from backup...');
        // Restore data from backup, excluding the backed_up_at column which was added during backup
        await queryRunner.query(`
          INSERT INTO "time_projects" (
            "id", "name", "description", "code", "color", "status", "budgetMinutes", "budgetAmount",
            "defaultHourlyRate", "currency", "isBillableByDefault", "startDate", "endDate",
            "companyId", "clientId", "createdById", "isActive", "createdAt", "updatedAt"
          )
          SELECT
            "id", "name", "description", "code", "color", "status", "budgetMinutes", "budgetAmount",
            "defaultHourlyRate", "currency", "isBillableByDefault", "startDate", "endDate",
            "companyId", "clientId", "createdById", "isActive", "createdAt", "updatedAt"
          FROM "time_projects_backup"
        `);

        // Clean up backup table after successful restore
        await queryRunner.query(`DROP TABLE IF EXISTS "time_projects_backup"`);
        console.log('[DropTimeProjectsTable] Data restored and backup table cleaned up');
      }

      await queryRunner.commitTransaction();
      console.log('[DropTimeProjectsTable] Migration DOWN completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
