import { DataSource } from 'typeorm';

import { COMMON_ENTITIES } from '@accounting/common';
import { EmailDraft } from '@accounting/modules/email-client';

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Use DATABASE_URL if available (Railway), otherwise use individual env vars
const dataSourceOptions = databaseUrl
  ? {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl: isProduction
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
        : false,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'accounting_db',
    };

/**
 * TypeORM DataSource for CLI migration commands.
 * Uses COMMON_ENTITIES from entity registry + module-specific entities.
 * Keep in sync with app.module.ts (both use entity-registry.ts as single source of truth).
 */
export default new DataSource({
  ...dataSourceOptions,
  entities: [
    ...COMMON_ENTITIES,
    // Module-specific entities not in @accounting/common
    EmailDraft,
  ],
  migrations: ['apps/api/src/migrations/*{.ts,.js}'],
  synchronize: false,
});
