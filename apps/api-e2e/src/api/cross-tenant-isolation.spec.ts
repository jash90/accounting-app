import { authHeader, getApiAgent, loginAs } from '../support/api-test-helper';

/**
 * Cross-tenant data isolation E2E tests.
 *
 * Implements RBAC-TEST-PLAN.md Priority 6 cases #30, #31, #34 across the
 * business-critical resource types. Each test creates a resource as
 * Company A's owner, then verifies Company B's owner cannot read,
 * update, or delete it.
 *
 * The security boundary lives in `SystemCompanyService.getCompanyIdForUser`
 * + per-service `where: { companyId }` clauses; this spec exercises that
 * boundary at the API level rather than via UI, so it runs in seconds and
 * doesn't depend on browser timing.
 *
 * Existing per-resource isolation tests are preserved (clients-crud.spec.ts,
 * client-icons.spec.ts, field-definitions.spec.ts, notification-delivery
 * .spec.ts). This file adds coverage for the previously-untested resources:
 * tasks, offers, leads, settlements, time-tracking, documents.
 */
describe('Cross-tenant data isolation E2E', () => {
  const agent = getApiAgent();
  let ownerAToken: string;
  let ownerBToken: string;

  // Resource IDs created by Company A — must be inaccessible to Company B.
  const created: {
    taskId?: string;
    offerId?: string;
    leadId?: string;
    settlementId?: string;
    timeEntryId?: string;
    documentTemplateId?: string;
    ksefInvoiceId?: string;
    aiConversationId?: string;
  } = {};

  beforeAll(async () => {
    ownerAToken = await loginAs('owner');
    ownerBToken = await loginAs('ownerB');
  });

  afterAll(async () => {
    // Clean up resources Company A's owner created. We swallow errors —
    // the test failed fast if the resource didn't get created in the first place.
    const cleanups = [
      created.taskId && agent.delete(`/modules/tasks/${created.taskId}`),
      created.offerId && agent.delete(`/modules/offers/${created.offerId}`),
      created.leadId && agent.delete(`/modules/offers/leads/${created.leadId}`),
      created.timeEntryId && agent.delete(`/modules/time-tracking/entries/${created.timeEntryId}`),
      created.documentTemplateId &&
        agent.delete(`/modules/documents/templates/${created.documentTemplateId}`),
      created.ksefInvoiceId && agent.delete(`/modules/ksef/invoices/${created.ksefInvoiceId}`),
      created.aiConversationId &&
        agent.delete(`/modules/ai-agent/conversations/${created.aiConversationId}`),
    ].filter(Boolean);

    for (const req of cleanups) {
      try {
        await req!.set(...authHeader(ownerAToken));
      } catch {
        // best-effort cleanup
      }
    }
  });

  // ============================================================
  // Tasks (P6 #31)
  // ============================================================
  describe('Tasks', () => {
    it('Company A owner can create a task', async () => {
      const res = await agent
        .post('/modules/tasks')
        .set(...authHeader(ownerAToken))
        .send({
          title: `Cross-tenant isolation task ${Date.now()}`,
          description: 'Owned by Company A — Company B must not see this',
          status: 'todo',
          priority: 'medium',
        })
        .expect(201);

      created.taskId = res.body.id;
      expect(created.taskId).toBeDefined();
    });

    it('Company B owner cannot GET Company A task', async () => {
      await agent
        .get(`/modules/tasks/${created.taskId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot PATCH Company A task', async () => {
      await agent
        .patch(`/modules/tasks/${created.taskId}`)
        .set(...authHeader(ownerBToken))
        .send({ status: 'done' })
        .expect(404);
    });

    it('Company B owner cannot DELETE Company A task', async () => {
      await agent
        .delete(`/modules/tasks/${created.taskId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it("Company B owner's task list does not contain Company A task", async () => {
      const res = await agent
        .get('/modules/tasks')
        .set(...authHeader(ownerBToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      const ids = (res.body.data ?? []).map((t: { id: string }) => t.id);
      expect(ids).not.toContain(created.taskId);
    });
  });

  // ============================================================
  // Offers (P6 #34 — offer subset)
  // ============================================================
  describe('Offers', () => {
    it('Company A owner can create an offer', async () => {
      const res = await agent
        .post('/modules/offers')
        .set(...authHeader(ownerAToken))
        .send({
          title: `Cross-tenant isolation offer ${Date.now()}`,
          status: 'DRAFT',
          contentBlocks: [],
        });

      // Some endpoints return 201, some 200 — accept both, fail on anything else
      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.offerId = res.body.id;
      expect(created.offerId).toBeDefined();
    });

    it('Company B owner cannot GET Company A offer', async () => {
      await agent
        .get(`/modules/offers/${created.offerId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot PATCH Company A offer', async () => {
      await agent
        .patch(`/modules/offers/${created.offerId}`)
        .set(...authHeader(ownerBToken))
        .send({ title: 'Hijacked title' })
        .expect(404);
    });
  });

  // ============================================================
  // Leads (P6 #34 — lead subset)
  // ============================================================
  describe('Leads', () => {
    it('Company A owner can create a lead', async () => {
      const res = await agent
        .post('/modules/offers/leads')
        .set(...authHeader(ownerAToken))
        .send({
          name: `Cross-tenant isolation lead ${Date.now()}`,
          source: 'WEBSITE',
          status: 'NEW',
        });

      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.leadId = res.body.id;
      expect(created.leadId).toBeDefined();
    });

    it('Company B owner cannot GET Company A lead', async () => {
      await agent
        .get(`/modules/offers/leads/${created.leadId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });
  });

  // ============================================================
  // Time entries (P6 #34 — time-entry subset)
  // ============================================================
  describe('Time entries', () => {
    it('Company A owner can create a time entry', async () => {
      const res = await agent
        .post('/modules/time-tracking/entries')
        .set(...authHeader(ownerAToken))
        .send({
          description: `Cross-tenant isolation time entry ${Date.now()}`,
          durationMinutes: 30,
          startedAt: new Date().toISOString(),
          endedAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        });

      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.timeEntryId = res.body.id;
      expect(created.timeEntryId).toBeDefined();
    });

    it('Company B owner cannot GET Company A time entry', async () => {
      await agent
        .get(`/modules/time-tracking/entries/${created.timeEntryId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot DELETE Company A time entry', async () => {
      await agent
        .delete(`/modules/time-tracking/entries/${created.timeEntryId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });
  });

  // ============================================================
  // Settlements (P6 #34 — settlement subset)
  // ============================================================
  // Settlements are auto-generated for client-month combinations and require
  // a client to exist. Rather than replicating all the setup, we verify the
  // boundary by listing — Company B's list must not include any of A's
  // settlements (the seed gives each company its own clients which auto-generate
  // settlements).
  describe('Settlements (list-level isolation)', () => {
    it("Company B owner's settlement list contains only Company B settlements", async () => {
      const aRes = await agent
        .get('/modules/settlements')
        .set(...authHeader(ownerAToken))
        .query({ page: 1, limit: 100 })
        .expect(200);
      const bRes = await agent
        .get('/modules/settlements')
        .set(...authHeader(ownerBToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      const aIds = new Set((aRes.body.data ?? []).map((s: { id: string }) => s.id));
      const bIds = (bRes.body.data ?? []).map((s: { id: string }) => s.id);

      // No Company A settlement should appear in Company B's list
      for (const id of bIds) {
        expect(aIds.has(id)).toBe(false);
      }
    });

    it('Company B owner cannot GET a Company A settlement directly', async () => {
      const aRes = await agent
        .get('/modules/settlements')
        .set(...authHeader(ownerAToken))
        .query({ page: 1, limit: 1 })
        .expect(200);

      const aSettlementId = aRes.body.data?.[0]?.id;
      if (!aSettlementId) {
        // No settlements seeded for Company A — skip rather than fail
        return;
      }

      await agent
        .get(`/modules/settlements/${aSettlementId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });
  });

  // ============================================================
  // Document templates (P6 — gap closure)
  // ============================================================
  describe('Document templates', () => {
    it('Company A owner can create a document template', async () => {
      const res = await agent
        .post('/modules/documents/templates')
        .set(...authHeader(ownerAToken))
        .send({
          name: `Cross-tenant isolation template ${Date.now()}`,
          description: 'Owned by Company A — Company B must not see this',
        });

      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.documentTemplateId = res.body.id;
      expect(created.documentTemplateId).toBeDefined();
    });

    it('Company B owner cannot GET Company A document template', async () => {
      await agent
        .get(`/modules/documents/templates/${created.documentTemplateId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot PATCH Company A document template', async () => {
      await agent
        .patch(`/modules/documents/templates/${created.documentTemplateId}`)
        .set(...authHeader(ownerBToken))
        .send({ name: 'Hijacked template name' })
        .expect(404);
    });

    it('Company B owner cannot DELETE Company A document template', async () => {
      await agent
        .delete(`/modules/documents/templates/${created.documentTemplateId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });
  });

  // ============================================================
  // KSeF invoices (P6 — gap closure)
  // ============================================================
  // KSeF invoice creation requires the company to have a NIP set
  // (see ksef-invoice.service.ts:158 — throws BadRequestException if
  // company.nip is missing). Both seeded companies have NIP per
  // demo-data-seeder.service.ts:224, so creation should succeed.
  describe('KSeF invoices', () => {
    it('Company A owner can create a draft KSeF invoice', async () => {
      const res = await agent
        .post('/modules/ksef/invoices')
        .set(...authHeader(ownerAToken))
        .send({
          invoiceType: 'STANDARD',
          issueDate: new Date().toISOString().substring(0, 10),
          buyerData: {
            name: 'Cross-tenant test buyer',
          },
          lineItems: [
            {
              description: 'Cross-tenant isolation test line',
              quantity: 1,
              unit: 'szt',
              unitNetPrice: 100,
              netAmount: 100,
              vatRate: 23,
              vatAmount: 23,
              grossAmount: 123,
            },
          ],
        });

      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.ksefInvoiceId = res.body.id;
      expect(created.ksefInvoiceId).toBeDefined();
    });

    it('Company B owner cannot GET Company A KSeF invoice', async () => {
      await agent
        .get(`/modules/ksef/invoices/${created.ksefInvoiceId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot PATCH Company A KSeF invoice', async () => {
      await agent
        .patch(`/modules/ksef/invoices/${created.ksefInvoiceId}`)
        .set(...authHeader(ownerBToken))
        .send({ buyerData: { name: 'Hijacked buyer' } })
        .expect(404);
    });

    it("Company B owner's invoice list does not contain Company A invoice", async () => {
      const res = await agent
        .get('/modules/ksef/invoices')
        .set(...authHeader(ownerBToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      const ids = (res.body.data ?? []).map((inv: { id: string }) => inv.id);
      expect(ids).not.toContain(created.ksefInvoiceId);
    });
  });

  // ============================================================
  // AI conversations (P6 — gap closure)
  // ============================================================
  describe('AI conversations', () => {
    it('Company A owner can create an AI conversation', async () => {
      const res = await agent
        .post('/modules/ai-agent/conversations')
        .set(...authHeader(ownerAToken))
        .send({
          title: `Cross-tenant isolation AI conv ${Date.now()}`,
        });

      if (![200, 201].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      created.aiConversationId = res.body.id;
      expect(created.aiConversationId).toBeDefined();
    });

    it('Company B owner cannot GET Company A AI conversation', async () => {
      await agent
        .get(`/modules/ai-agent/conversations/${created.aiConversationId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it('Company B owner cannot DELETE Company A AI conversation', async () => {
      await agent
        .delete(`/modules/ai-agent/conversations/${created.aiConversationId}`)
        .set(...authHeader(ownerBToken))
        .expect(404);
    });

    it("Company B owner's conversation list does not contain Company A conversation", async () => {
      const res = await agent
        .get('/modules/ai-agent/conversations')
        .set(...authHeader(ownerBToken))
        .query({ page: 1, limit: 100 })
        .expect(200);

      // Endpoint may return either {data: [...]} pagination shape or
      // a bare array — handle both
      const list = Array.isArray(res.body) ? res.body : (res.body.data ?? []);
      const ids = list.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(created.aiConversationId);
    });
  });
});
