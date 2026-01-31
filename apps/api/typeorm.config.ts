import { DataSource } from 'typeorm';

import {
  AIConfiguration,
  AIContext,
  AIConversation,
  AIMessage,
  ChangeLog,
  Client,
  ClientCustomFieldValue,
  ClientDeleteRequest,
  ClientFieldDefinition,
  ClientIcon,
  ClientIconAssignment,
  ClientSuspension,
  Company,
  CompanyModuleAccess,
  EmailConfiguration,
  Module,
  MonthlySettlement,
  Notification,
  NotificationSettings,
  SettlementComment,
  Task,
  TaskComment,
  TaskDependency,
  TaskLabel,
  TaskLabelAssignment,
  TimeEntry,
  TimeSettings,
  TokenLimit,
  TokenUsage,
  User,
  UserModulePermission,
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
    AIConfiguration,
    AIConversation,
    AIMessage,
    AIContext,
    TokenUsage,
    TokenLimit,
    EmailConfiguration,
    ChangeLog,
    Client,
    ClientFieldDefinition,
    ClientCustomFieldValue,
    ClientIcon,
    ClientIconAssignment,
    ClientSuspension,
    NotificationSettings,
    Notification,
    ClientDeleteRequest,
    Task,
    TaskLabel,
    TaskLabelAssignment,
    TaskDependency,
    TaskComment,
    TimeEntry,
    TimeSettings,
    MonthlySettlement,
    SettlementComment,
  ],
  migrations: ['apps/api/src/migrations/*{.ts,.js}'],
  synchronize: false,
});
