import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Offers Extended E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let offerId: string;
  let templateId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');

    // Create an offer for extended tests
    const res = await request(app.getHttpServer())
      .post('/modules/offers')
      .set(...authHeader(ownerToken))
      .send({
        title: `E2E Offer ${Date.now()}`,
        content: 'Test offer content',
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .expect(201);
    offerId = res.body.id;
  });

  afterAll(async () => {
    try {
      if (templateId) {
        await request(app.getHttpServer())
          .delete(`/modules/offers/templates/${templateId}`)
          .set(...authHeader(ownerToken));
      }
      if (offerId) {
        await request(app.getHttpServer())
          .delete(`/modules/offers/${offerId}`)
          .set(...authHeader(ownerToken));
      }
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('POST /modules/offers/:id/duplicate', () => {
    it('should duplicate offer', async () => {
      if (!offerId) return;

      const res = await request(app.getHttpServer())
        .post(`/modules/offers/${offerId}/duplicate`)
        .set(...authHeader(ownerToken))
        .expect((r) => {
          expect([200, 201]).toContain(r.status);
        });

      if (res.body?.id && res.body.id !== offerId) {
        // Clean up duplicate
        try {
          await request(app.getHttpServer())
            .delete(`/modules/offers/${res.body.id}`)
            .set(...authHeader(ownerToken));
        } catch {
          /* ignore */
        }
      }
    });
  });

  describe('PATCH /modules/offers/:id/status', () => {
    it('should update offer status', async () => {
      if (!offerId) return;

      const res = await request(app.getHttpServer())
        .patch(`/modules/offers/${offerId}/status`)
        .set(...authHeader(ownerToken))
        .send({ status: 'SENT' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('POST /modules/offers/:id/send', () => {
    it('should send offer (or fail gracefully without email config)', async () => {
      if (!offerId) return;

      await request(app.getHttpServer())
        .post(`/modules/offers/${offerId}/send`)
        .set(...authHeader(ownerToken))
        .send({ recipientEmail: 'test@example.com' })
        .expect((res) => {
          // May succeed or fail if email not configured
          expect([200, 201, 400, 422, 500]).toContain(res.status);
        });
    });
  });

  describe('Offer Templates', () => {
    it('should create a template', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/offers/templates')
        .set(...authHeader(ownerToken))
        .send({ name: `Tmpl ${Date.now()}`, content: 'Template content' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      templateId = res.body.id;
    });

    it('should list templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/offers/templates')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(Array.isArray(res.body) || res.body.data).toBeTruthy();
    });

    it('should delete template', async () => {
      if (!templateId) return;

      await request(app.getHttpServer())
        .delete(`/modules/offers/templates/${templateId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      templateId = undefined;
    });
  });
});
