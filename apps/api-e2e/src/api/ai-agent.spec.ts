import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('AI Agent E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let createdConversationId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdConversationId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/ai-agent/conversations/${createdConversationId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('POST /modules/ai-agent/conversations', () => {
    it('should create a conversation', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/ai-agent/conversations')
        .set(...authHeader(ownerToken))
        .send({
          title: `E2E Conversation ${Date.now()}`,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdConversationId = res.body.id;
    });
  });

  describe('GET /modules/ai-agent/conversations', () => {
    it('should list conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/conversations')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/modules/ai-agent/conversations').expect(401);
    });
  });

  describe('GET /modules/ai-agent/config', () => {
    it('should get AI configuration', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/config')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
