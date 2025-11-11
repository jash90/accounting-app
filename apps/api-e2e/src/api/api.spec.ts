import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('RBAC E2E Tests', () => {
  let app: INestApplication;
  let adminToken: string;
  let ownerAToken: string;
  let employee1AToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should login as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@system.com',
          password: 'Admin123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      adminToken = response.body.access_token;
    });

    it('should login as company owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'owner.a@company.com',
          password: 'Owner123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      ownerAToken = response.body.access_token;
    });

    it('should login as employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'employee1.a@company.com',
          password: 'Employee123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      employee1AToken = response.body.access_token;
    });
  });

  describe('Admin Endpoints', () => {
    it('ADMIN can list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('ADMIN cannot access business module data', async () => {
      await request(app.getHttpServer())
        .get('/modules/simple-text')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('Company Owner Endpoints', () => {
    it('COMPANY_OWNER can manage employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/company/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('COMPANY_OWNER can grant module access to employee', async () => {
      // First get employee ID
      const employeesResponse = await request(app.getHttpServer())
        .get('/company/employees')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      if (employeesResponse.body.length > 0) {
        const employeeId = employeesResponse.body[0].id;

        await request(app.getHttpServer())
          .post(`/company/employees/${employeeId}/modules/simple-text`)
          .set('Authorization', `Bearer ${ownerAToken}`)
          .send({ permissions: ['read', 'write'] })
          .expect(201);
      }
    });
  });

  describe('Employee Endpoints', () => {
    it('EMPLOYEE with read permission can view texts', async () => {
      await request(app.getHttpServer())
        .get('/modules/simple-text')
        .set('Authorization', `Bearer ${employee1AToken}`)
        .expect(200);
    });

    it('EMPLOYEE can only see own company data', async () => {
      const response = await request(app.getHttpServer())
        .get('/modules/simple-text')
        .set('Authorization', `Bearer ${employee1AToken}`)
        .expect(200);

      // All texts should belong to the same company
      if (response.body.length > 0) {
        const companyId = response.body[0].companyId;
        response.body.forEach((text: any) => {
          expect(text.companyId).toBe(companyId);
        });
      }
    });
  });
});
