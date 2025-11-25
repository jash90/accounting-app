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
} from '@accounting/common';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'accounting_db',
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
  ],
  migrations: ['apps/api/src/migrations/*{.ts,.js}'],
  synchronize: false,
});

