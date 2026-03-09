import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../../api/src/app/app.module';

/**
 * Reusable API E2E test helper.
 * Extracts the repeated bootstrapApp / login / authHeader pattern from specs.
 */

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
      email: process.env.SEED_ADMIN_EMAIL ?? '',
      password: process.env.SEED_ADMIN_PASSWORD ?? '',
    },
    owner: {
      email: process.env.SEED_OWNER_EMAIL ?? '',
      password: process.env.SEED_OWNER_PASSWORD ?? '',
    },
    employee: {
      email: process.env.SEED_EMPLOYEE_EMAIL ?? '',
      password: process.env.SEED_EMPLOYEE_PASSWORD ?? '',
    },
    ownerB: {
      email: process.env.SEED_COMPANY_B_OWNER_EMAIL ?? '',
      password: process.env.SEED_COMPANY_B_OWNER_PASSWORD ?? '',
    },
    employeeB: {
      email: process.env.SEED_COMPANY_B_EMPLOYEE_EMAIL ?? '',
      password: process.env.SEED_COMPANY_B_EMPLOYEE_PASSWORD ?? '',
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
