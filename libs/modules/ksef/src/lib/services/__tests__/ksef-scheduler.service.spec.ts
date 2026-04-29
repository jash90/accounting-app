import { KsefEnvironment, KsefInvoice, KsefInvoiceStatus } from '@accounting/common';

import { KsefSchedulerService } from '../ksef-scheduler.service';

/**
 * Tests for the per-invoice status poller.
 *
 * Two failure modes the polling code historically had:
 *   1. KSeF code 440 (Duplikat faktury) was bucketed into the generic
 *      `>= 400` rejection branch, even though 440 means "this invoice
 *      payload was already accepted under a different reference" — i.e.
 *      ACCEPTED, not REJECTED. The fix branches on 440 BEFORE the generic
 *      fallback and copies the canonical KSeF number out of
 *      `extensions.originalKsefNumber` so the audit trail isn't broken.
 *   2. Per-invoice UPO was returned in `upoDownloadUrl` (pre-signed Azure
 *      SAS) but never captured. The fix follows the URL and persists the
 *      XML, with the URL + expiry stored as fallback when the eager fetch
 *      fails.
 */
describe('KsefSchedulerService.pollPendingStatuses', () => {
  let service: KsefSchedulerService;
  let invoiceRepo: { find: jest.Mock };
  let httpClient: { request: jest.Mock };
  let authService: { getValidToken: jest.Mock };
  let configService: { getConfig: jest.Mock };
  let invoiceService: { updateInvoiceStatus: jest.Mock };
  let sessionService: { expireStaleSessions: jest.Mock };
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: jest.Mock;

  const COMPANY_ID = 'co-1';
  const USER_ID = 'user-1';

  const pendingInvoice = (id: string, ksefRef = 'KSEF-REF-1'): KsefInvoice =>
    ({
      id,
      companyId: COMPANY_ID,
      status: KsefInvoiceStatus.SUBMITTED,
      ksefReferenceNumber: ksefRef,
      sessionId: 's1',
      session: { ksefSessionRef: '20260428-SO-XYZ' },
      createdById: USER_ID,
    } as unknown as KsefInvoice);

  beforeEach(() => {
    invoiceRepo = { find: jest.fn() };
    httpClient = { request: jest.fn() };
    authService = { getValidToken: jest.fn(async () => 'access-token') };
    configService = {
      getConfig: jest.fn(async () => ({ environment: KsefEnvironment.DEMO })),
    };
    invoiceService = { updateInvoiceStatus: jest.fn() };
    sessionService = { expireStaleSessions: jest.fn() };

    originalFetch = globalThis.fetch;
    fetchMock = jest.fn();
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = fetchMock as unknown as typeof globalThis.fetch;

    service = new KsefSchedulerService(
      invoiceRepo as never,
      httpClient as never,
      authService as never,
      configService as never,
      invoiceService as never,
      sessionService as never,
    );
  });

  afterEach(() => {
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = originalFetch;
  });

  it('on KSeF 440 duplicate, marks invoice ACCEPTED with the original ksefNumber', async () => {
    invoiceRepo.find.mockResolvedValue([pendingInvoice('inv-dup')]);
    httpClient.request.mockResolvedValue({
      data: {
        status: {
          code: 440,
          description: 'Duplikat faktury',
          extensions: {
            originalKsefNumber: '8191654690-20260428-A2C5E0000000-06',
            originalSessionReferenceNumber: '20260428-SO-EARLIER',
          },
        },
      },
      status: 200,
      headers: {},
    });

    await service.pollPendingStatuses();

    expect(invoiceService.updateInvoiceStatus).toHaveBeenCalledWith(
      'inv-dup',
      KsefInvoiceStatus.ACCEPTED,
      { ksefNumber: '8191654690-20260428-A2C5E0000000-06' },
    );
    // Critically: never marked REJECTED.
    expect(invoiceService.updateInvoiceStatus).not.toHaveBeenCalledWith(
      'inv-dup',
      KsefInvoiceStatus.REJECTED,
      expect.anything(),
    );
  });

  it('on KSeF 440 with NO originalKsefNumber, falls back to REJECTED rather than getting stuck', async () => {
    invoiceRepo.find.mockResolvedValue([pendingInvoice('inv-malformed-440')]);
    httpClient.request.mockResolvedValue({
      data: {
        status: { code: 440, description: 'Duplikat faktury', extensions: {} },
      },
      status: 200,
      headers: {},
    });

    await service.pollPendingStatuses();

    const call = invoiceService.updateInvoiceStatus.mock.calls[0];
    expect(call[1]).toBe(KsefInvoiceStatus.REJECTED);
    expect(call[2].validationErrors[0].code).toBe(440);
  });

  it('on KSeF 200, downloads the per-invoice UPO from the SAS URL and persists the XML', async () => {
    invoiceRepo.find.mockResolvedValue([pendingInvoice('inv-ok')]);
    httpClient.request.mockResolvedValue({
      data: {
        ksefNumber: '8191654690-20260428-A846E0000000-A3',
        upoDownloadUrl: 'https://upo.example/per-inv-upo.xml?sig=abc',
        upoDownloadUrlExpirationDate: '2026-05-01T21:57:09Z',
        status: { code: 200, description: 'OK' },
      },
      status: 200,
      headers: {},
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<?xml version="1.0"?><UPO>per-invoice</UPO>',
    });

    await service.pollPendingStatuses();

    expect(invoiceService.updateInvoiceStatus).toHaveBeenCalledWith(
      'inv-ok',
      KsefInvoiceStatus.ACCEPTED,
      expect.objectContaining({
        ksefNumber: '8191654690-20260428-A846E0000000-A3',
        upoXml: '<?xml version="1.0"?><UPO>per-invoice</UPO>',
        upoDownloadUrl: 'https://upo.example/per-inv-upo.xml?sig=abc',
        upoDownloadUrlExpirationDate: new Date('2026-05-01T21:57:09Z'),
      }),
    );
  });

  it('persists upoDownloadUrl + expiry even when the eager SAS fetch fails', async () => {
    invoiceRepo.find.mockResolvedValue([pendingInvoice('inv-flaky')]);
    httpClient.request.mockResolvedValue({
      data: {
        ksefNumber: 'KSeF-NUM-2',
        upoDownloadUrl: 'https://upo.example/per-inv.xml?sig=def',
        upoDownloadUrlExpirationDate: '2026-05-01T00:00:00Z',
        status: { code: 200, description: 'OK' },
      },
      status: 200,
      headers: {},
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      text: async () => '',
    });

    await service.pollPendingStatuses();

    const call = invoiceService.updateInvoiceStatus.mock.calls[0];
    expect(call[2]).toMatchObject({
      ksefNumber: 'KSeF-NUM-2',
      upoXml: null,
      upoDownloadUrl: 'https://upo.example/per-inv.xml?sig=def',
    });
  });

  it('on a non-440 4xx status, marks the invoice REJECTED with the Polish-mapped code', async () => {
    invoiceRepo.find.mockResolvedValue([pendingInvoice('inv-bad')]);
    httpClient.request.mockResolvedValue({
      data: {
        status: { code: 450, description: 'Błąd weryfikacji semantyki', details: ['VAT mismatch'] },
      },
      status: 200,
      headers: {},
    });

    await service.pollPendingStatuses();

    const call = invoiceService.updateInvoiceStatus.mock.calls[0];
    expect(call[1]).toBe(KsefInvoiceStatus.REJECTED);
    expect(call[2].validationErrors[0]).toMatchObject({ code: 450 });
    expect(call[2].validationErrors[0].description).toContain('Błąd weryfikacji semantyki');
  });
});
