import { DataSource } from 'typeorm';

/**
 * Production TypeORM DataSource configuration
 *
 * Used exclusively for running migrations in Railway production environment.
 * This file gets compiled to JS during build and used by TypeORM CLI.
 *
 * NOTE: Entities are not needed here - this is migrations-only config.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is required for production migrations');
  process.exit(1);
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: {
    rejectUnauthorized: false, // Required for Railway PostgreSQL
  },
  // Point to compiled migration files (relative to dist/apps/api/)
  // tsc preserves directory structure, so migrations end up in src/migrations/
  migrations: ['./src/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['migration', 'error', 'warn'],
});

export default AppDataSource;
