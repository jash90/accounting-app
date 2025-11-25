import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIAgentModule1700000000002 implements MigrationInterface {
  name = 'AddAIAgentModule1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 2. Create enums
    await queryRunner.query(`
      CREATE TYPE "public"."ai_provider_enum" AS ENUM('openai', 'openrouter')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."ai_message_role_enum" AS ENUM('user', 'assistant', 'system')
    `);

    // 3. Create ai_configurations table
    await queryRunner.query(`
      CREATE TABLE "ai_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid,
        "provider" "public"."ai_provider_enum" NOT NULL DEFAULT 'openai',
        "model" character varying NOT NULL DEFAULT 'gpt-4',
        "systemPrompt" text,
        "apiKey" text NOT NULL,
        "temperature" real NOT NULL DEFAULT 0.7,
        "maxTokens" integer NOT NULL DEFAULT 4000,
        "createdById" uuid NOT NULL,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_configurations" PRIMARY KEY ("id")
      )
    `);

    // 4. Create ai_conversations table
    await queryRunner.query(`
      CREATE TABLE "ai_conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL DEFAULT 'New Conversation',
        "companyId" uuid,
        "createdById" uuid NOT NULL,
        "totalTokens" integer NOT NULL DEFAULT 0,
        "messageCount" integer NOT NULL DEFAULT 0,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_conversations" PRIMARY KEY ("id")
      )
    `);

    // 5. Create ai_messages table
    await queryRunner.query(`
      CREATE TABLE "ai_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "role" "public"."ai_message_role_enum" NOT NULL,
        "content" text NOT NULL,
        "inputTokens" integer NOT NULL DEFAULT 0,
        "outputTokens" integer NOT NULL DEFAULT 0,
        "totalTokens" integer NOT NULL DEFAULT 0,
        "userId" uuid,
        "contextUsed" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_messages" PRIMARY KEY ("id")
      )
    `);

    // 6. Create ai_contexts table with vector column
    await queryRunner.query(`
      CREATE TABLE "ai_contexts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid,
        "filename" character varying NOT NULL,
        "mimeType" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "fileSize" integer NOT NULL,
        "extractedText" text NOT NULL,
        "embedding" vector(1536),
        "isActive" boolean NOT NULL DEFAULT true,
        "uploadedById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_contexts" PRIMARY KEY ("id")
      )
    `);

    // 7. Create token_usages table
    await queryRunner.query(`
      CREATE TABLE "token_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid,
        "userId" uuid NOT NULL,
        "date" date NOT NULL,
        "totalInputTokens" integer NOT NULL DEFAULT 0,
        "totalOutputTokens" integer NOT NULL DEFAULT 0,
        "totalTokens" integer NOT NULL DEFAULT 0,
        "conversationCount" integer NOT NULL DEFAULT 0,
        "messageCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_usages" PRIMARY KEY ("id")
      )
    `);

    // 8. Create token_limits table
    await queryRunner.query(`
      CREATE TABLE "token_limits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid,
        "userId" uuid,
        "monthlyLimit" integer NOT NULL,
        "warningThresholdPercentage" integer NOT NULL DEFAULT 80,
        "notifyOnWarning" boolean NOT NULL DEFAULT true,
        "notifyOnExceeded" boolean NOT NULL DEFAULT true,
        "setById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_token_limits" PRIMARY KEY ("id")
      )
    `);

    // 9. Add foreign key constraints

    // ai_configurations constraints
    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD CONSTRAINT "FK_ai_configurations_company"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD CONSTRAINT "FK_ai_configurations_createdBy"
      FOREIGN KEY ("createdById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_configurations"
      ADD CONSTRAINT "FK_ai_configurations_updatedBy"
      FOREIGN KEY ("updatedById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
    `);

    // ai_conversations constraints
    await queryRunner.query(`
      ALTER TABLE "ai_conversations"
      ADD CONSTRAINT "FK_ai_conversations_company"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_conversations"
      ADD CONSTRAINT "FK_ai_conversations_createdBy"
      FOREIGN KEY ("createdById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
    `);

    // ai_messages constraints
    await queryRunner.query(`
      ALTER TABLE "ai_messages"
      ADD CONSTRAINT "FK_ai_messages_conversation"
      FOREIGN KEY ("conversationId")
      REFERENCES "ai_conversations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_messages"
      ADD CONSTRAINT "FK_ai_messages_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // ai_contexts constraints
    await queryRunner.query(`
      ALTER TABLE "ai_contexts"
      ADD CONSTRAINT "FK_ai_contexts_company"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "ai_contexts"
      ADD CONSTRAINT "FK_ai_contexts_uploadedBy"
      FOREIGN KEY ("uploadedById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
    `);

    // token_usages constraints
    await queryRunner.query(`
      ALTER TABLE "token_usages"
      ADD CONSTRAINT "FK_token_usages_company"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "token_usages"
      ADD CONSTRAINT "FK_token_usages_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // token_limits constraints
    await queryRunner.query(`
      ALTER TABLE "token_limits"
      ADD CONSTRAINT "FK_token_limits_company"
      FOREIGN KEY ("companyId")
      REFERENCES "companies"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "token_limits"
      ADD CONSTRAINT "FK_token_limits_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "token_limits"
      ADD CONSTRAINT "FK_token_limits_setBy"
      FOREIGN KEY ("setById")
      REFERENCES "users"("id")
      ON DELETE NO ACTION
    `);

    // 10. Create indexes for performance

    // ai_configurations indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_configurations_companyId"
      ON "ai_configurations" ("companyId")
    `);

    // ai_conversations indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_conversations_companyId"
      ON "ai_conversations" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_conversations_createdById"
      ON "ai_conversations" ("createdById")
    `);

    // ai_messages indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_messages_conversationId"
      ON "ai_messages" ("conversationId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_messages_userId"
      ON "ai_messages" ("userId")
    `);

    // ai_contexts indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_contexts_companyId"
      ON "ai_contexts" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_contexts_isActive"
      ON "ai_contexts" ("isActive")
    `);

    // Vector index for semantic search
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_contexts_embedding"
      ON "ai_contexts"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);

    // token_usages indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_token_usages_companyId"
      ON "token_usages" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_token_usages_userId"
      ON "token_usages" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_token_usages_date"
      ON "token_usages" ("date")
    `);

    // Unique constraint for daily usage records
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_token_usages_unique"
      ON "token_usages" ("companyId", "userId", "date")
    `);

    // token_limits indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_token_limits_companyId"
      ON "token_limits" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_token_limits_userId"
      ON "token_limits" ("userId")
    `);

    // Unique constraint for limits
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_token_limits_unique"
      ON "token_limits" ("companyId", "userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_token_limits_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_limits_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_limits_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_usages_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_usages_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_usages_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_token_usages_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_contexts_embedding"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_contexts_isActive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_contexts_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_messages_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_messages_conversationId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_conversations_createdById"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_conversations_companyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_configurations_companyId"`);

    // Drop constraints
    await queryRunner.query(`ALTER TABLE "token_limits" DROP CONSTRAINT "FK_token_limits_setBy"`);
    await queryRunner.query(`ALTER TABLE "token_limits" DROP CONSTRAINT "FK_token_limits_user"`);
    await queryRunner.query(`ALTER TABLE "token_limits" DROP CONSTRAINT "FK_token_limits_company"`);
    await queryRunner.query(`ALTER TABLE "token_usages" DROP CONSTRAINT "FK_token_usages_user"`);
    await queryRunner.query(`ALTER TABLE "token_usages" DROP CONSTRAINT "FK_token_usages_company"`);
    await queryRunner.query(`ALTER TABLE "ai_contexts" DROP CONSTRAINT "FK_ai_contexts_uploadedBy"`);
    await queryRunner.query(`ALTER TABLE "ai_contexts" DROP CONSTRAINT "FK_ai_contexts_company"`);
    await queryRunner.query(`ALTER TABLE "ai_messages" DROP CONSTRAINT "FK_ai_messages_user"`);
    await queryRunner.query(`ALTER TABLE "ai_messages" DROP CONSTRAINT "FK_ai_messages_conversation"`);
    await queryRunner.query(`ALTER TABLE "ai_conversations" DROP CONSTRAINT "FK_ai_conversations_createdBy"`);
    await queryRunner.query(`ALTER TABLE "ai_conversations" DROP CONSTRAINT "FK_ai_conversations_company"`);
    await queryRunner.query(`ALTER TABLE "ai_configurations" DROP CONSTRAINT "FK_ai_configurations_updatedBy"`);
    await queryRunner.query(`ALTER TABLE "ai_configurations" DROP CONSTRAINT "FK_ai_configurations_createdBy"`);
    await queryRunner.query(`ALTER TABLE "ai_configurations" DROP CONSTRAINT "FK_ai_configurations_company"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "token_limits"`);
    await queryRunner.query(`DROP TABLE "token_usages"`);
    await queryRunner.query(`DROP TABLE "ai_contexts"`);
    await queryRunner.query(`DROP TABLE "ai_messages"`);
    await queryRunner.query(`DROP TABLE "ai_conversations"`);
    await queryRunner.query(`DROP TABLE "ai_configurations"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."ai_message_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ai_provider_enum"`);

    // Note: We don't drop the vector extension as it may be used by other tables
    // await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
  }
}
