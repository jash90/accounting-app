import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../../api/src/app/app.module';

/**
 * Reusable API E2E test helper.
 * Extracts the repeated bootstrapApp / login / authHeader pattern from specs.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. Check your .env or test setup.`
    );
  }
  return value;
}

export async function bootstrapApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  await app.init();
  return app;
}

export async function loginAs(
  app: INestApplication,
  role: 'admin' | 'owner' | 'employee' | 'ownerB' | 'employeeB'
): Promise<string> {
  const credentials: Record<string, { email: string; password: string }> = {
    admin: {
      email: requireEnv('SEED_ADMIN_EMAIL'),
      password: requireEnv('SEED_ADMIN_PASSWORD'),
    },
    owner: {
      email: requireEnv('SEED_OWNER_EMAIL'),
      password: requireEnv('SEED_OWNER_PASSWORD'),
    },
    employee: {
      email: requireEnv('SEED_EMPLOYEE_EMAIL'),
      password: requireEnv('SEED_EMPLOYEE_PASSWORD'),
    },
    ownerB: {
      email: requireEnv('SEED_COMPANY_B_OWNER_EMAIL'),
      password: requireEnv('SEED_COMPANY_B_OWNER_PASSWORD'),
    },
    employeeB: {
      email: requireEnv('SEED_COMPANY_B_EMPLOYEE_EMAIL'),
      password: requireEnv('SEED_COMPANY_B_EMPLOYEE_PASSWORD'),
    },
  };

  const cred = credentials[role];
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: cred.email, password: cred.password })
    .expect(200);

  return response.body.access_token;
}

export function authHeader(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/**
 * Attempt to DELETE a resource, silently ignoring errors.
 * Use in afterAll for test cleanup.
 */
export async function cleanupResource(
  app: INestApplication,
  path: string,
  token: string
): Promise<void> {
  try {
    await request(app.getHttpServer())
      .delete(path)
      .set(...authHeader(token));
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Assert that the response body is a paginated response with a data array.
 */
export function expectPaginatedResponse(body: any): void {
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
}
