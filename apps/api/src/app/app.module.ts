import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SentryModule } from '@sentry/nestjs/setup';

import { AuthModule, JwtAuthGuard } from '@accounting/auth';
import { COMMON_ENTITIES } from '@accounting/common';
import { ChangeLogModule } from '@accounting/infrastructure/change-log';
import { EmailModule } from '@accounting/infrastructure/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { ClientsModule } from '@accounting/modules/clients';
import { DocumentsModule } from '@accounting/modules/documents';
import { EmailClientModule, EmailDraft } from '@accounting/modules/email-client';
import { NotificationsModule } from '@accounting/modules/notifications';
import { OffersModule } from '@accounting/modules/offers';
import { SettlementsModule } from '@accounting/modules/settlements';
import { TasksModule } from '@accounting/modules/tasks';
import { TimeTrackingModule } from '@accounting/modules/time-tracking';

import { AdminModule } from '../admin/admin.module';
import { TimeoutInterceptor } from '../common';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';
import { CompanyModule } from '../company/company.module';
import { EmailConfigModule } from '../email-config/email-config.module';
import { ModulesModule } from '../modules/modules.module';
import { DemoDataSeedersModule } from '../seeders/demo-data-seeders.module';
import { SeedersModule } from '../seeders/seeders.module';
import { UploadsModule } from '../uploads/uploads.module';

/**
 * All entities for TypeORM runtime configuration.
 * Uses COMMON_ENTITIES from entity-registry.ts (single source of truth)
 * plus module-specific entities that live outside @accounting/common.
 */
const ALL_ENTITIES = [
  ...COMMON_ENTITIES,
  // Module-specific entities not in @accounting/common
  EmailDraft,
];

const optionalModules =
  process.env.ENABLE_DEMO_SEEDER === 'true' && process.env.NODE_ENV !== 'production'
    ? [DemoDataSeedersModule]
    : [];

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot(
      process.env.DISABLE_THROTTLER === 'true' && process.env.NODE_ENV !== 'production'
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

        // Connection pool configuration (pg driver options)
        const poolConfig = {
          max: parseInt(process.env.DB_POOL_MAX || '20', 10),
          min: parseInt(process.env.DB_POOL_MIN || '5', 10),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        };

        // Railway provides DATABASE_URL, use it if available
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: ALL_ENTITIES,
            synchronize: false, // Disabled - use migrations for schema changes
            logging: !isProduction,
            migrations: ['dist/migrations/*.js'],
            migrationsRun: false, // Migrations run via buildCommand in Railway
            ssl: isProduction
              ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
              : false,
            extra: poolConfig,
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
          entities: ALL_ENTITIES,
          synchronize: false, // Disabled - always use migrations
          logging: !isProduction,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: false, // Migrations run manually or via buildCommand
          extra: poolConfig,
        };
      },
    }),
    AuthModule,
    AdminModule,
    CompanyModule,
    AIAgentModule,
    ClientsModule,
    DocumentsModule,
    EmailClientModule,
    TasksModule,
    TimeTrackingModule,
    OffersModule,
    SettlementsModule,
    NotificationsModule,
    ModulesModule,
    SeedersModule,
    ...optionalModules,
    EmailModule,
    StorageModule.forRoot(),
    ChangeLogModule,
    EmailConfigModule,
    UploadsModule,
    TerminusModule,
    // NOTE: ServeStaticModule for /uploads removed — replaced by UploadsController with JWT auth
  ],
  controllers: [AppController, HealthController],
  providers: [
    // NOTE: Global ValidationPipe is set in main.ts (not here) to avoid duplication.
    // main.ts pipe uses forbidNonWhitelisted: true globally.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
