import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { join } from 'path';

import { AuthModule, JwtAuthGuard } from '@accounting/auth';
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
  ClientReliefPeriod,
  ClientSuspension,
  Company,
  CompanyModuleAccess,
  CustomFieldReminder,
  EmailConfiguration,
  Module as ModuleEntity,
  Notification,
  NotificationSettings,
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
import { ChangeLogModule } from '@accounting/infrastructure/change-log';
import { EmailModule } from '@accounting/infrastructure/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { ClientsModule } from '@accounting/modules/clients';
import { EmailClientModule, EmailDraft } from '@accounting/modules/email-client';
import { NotificationsModule } from '@accounting/modules/notifications';
import { TasksModule } from '@accounting/modules/tasks';
import { TimeTrackingModule } from '@accounting/modules/time-tracking';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AdminModule } from '../admin/admin.module';
import { CompanyModule } from '../company/company.module';
import { EmailConfigModule } from '../email-config/email-config.module';
import { ModulesModule } from '../modules/modules.module';
import { SeedersModule } from '../seeders/seeders.module';

// Shared entities array to avoid duplication between DATABASE_URL and local config
const ENTITIES = [
  User,
  Company,
  ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
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
  ClientSuspension,
  ClientReliefPeriod,
  CustomFieldReminder,
  NotificationSettings,
  Notification,
  ClientDeleteRequest,
  EmailConfiguration,
  EmailDraft,
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskDependency,
  TaskComment,
  TimeEntry,
  TimeSettings,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot(
      process.env.DISABLE_THROTTLER === 'true'
        ? []
        : [
            {
              name: 'default',
              ttl: 60000,
              limit: 100,
            },
          ]
    ),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        const databaseUrl = process.env.DATABASE_URL;

        // Railway provides DATABASE_URL, use it if available
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: ENTITIES,
            synchronize: false, // Disabled - use migrations for schema changes
            logging: !isProduction,
            migrations: ['dist/migrations/*.js'],
            migrationsRun: false, // Migrations run via buildCommand in Railway
            ssl: isProduction ? { rejectUnauthorized: false } : false,
          };
        }

        // Fallback to individual environment variables (local development)
        return {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'accounting_db',
          entities: ENTITIES,
          synchronize: process.env.NODE_ENV !== 'production', // Auto-sync only in development
          logging: !isProduction,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: false, // Migrations run manually or via buildCommand
        };
      },
    }),
    AuthModule,
    AdminModule,
    CompanyModule,
    AIAgentModule,
    ClientsModule,
    EmailClientModule,
    TasksModule,
    TimeTrackingModule,
    NotificationsModule,
    ModulesModule,
    SeedersModule,
    EmailModule,
    StorageModule.forRoot(),
    ChangeLogModule,
    EmailConfigModule,
    TerminusModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: false,
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
