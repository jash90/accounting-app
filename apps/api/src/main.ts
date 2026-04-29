import './instrument';

import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common';
import { validateEnvironment } from './common/validators/env.validator';
import { AdminSeedService } from './seeders/admin-seed.service';
import { DemoDataSeederService } from './seeders/demo-data-seeder.service';
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
  // Validate critical environment variables before starting
  validateEnvironment();

  // One-time seed mode: Run full seeder and exit
  if (process.env.RUN_SEED === 'true') {
    logger.log('Running one-time database seed...');
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
      const seedersModule = app.select(SeedersModule);
      const seeder = seedersModule.get(SeederService);
      await seeder.seed();
      logger.log('Base seeding completed, running demo data seeder...');
      const demoSeeder = app.get(DemoDataSeederService);
      await demoSeeder.seed();
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
  app.use(cookieParser());
  // Auth uses httpOnly cookies + `withCredentials: true`. Browser-issued
  // cross-origin <form> POSTs CAN send those cookies, so missing-Origin requests
  // are a CSRF surface in production. Reject them in prod and keep dev permissive
  // for local tools (curl, Postman, server-to-server health checks).
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Missing Origin: allowed in dev (curl/Postman/health checks); rejected in prod.
      if (!origin) {
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('Origin header required'));
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
  // forbidNonWhitelisted is true globally for security.
  // Endpoints that need dynamic query params (e.g., customField_*) override locally
  // with @UsePipes(new ValidationPipe({ forbidNonWhitelisted: false }))
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global serializer interceptor to respect @Exclude() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger UI — only available in non-production environments
  if (process.env.NODE_ENV !== 'production') {
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
  }

  // Auto-seed admin user if not exists (for Railway deployment)
  if (process.env.NODE_ENV === 'production') {
    const adminSeedService = app.get(AdminSeedService);
    await adminSeedService.seedIfNotExists();
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/docs`);
}

bootstrap();
