import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SeedersModule } from './seeders/seeders.module';
import { SeederService } from './seeders/seeder.service';
import { AllExceptionsFilter } from './common';

// Parse CORS origins at module scope for O(1) lookups
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

async function bootstrap() {
  // One-time seed mode: Run full seeder and exit
  if (process.env.RUN_SEED === 'true') {
    console.log('🌱 Running one-time database seed...');
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
      const seedersModule = app.select(SeedersModule);
      const seeder = seedersModule.get(SeederService);
      await seeder.seed();
      console.log('✅ Seeding completed successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Allow all localhost origins (any port)
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }

      // Allow origins from CORS_ORIGINS env variable (for production)
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
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

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
      'JWT-auth',
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
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
}

async function seedAdminIfNotExists(app: any) {
  try {
    const dataSource = app.get(DataSource);

    // Check if admin exists
    const adminExists = await dataSource.query(
      `SELECT COUNT(*) as count FROM users WHERE email = 'admin@system.com'`
    );

    if (parseInt(adminExists[0].count) === 0) {
      console.log('Creating admin user...');

      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await dataSource.query(
        `INSERT INTO users (id, email, password, "firstName", "lastName", role, "companyId", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'admin@system.com', $1, 'Admin', 'User', 'ADMIN', NULL, true, NOW(), NOW())`,
        [hashedPassword]
      );

      console.log('✅ Admin user created: admin@system.com / Admin123!');
    } else {
      console.log('Admin user already exists, skipping seed.');
    }
  } catch (error) {
    console.error('Auto-seed failed (non-critical):', error.message);
    // Don't throw - allow app to start even if seed fails
  }
}

bootstrap();
