import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds performance optimization indexes for AI Agent module tables.
 * These indexes improve query performance for common access patterns:
 * - Conversation listing by company and date
 * - Message fetching by conversation
 * - RAG context search by company and status
 */
export class AddAIAgentOptimizationIndexes1700000000003 implements MigrationInterface {
  name = 'AddAIAgentOptimizationIndexes1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for listing conversations by company, ordered by updatedAt
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ai_conversations_company_updated"
      ON "ai_conversations" ("companyId", "updatedAt" DESC)
    `);

    // Index for fetching messages by conversation, ordered by createdAt
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ai_messages_conversation_created"
      ON "ai_messages" ("conversationId", "createdAt")
    `);

    // Index for RAG context search by company and active status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ai_contexts_company_active"
      ON "ai_contexts" ("companyId", "isActive", "createdAt")
    `);

    // Index for token usage queries by date range
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_token_usages_date_range"
      ON "token_usages" ("companyId", "userId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_usages_date_range"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_contexts_company_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_messages_conversation_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_conversations_company_updated"`);
  }
}
