import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Auth E2E', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    adminToken = await loginAs(app, 'admin');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return access_token with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.SEED_OWNER_EMAIL,
          password: process.env.SEED_OWNER_PASSWORD,
        })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
    });

    it('should return 401 with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(...authHeader(adminToken))
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password and allow login with new password', async () => {
      const originalPassword = process.env.SEED_ADMIN_PASSWORD;
      const newPassword = 'NewSecurePass123!';

      // Change password
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set(...authHeader(adminToken))
        .send({
          currentPassword: originalPassword,
          newPassword,
        })
        .expect(200);

      // Revert password back
      const newToken = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: process.env.SEED_ADMIN_EMAIL, password: newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${newToken.body.access_token}`)
        .send({
          currentPassword: newPassword,
          newPassword: originalPassword,
        })
        .expect(200);
    });
  });
});
