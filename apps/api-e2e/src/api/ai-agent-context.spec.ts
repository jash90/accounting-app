import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('AI Agent Context E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let conversationId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');

    // Create a conversation for delete test
    const res = await request(app.getHttpServer())
      .post('/modules/ai-agent/conversations')
      .set(...authHeader(ownerToken))
      .send({ title: `E2E Context ${Date.now()}` })
      .expect(201);
    conversationId = res.body.id;
  });

  afterAll(async () => {
    if (conversationId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/ai-agent/conversations/${conversationId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore */
      }
    }
    await app.close();
  });

  describe('GET /modules/ai-agent/token-usage', () => {
    it('should return token usage stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/token-usage')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /modules/ai-agent/context', () => {
    it('should list context files', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/ai-agent/context')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('DELETE /modules/ai-agent/conversations/:id', () => {
    it('should delete conversation', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/ai-agent/conversations/${conversationId}`)
        .set(...authHeader(ownerToken))
        .expect((r) => {
          expect([200, 204]).toContain(r.status);
        });

      conversationId = undefined;
    });
  });
});
