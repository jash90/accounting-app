import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699999999998 implements MigrationInterface {
  name = 'InitialSchema1699999999998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create user_role enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM('ADMIN', 'COMPANY_OWNER', 'EMPLOYEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Create users table (without FK to companies initially)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "companyId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // 2. Create companies table (without FK to users initially)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "ownerId" uuid NOT NULL,
        "isSystemCompany" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    // 3. Add FK constraints for circular dependency
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD CONSTRAINT "FK_companies_owner"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION
    `);

    // 4. Create modules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "modules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_modules_slug" UNIQUE ("slug")
      )
    `);

    // 5. Create company_module_access table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_module_access" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "moduleId" uuid NOT NULL,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_module_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_module_access" UNIQUE ("companyId", "moduleId"),
        CONSTRAINT "FK_company_module_access_company" FOREIGN KEY ("companyId")
          REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_module_access_module" FOREIGN KEY ("moduleId")
          REFERENCES "modules"("id") ON DELETE CASCADE
      )
    `);

    // 6. Create user_module_permissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_module_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "moduleId" uuid NOT NULL,
        "permissions" text NOT NULL,
        "grantedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_module_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_module_permissions" UNIQUE ("userId", "moduleId"),
        CONSTRAINT "FK_user_module_permissions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_module_permissions_module" FOREIGN KEY ("moduleId")
          REFERENCES "modules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_module_permissions_grantedBy" FOREIGN KEY ("grantedById")
          REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "user_module_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_module_access"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modules"`);

    // Drop FK constraints before dropping tables
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "FK_companies_owner"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_company"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "companies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
