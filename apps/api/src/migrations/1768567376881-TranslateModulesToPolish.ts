import { MigrationInterface, QueryRunner } from 'typeorm';

export class TranslateModulesToPolish1768567376881 implements MigrationInterface {
  name = 'TranslateModulesToPolish1768567376881';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update AI Agent module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'Agent AI',
          description = 'Asystent AI z czatem, RAG i zarządzaniem tokenami'
      WHERE slug = 'ai-agent'
    `);

    // Update Clients module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'Klienci',
          description = 'Zarządzanie klientami z polami własnymi, ikonami i śledzeniem zmian'
      WHERE slug = 'clients'
    `);

    // Update Email Client module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'Klient Email',
          description = 'Pełny klient poczty z odbiorem, wysyłką, wersjami roboczymi i asystentem AI'
      WHERE slug = 'email-client'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert AI Agent module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'AI Agent',
          description = 'AI-powered chat assistant with RAG and token management'
      WHERE slug = 'ai-agent'
    `);

    // Revert Clients module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'Clients',
          description = 'Client management with custom fields, icons, and change tracking'
      WHERE slug = 'clients'
    `);

    // Revert Email Client module
    await queryRunner.query(`
      UPDATE modules
      SET name = 'Email Client',
          description = 'Full email client with inbox, compose, drafts, and AI assistant'
      WHERE slug = 'email-client'
    `);
  }
}
