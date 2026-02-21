import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import helmet from 'helmet';
import { DataSource } from 'typeorm';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common';
import { SeederService } from './seeders/seeder.service';
import { SeedersModule } from './seeders/seeders.module';

// Parse CORS origins at module scope for O(1) lookups
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

// Logger for bootstrap and seed operations
const logger = new Logger('Bootstrap');

async function bootstrap() {
  // One-time seed mode: Run full seeder and exit
  if (process.env.RUN_SEED === 'true') {
    logger.log('Running one-time database seed...');
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
      const seedersModule = app.select(SeedersModule);
      const seeder = seedersModule.get(SeederService);
      await seeder.seed();
      logger.log('Seeding completed successfully');
    } catch (error) {
      logger.error('Seeding failed:', error);
      await app.close();
      process.exit(1);
    }
    await app.close();
    process.exit(0);
  }

  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Allow all localhost origins (any port) - ONLY in development
      if (process.env.NODE_ENV !== 'production') {
        try {
          const url = new URL(origin);
          if (['localhost', '127.0.0.1'].includes(url.hostname)) {
            return callback(null, true);
          }
        } catch {
          // Invalid URL, fall through to other checks
        }
      }

      // Allow origins from CORS_ORIGINS env variable (for all environments)
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  // Note: forbidNonWhitelisted is set to false to allow dynamic query params
  // like customField_* filters in the clients module
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global serializer interceptor to respect @Exclude() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('RBAC System API')
    .setDescription('Multi-tenant RBAC system with modular architecture')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Admin', 'Admin management endpoints')
    .addTag('Company', 'Company owner endpoints')
    .addTag('Modules', 'Module management and access control endpoints')
    .addTag('ai-agent', 'AI Agent module endpoints - Chat, RAG, Token Management')
    .addTag('Clients', 'Client management endpoints')
    .addTag('Client Field Definitions', 'Custom field definitions for clients')
    .addTag('Client Icons', 'Client icon management endpoints')
    .addTag('Client Notification Settings', 'Client notification settings endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Auto-seed admin user if not exists (for Railway deployment)
  if (process.env.NODE_ENV === 'production') {
    await seedAdminIfNotExists(app);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/docs`);
}

async function seedAdminIfNotExists(app: INestApplication) {
  try {
    const dataSource = app.get(DataSource);

    // Check if admin exists
    const adminExists = await dataSource.query(
      `SELECT COUNT(*) as count FROM users WHERE email = 'admin@system.com'`
    );

    if (parseInt(adminExists[0].count) === 0) {
      logger.log('Creating admin user...');

      // Get password from environment variable or generate a secure random one
      let adminPassword = process.env.ADMIN_SEED_PASSWORD;
      let passwordGenerated = false;

      if (!adminPassword) {
        // In production, require ADMIN_SEED_PASSWORD to be set for security
        if (process.env.NODE_ENV === 'production') {
          logger.error('ADMIN_SEED_PASSWORD environment variable is required in production');
          logger.error('Set ADMIN_SEED_PASSWORD to a secure password before deploying');
          process.exit(1);
        }
        // Generate cryptographically secure random password (24 chars) for non-production
        adminPassword = crypto.randomBytes(18).toString('base64url');
        passwordGenerated = true;
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await dataSource.query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", role, "companyId", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'admin@system.com', $1, 'Admin', 'User', 'ADMIN', NULL, true, NOW(), NOW())`,
        [hashedPassword]
      );

      logger.log('Admin user created: admin@system.com');
      if (passwordGenerated) {
        logger.warn('A random password was generated.');
        logger.log('Set ADMIN_SEED_PASSWORD env var to use a specific password.');
        logger.log('Re-deploy with ADMIN_SEED_PASSWORD set to access admin account.');
        // Security: Password intentionally not logged to prevent exposure in log aggregation
      } else {
        logger.log('Password set from ADMIN_SEED_PASSWORD environment variable.');
      }
    } else {
      logger.log('Admin user already exists, skipping seed.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Auto-seed failed (non-critical): ${errorMessage}`);
    // Don't throw - allow app to start even if seed fails
  }
}

bootstrap();
