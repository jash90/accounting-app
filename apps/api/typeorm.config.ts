import { DataSource } from 'typeorm';
import {
  User,
  Company,
  Module,
  CompanyModuleAccess,
  UserModulePermission,
  SimpleText,
  AIConfiguration,
  AIConversation,
  AIMessage,
  AIContext,
  TokenUsage,
  TokenLimit,
  ChangeLog,
  Client,
  ClientFieldDefinition,
  ClientCustomFieldValue,
  ClientIcon,
  ClientIconAssignment,
  NotificationSettings,
} from '@accounting/common';

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Use DATABASE_URL if available (Railway), otherwise use individual env vars
const dataSourceOptions = databaseUrl
  ? {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'accounting_db',
    };

export default new DataSource({
  ...dataSourceOptions,
  entities: [
    User,
    Company,
    Module,
    CompanyModuleAccess,
    UserModulePermission,
    SimpleText,
    AIConfiguration,
    AIConversation,
    AIMessage,
    AIContext,
    TokenUsage,
    TokenLimit,
    ChangeLog,
    Client,
    ClientFieldDefinition,
    ClientCustomFieldValue,
    ClientIcon,
    ClientIconAssignment,
    NotificationSettings,
  ],
  migrations: ['apps/api/src/migrations/*{.ts,.js}'],
  synchronize: false,
});

