import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Email Client E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let createdDraftId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdDraftId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/email-client/drafts/${createdDraftId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('GET /modules/email-client/messages', () => {
    it('should list messages', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/email-client/messages')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/modules/email-client/messages').expect(401);
    });
  });

  describe('POST /modules/email-client/drafts', () => {
    it('should create a draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/email-client/drafts')
        .set(...authHeader(ownerToken))
        .send({
          to: 'test@example.com',
          subject: `E2E Draft ${Date.now()}`,
          body: 'Test draft body',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdDraftId = res.body.id;
    });
  });

  describe('GET /modules/email-client/drafts', () => {
    it('should list drafts', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/email-client/drafts')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });
});
