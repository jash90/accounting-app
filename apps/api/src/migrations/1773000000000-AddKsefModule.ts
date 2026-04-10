import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddKsefModule1773000000000 implements MigrationInterface {
  name = 'AddKsefModule1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // =====================================================
    // 1. Create enum types (idempotent)
    // =====================================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_environment_enum" AS ENUM('TEST', 'DEMO', 'PRODUCTION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_auth_method_enum" AS ENUM('TOKEN', 'XADES');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_invoice_status_enum" AS ENUM('DRAFT', 'PENDING_SUBMISSION', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_invoice_type_enum" AS ENUM('SALES', 'PURCHASE', 'CORRECTION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_invoice_direction_enum" AS ENUM('OUTGOING', 'INCOMING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_session_type_enum" AS ENUM('INTERACTIVE', 'BATCH');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ksef_session_status_enum" AS ENUM('OPENING', 'ACTIVE', 'CLOSING', 'CLOSED', 'ERROR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =====================================================
    // 2. Create ksef_configurations table
    // =====================================================

    await queryRunner.query(`
      CREATE TABLE "ksef_configurations" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" UUID NOT NULL,
        "environment" "ksef_environment_enum" NOT NULL DEFAULT 'TEST',
        "authMethod" "ksef_auth_method_enum" NOT NULL DEFAULT 'TOKEN',
        "encryptedToken" TEXT,
        "encryptedCertificate" TEXT,
        "encryptedCertificatePassword" TEXT,
        "nip" VARCHAR(10),
        "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT false,
        "lastConnectionTestAt" TIMESTAMP,
        "lastConnectionTestResult" VARCHAR,
        "createdById" UUID,
        "updatedById" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ksef_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ksef_configurations_companyId" UNIQUE ("companyId"),
        CONSTRAINT "FK_ksef_configurations_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ksef_configurations_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ksef_configurations_updatedById" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // =====================================================
    // 3. Create ksef_sessions table
    // =====================================================

    await queryRunner.query(`
      CREATE TABLE "ksef_sessions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" UUID NOT NULL,
        "sessionType" "ksef_session_type_enum" NOT NULL,
        "ksefSessionRef" VARCHAR,
        "status" "ksef_session_status_enum" NOT NULL DEFAULT 'OPENING',
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP,
        "closedAt" TIMESTAMP,
        "invoiceCount" INTEGER NOT NULL DEFAULT 0,
        "upoReference" VARCHAR,
        "upoContent" TEXT,
        "errorMessage" TEXT,
        "metadata" JSONB,
        "createdById" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ksef_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ksef_sessions_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ksef_sessions_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_sessions_companyId_status" ON "ksef_sessions" ("companyId", "status")
    `);

    // =====================================================
    // 4. Create ksef_invoices table
    // =====================================================

    await queryRunner.query(`
      CREATE TABLE "ksef_invoices" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" UUID NOT NULL,
        "clientId" UUID,
        "sessionId" UUID,
        "invoiceType" "ksef_invoice_type_enum" NOT NULL,
        "direction" "ksef_invoice_direction_enum" NOT NULL,
        "invoiceNumber" VARCHAR NOT NULL,
        "ksefNumber" VARCHAR,
        "ksefReferenceNumber" VARCHAR,
        "status" "ksef_invoice_status_enum" NOT NULL DEFAULT 'DRAFT',
        "issueDate" DATE NOT NULL,
        "dueDate" DATE,
        "sellerNip" VARCHAR(10) NOT NULL,
        "sellerName" VARCHAR NOT NULL,
        "buyerNip" VARCHAR,
        "buyerName" VARCHAR NOT NULL,
        "netAmount" DECIMAL(14,2) NOT NULL,
        "vatAmount" DECIMAL(14,2) NOT NULL,
        "grossAmount" DECIMAL(14,2) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'PLN',
        "lineItems" JSONB,
        "xmlContent" TEXT,
        "xmlHash" VARCHAR,
        "rawKsefResponse" JSONB,
        "validationErrors" JSONB,
        "submittedAt" TIMESTAMP,
        "acceptedAt" TIMESTAMP,
        "rejectedAt" TIMESTAMP,
        "correctedInvoiceId" UUID,
        "metadata" JSONB,
        "createdById" UUID,
        "updatedById" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ksef_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ksef_invoices_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ksef_invoices_clientId" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ksef_invoices_sessionId" FOREIGN KEY ("sessionId") REFERENCES "ksef_sessions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ksef_invoices_correctedInvoiceId" FOREIGN KEY ("correctedInvoiceId") REFERENCES "ksef_invoices"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ksef_invoices_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ksef_invoices_updatedById" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ksef_invoices_companyId_invoiceNumber" ON "ksef_invoices" ("companyId", "invoiceNumber")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ksef_invoices_ksefNumber" ON "ksef_invoices" ("ksefNumber") WHERE "ksefNumber" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_invoices_companyId_status" ON "ksef_invoices" ("companyId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_invoices_companyId_issueDate" ON "ksef_invoices" ("companyId", "issueDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_invoices_clientId" ON "ksef_invoices" ("clientId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_invoices_sessionId" ON "ksef_invoices" ("sessionId")
    `);

    // =====================================================
    // 5. Create ksef_audit_logs table
    // =====================================================

    await queryRunner.query(`
      CREATE TABLE "ksef_audit_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" UUID NOT NULL,
        "action" VARCHAR NOT NULL,
        "entityType" VARCHAR,
        "entityId" UUID,
        "httpMethod" VARCHAR,
        "httpUrl" VARCHAR,
        "httpStatusCode" INTEGER,
        "responseSnippet" TEXT,
        "errorMessage" TEXT,
        "durationMs" INTEGER,
        "userId" UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ksef_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ksef_audit_logs_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ksef_audit_logs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ksef_audit_logs_companyId_createdAt" ON "ksef_audit_logs" ("companyId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables (reverse order to respect foreign key dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "ksef_audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ksef_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ksef_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ksef_configurations"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_session_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_session_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_invoice_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_invoice_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_auth_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ksef_environment_enum"`);
  }
}
