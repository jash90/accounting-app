import {
  KsefEnvironment,
  KsefSession,
  KsefSessionStatus,
  KsefSessionType,
} from '@accounting/common';

import { KsefSessionService } from '../ksef-session.service';

/**
 * Pinned test for the UPO shape fix.
 *
 * Before the fix, `getSessionStatus` assumed `response.upo` was a string
 * and stored `[object Object]` into `KsefSession.upoContent`. KSeF v2
 * actually returns a structured object with pre-signed Azure SAS URLs
 * for downloading each UPO page. The fix follows the SAS URL and stores
 * the resulting XML body into `upoContent`, plus stashes the URL +
 * expiration into `metadata` for UI fallback.
 *
 * The test exercises the full path: parse the response, fetch from the
 * mocked SAS URL, persist the XML, set `upoReference`. It also covers
 * the failure path where the SAS URL is unreachable so we don't lose
 * the URL for a later retry.
 */
describe('KsefSessionService.getSessionStatus — UPO download', () => {
  let service: KsefSessionService;
  let sessionRepo: { findOne: jest.Mock; save: jest.Mock };
  let httpClient: { request: jest.Mock };
  let configService: { getConfigOrFail: jest.Mock };
  let auditLogService: { log: jest.Mock };
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: jest.Mock;

  const COMPANY_ID = 'company-1';
  const USER_ID = 'user-1';
  const SESSION_ID = 'session-1';
  const SESSION_REF = '20260428-SO-ABC123';

  const buildSession = (overrides: Partial<KsefSession> = {}): KsefSession =>
    ({
      id: SESSION_ID,
      companyId: COMPANY_ID,
      sessionType: KsefSessionType.INTERACTIVE,
      ksefSessionRef: SESSION_REF,
      status: KsefSessionStatus.ACTIVE,
      startedAt: new Date('2026-04-28T10:00:00Z'),
      expiresAt: new Date('2026-04-28T22:00:00Z'),
      invoiceCount: 0,
      upoReference: null,
      upoContent: null,
      metadata: null,
      createdById: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as KsefSession);

  beforeEach(() => {
    sessionRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (s) => s),
    };
    httpClient = { request: jest.fn() };
    configService = {
      getConfigOrFail: jest.fn(async () => ({ environment: KsefEnvironment.DEMO })),
    };
    auditLogService = { log: jest.fn() };

    originalFetch = globalThis.fetch;
    fetchMock = jest.fn();
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = fetchMock as unknown as typeof globalThis.fetch;

    service = new KsefSessionService(
      sessionRepo as never,
      httpClient as never,
      { authenticate: jest.fn() } as never,
      {} as never,
      configService as never,
      auditLogService as never,
      {} as never,
      { encrypt: jest.fn(), decrypt: jest.fn() } as never,
    );
  });

  afterEach(() => {
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = originalFetch;
  });

  it('downloads the SAS UPO URL and stores the XML body in session.upoContent', async () => {
    sessionRepo.findOne.mockResolvedValue(buildSession());
    httpClient.request.mockResolvedValue({
      data: {
        status: { code: 200, description: 'OK' },
        successfulInvoiceCount: 1,
        upo: {
          pages: [
            {
              referenceNumber: '20260428-EU-DEADBEEF',
              downloadUrl:
                'https://api-demo.ksef.mf.gov.pl/storage/01/abc/upo_00.xml?sv=2025&sig=xxx',
              downloadUrlExpirationDate: '2026-05-01T21:57:09Z',
            },
          ],
        },
      },
      status: 200,
      headers: {},
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<?xml version="1.0"?><UPO>signed-content</UPO>',
    });

    const dto = await service.getSessionStatus(SESSION_ID, COMPANY_ID, USER_ID);

    // SAS URL fetched WITHOUT Authorization header (per KSeF spec).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('storage/01/abc/upo_00.xml');
    expect(init?.headers).toBeUndefined();

    // The persisted session has the actual XML body (not the response object).
    const saved = sessionRepo.save.mock.calls.at(-1)?.[0] as KsefSession;
    expect(saved.upoContent).toBe('<?xml version="1.0"?><UPO>signed-content</UPO>');
    expect(saved.upoReference).toBe('20260428-EU-DEADBEEF');
    expect(saved.metadata).toMatchObject({
      upoDownloadUrl: 'https://api-demo.ksef.mf.gov.pl/storage/01/abc/upo_00.xml?sv=2025&sig=xxx',
      upoDownloadUrlExpirationDate: '2026-05-01T21:57:09Z',
    });

    expect(dto.upoAvailable).toBe(true);
    expect(dto.processedCount).toBe(1);
  });

  it('persists the SAS URL + expiry as a fallback when the eager fetch fails', async () => {
    sessionRepo.findOne.mockResolvedValue(buildSession());
    httpClient.request.mockResolvedValue({
      data: {
        status: { code: 200, description: 'OK' },
        upo: {
          pages: [
            {
              referenceNumber: 'r1',
              downloadUrl: 'https://upo.example/blob',
              downloadUrlExpirationDate: '2026-05-01T00:00:00Z',
            },
          ],
        },
      },
      status: 200,
      headers: {},
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => '',
    });

    await service.getSessionStatus(SESSION_ID, COMPANY_ID, USER_ID);

    const saved = sessionRepo.save.mock.calls.at(-1)?.[0] as KsefSession;
    // No XML captured…
    expect(saved.upoContent).toBeFalsy();
    // …but the URL + expiry are persisted so a later poll can retry while
    // the SAS link is still valid.
    expect(saved.metadata).toMatchObject({
      upoDownloadUrl: 'https://upo.example/blob',
      upoDownloadUrlExpirationDate: '2026-05-01T00:00:00Z',
    });
  });

  it('does NOT re-fetch the SAS URL once upoContent is already set', async () => {
    sessionRepo.findOne.mockResolvedValue(
      buildSession({ upoContent: '<?xml version="1.0"?><UPO>cached</UPO>' }),
    );
    httpClient.request.mockResolvedValue({
      data: {
        status: { code: 200, description: 'OK' },
        upo: { pages: [{ referenceNumber: 'r', downloadUrl: 'https://e/x', downloadUrlExpirationDate: 'd' }] },
      },
      status: 200,
      headers: {},
    });

    const dto = await service.getSessionStatus(SESSION_ID, COMPANY_ID, USER_ID);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dto.upoAvailable).toBe(true);
  });

  it('handles a status response without a UPO (still processing) without saving anything', async () => {
    sessionRepo.findOne.mockResolvedValue(buildSession());
    httpClient.request.mockResolvedValue({
      data: { status: { code: 100, description: 'Processing' }, upo: null },
      status: 200,
      headers: {},
    });

    const dto = await service.getSessionStatus(SESSION_ID, COMPANY_ID, USER_ID);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionRepo.save).not.toHaveBeenCalled();
    expect(dto.upoAvailable).toBe(false);
  });
});
