import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  User,
  Company,
  Module as ModuleEntity,
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
import { AuthModule, JwtAuthGuard } from '@accounting/auth';
import { AdminModule } from '../admin/admin.module';
import { CompanyModule } from '../company/company.module';
import { ModulesModule } from '../modules/modules.module';
import { SimpleTextModule } from '@accounting/modules/simple-text';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { SeedersModule } from '../seeders/seeders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        const databaseUrl = process.env.DATABASE_URL;

        // Railway provides DATABASE_URL, use it if available
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [
              User,
              Company,
              ModuleEntity,
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
            synchronize: !isProduction,
            logging: !isProduction,
            migrations: ['dist/migrations/*.js'],
            migrationsRun: false,
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
          entities: [
            User,
            Company,
            ModuleEntity,
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
          synchronize: !isProduction,
          logging: !isProduction,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: false,
        };
      },
    }),
    AuthModule,
    AdminModule,
    CompanyModule,
    SimpleTextModule,
    AIAgentModule,
    ModulesModule,
    SeedersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
