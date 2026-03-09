import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Documents Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let templateId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    try {
      if (templateId) {
        await request(app.getHttpServer())
          .delete(`/modules/documents/templates/${templateId}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('POST /modules/documents/templates', () => {
    it('should create template with content blocks', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/documents/templates')
        .set(...authHeader(ownerToken))
        .send({
          name: `Doc Tmpl ${Date.now()}`,
          description: 'E2E test template',
          templateContent: '<p>Hello {{clientName}}</p>',
          contentBlocks: [{ type: 'text', content: 'Sample block' }],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      templateId = res.body.id;
    });
  });

  describe('GET /modules/documents/templates/:id/content', () => {
    it('should get template content', async () => {
      if (!templateId) return;

      const res = await request(app.getHttpServer())
        .get(`/modules/documents/templates/${templateId}/content`)
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('GET /modules/documents/generated', () => {
    it('should list generated documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/documents/generated')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('DELETE /modules/documents/generated/:id', () => {
    it('should return 404 for non-existent document', async () => {
      await request(app.getHttpServer())
        .delete('/modules/documents/generated/00000000-0000-0000-0000-000000000000')
        .set(...authHeader(ownerToken))
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });
});
