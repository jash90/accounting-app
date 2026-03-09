import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Email Client Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let draftId: string;
  let autoReplyTemplateId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    try {
      if (draftId) {
        await request(app.getHttpServer())
          .delete(`/modules/email-client/drafts/${draftId}`)
          .set(...authHeader(ownerToken));
      }
      if (autoReplyTemplateId) {
        await request(app.getHttpServer())
          .delete(`/modules/email-client/auto-reply-templates/${autoReplyTemplateId}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('POST /modules/email-client/drafts', () => {
    it('should create a draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/email-client/drafts')
        .set(...authHeader(ownerToken))
        .send({
          to: 'test@example.com',
          subject: `E2E Draft ${Date.now()}`,
          body: 'Draft body content',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      draftId = res.body.id;
    });
  });

  describe('PATCH /modules/email-client/drafts/:id', () => {
    it('should update a draft', async () => {
      if (!draftId) return;

      const res = await request(app.getHttpServer())
        .patch(`/modules/email-client/drafts/${draftId}`)
        .set(...authHeader(ownerToken))
        .send({ subject: 'Updated subject' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /modules/email-client/auto-reply-templates', () => {
    it('should list auto-reply templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/email-client/auto-reply-templates')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body) || res.body.data).toBeTruthy();
    });
  });

  describe('POST /modules/email-client/auto-reply-templates', () => {
    it('should create auto-reply template', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/email-client/auto-reply-templates')
        .set(...authHeader(ownerToken))
        .send({
          name: `AutoReply ${Date.now()}`,
          subject: 'Auto reply subject',
          body: 'Thank you for your message.',
          category: 'GENERAL',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      autoReplyTemplateId = res.body.id;
    });
  });
});
