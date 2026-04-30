import './instrument';

import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';
import { type NextFunction, type Request, type Response } from 'express';
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

  // One-time seed mode: Run full seeder and exit.
  //
  // SAFETY: SeederService.seed() unconditionally TRUNCATEs 22 tables before
  // re-seeding base data. Running this in production wipes all real customer
  // data and replaces it with the test fixture. A previous incident
  // (commit b93c8c2 deploy on prod) destroyed Company B + all derived
  // entities because RUN_SEED=true was set on prod. The base SeederService
  // is not idempotent — it always truncates, by design (it's a dev fixture).
  //
  // Hard-block RUN_SEED in production. To seed prod (e.g. on first deploy),
  // unset NODE_ENV or use a separate one-shot script that only adds missing
  // entities (idempotent).
  if (process.env.RUN_SEED === 'true') {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
      logger.error(
        'RUN_SEED=true is BLOCKED in production. The base seeder unconditionally TRUNCATEs all tables — it would wipe customer data.'
      );
      logger.error(
        'If you really need to run the full seeder on production, set ALLOW_PROD_SEED=true alongside RUN_SEED=true. You probably do NOT want this.'
      );
      logger.error(
        'For idempotent partial seeding (e.g. add a missing test user), write a dedicated one-shot script.'
      );
      process.exit(1);
    }

    logger.log('Running one-time database seed...');
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
      const seedersModule = app.select(SeedersModule);
      const seeder = seedersModule.get(SeederService);
      await seeder.seed();
      logger.log('Base seeding completed, running demo data seeder...');
      // DemoDataSeedersModule is conditionally imported in AppModule —
      // gated by `NODE_ENV !== 'production' && ENABLE_DEMO_SEEDER === 'true'`.
      // If not loaded, app.get() throws UnknownElementException; treat that
      // as "demo seeder not available in this build" and skip rather than
      // crashing — the base seed has already completed at this point.
      try {
        const demoSeeder = app.get(DemoDataSeederService);
        await demoSeeder.seed();
        logger.log('Demo data seeding completed');
      } catch (demoErr) {
        if ((demoErr as Error).constructor.name === 'UnknownElementException') {
          logger.warn(
            'DemoDataSeederService not registered in this build — skipping demo seed (base seed completed)'
          );
        } else {
          throw demoErr;
        }
      }
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

  // CSRF defense layer: reject missing-Origin in production, but only for
  // state-changing methods. Safe methods (GET/HEAD/OPTIONS) cannot cause
  // server-side state changes, and legitimate non-browser callers commonly
  // omit Origin — Railway's health probe (`GET /api/health`), Sentry,
  // monitoring, server-to-server checks. Blocking those broke deploys.
  //
  // Modern browsers ALWAYS send Origin on cross-origin POST/PUT/PATCH/DELETE,
  // so a missing Origin on a state-changing request in production is suspicious
  // and gets a 403. Same-origin requests still pass because their Origin header
  // matches the server's host (and is included by every modern browser).
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      process.env.NODE_ENV === 'production' &&
      !req.headers.origin &&
      !SAFE_METHODS.has(req.method)
    ) {
      res.status(403).json({
        statusCode: 403,
        message: 'Origin header required for state-changing requests',
        error: 'Forbidden',
      });
      return;
    }
    next();
  });

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Missing Origin: allowed for safe-method requests (state-changing ones
      // were already filtered by the middleware above in production).
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
