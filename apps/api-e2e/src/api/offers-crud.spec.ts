import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { authHeader, bootstrapApp, loginAs } from '../support/api-test-helper';

describe('Offers CRUD E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let createdOfferId: string;
  let createdLeadId: string;

  beforeAll(async () => {
    app = await bootstrapApp();
    ownerToken = await loginAs(app, 'owner');
  });

  afterAll(async () => {
    if (createdOfferId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/offers/${createdOfferId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    if (createdLeadId) {
      try {
        await request(app.getHttpServer())
          .delete(`/modules/offers/leads/${createdLeadId}`)
          .set(...authHeader(ownerToken));
      } catch {
        /* ignore cleanup errors */
      }
    }
    await app.close();
  });

  describe('POST /modules/offers', () => {
    it('should create an offer', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/offers')
        .set(...authHeader(ownerToken))
        .send({
          title: `E2E Offer ${Date.now()}`,
          status: 'DRAFT',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdOfferId = res.body.id;
    });
  });

  describe('GET /modules/offers', () => {
    it('should list offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/offers')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('PATCH /modules/offers/:id', () => {
    it('should update offer', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/modules/offers/${createdOfferId}`)
        .set(...authHeader(ownerToken))
        .send({ title: 'Updated E2E Offer' })
        .expect(200);

      expect(res.body.title).toBe('Updated E2E Offer');
    });
  });

  describe('POST /modules/offers/leads', () => {
    it('should create a lead', async () => {
      const res = await request(app.getHttpServer())
        .post('/modules/offers/leads')
        .set(...authHeader(ownerToken))
        .send({
          companyName: `E2E Lead ${Date.now()}`,
          contactPerson: 'Jan Kowalski',
          email: `e2e-lead-${Date.now()}@example.com`,
          source: 'WEBSITE',
          status: 'NEW',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      createdLeadId = res.body.id;
    });
  });

  describe('GET /modules/offers/leads', () => {
    it('should list leads', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules/offers/leads')
        .set(...authHeader(ownerToken))
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('DELETE /modules/offers/:id', () => {
    it('should delete offer', async () => {
      await request(app.getHttpServer())
        .delete(`/modules/offers/${createdOfferId}`)
        .set(...authHeader(ownerToken))
        .expect(200);

      createdOfferId = undefined;
    });
  });
});
