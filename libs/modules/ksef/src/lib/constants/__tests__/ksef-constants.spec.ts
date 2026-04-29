import { KSEF_BASE_URLS, KSEF_API_PATHS, KSEF_DEFAULTS } from '../ksef-endpoints';
import { KSEF_MESSAGES } from '../ksef-messages';
import { KsefEnvironment } from '@accounting/common';

describe('KSEF Constants', () => {
  describe('KSEF_BASE_URLS', () => {
    it('should have URLs for all environments', () => {
      expect(KSEF_BASE_URLS[KsefEnvironment.TEST]).toBe('https://api-test.ksef.mf.gov.pl/v2');
      expect(KSEF_BASE_URLS[KsefEnvironment.DEMO]).toBe('https://api-demo.ksef.mf.gov.pl/v2');
      expect(KSEF_BASE_URLS[KsefEnvironment.PRODUCTION]).toBe('https://api.ksef.mf.gov.pl/v2');
    });

    it('should use HTTPS for all environments', () => {
      Object.values(KSEF_BASE_URLS).forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });
  });

  describe('KSEF_API_PATHS', () => {
    it('should have all required auth paths', () => {
      expect(KSEF_API_PATHS.AUTH_CHALLENGE).toBe('/auth/challenge');
      expect(KSEF_API_PATHS.AUTH_TOKEN).toBe('/auth/ksef-token');
      expect(KSEF_API_PATHS.AUTH_STATUS).toBe('/auth');
      expect(KSEF_API_PATHS.TOKEN_REDEEM).toBe('/auth/token/redeem');
      expect(KSEF_API_PATHS.TOKEN_REFRESH).toBe('/auth/token/refresh');
    });

    it('should have session paths with {ref} placeholders', () => {
      expect(KSEF_API_PATHS.SESSION_ONLINE_OPEN).toBe('/sessions/online');
      expect(KSEF_API_PATHS.SESSION_ONLINE_INVOICES).toContain('{ref}');
      expect(KSEF_API_PATHS.SESSION_ONLINE_CLOSE).toContain('{ref}');
      expect(KSEF_API_PATHS.SESSION_ONLINE_STATUS).toContain('{ref}');
    });

    it('should have invoice paths', () => {
      expect(KSEF_API_PATHS.INVOICE_GET).toContain('{ksefNumber}');
      expect(KSEF_API_PATHS.INVOICE_QUERY_METADATA).toBeDefined();
    });

    it('should have public key path', () => {
      expect(KSEF_API_PATHS.PUBLIC_KEY).toBe('/security/public-key-certificates');
    });
  });

  describe('KSEF_DEFAULTS', () => {
    it('should have reasonable timeout values', () => {
      expect(KSEF_DEFAULTS.REQUEST_TIMEOUT_MS).toBe(30_000);
      expect(KSEF_DEFAULTS.UPLOAD_TIMEOUT_MS).toBe(120_000);
    });

    it('should have reasonable retry config', () => {
      expect(KSEF_DEFAULTS.MAX_RETRIES).toBe(3);
      expect(KSEF_DEFAULTS.RETRY_BASE_DELAY_MS).toBeGreaterThanOrEqual(500);
    });

    it('should have reasonable session config', () => {
      expect(KSEF_DEFAULTS.SESSION_EXPIRY_HOURS).toBe(12);
      expect(KSEF_DEFAULTS.MAX_INVOICES_PER_SESSION).toBe(10_000);
    });

    it('should cache the MoF public key for at most 1h', () => {
      // 1h is a deliberate ceiling: any longer and we cannot recover from a
      // ministry emergency rotation without a process restart. The crypto
      // service additionally exposes `forceRefresh` for catch-path recovery.
      expect(KSEF_DEFAULTS.PUBLIC_KEY_CACHE_TTL_MS).toBe(60 * 60 * 1000);
    });
  });

  describe('KSEF_MESSAGES', () => {
    it('should have all required config messages', () => {
      expect(KSEF_MESSAGES.CONFIG_CREATED).toBeTruthy();
      expect(KSEF_MESSAGES.CONFIG_UPDATED).toBeTruthy();
      expect(KSEF_MESSAGES.CONFIG_DELETED).toBeTruthy();
      expect(KSEF_MESSAGES.CONFIG_NOT_FOUND).toBeTruthy();
      expect(KSEF_MESSAGES.CONFIG_REQUIRED).toBeTruthy();
    });

    it('should have all required auth messages', () => {
      expect(KSEF_MESSAGES.AUTH_SUCCESS).toBeTruthy();
      expect(KSEF_MESSAGES.AUTH_FAILED).toBeTruthy();
      expect(KSEF_MESSAGES.AUTH_TOKEN_EXPIRED).toBeTruthy();
    });

    it('should have all required session messages', () => {
      expect(KSEF_MESSAGES.SESSION_OPENED).toBeTruthy();
      expect(KSEF_MESSAGES.SESSION_CLOSED).toBeTruthy();
      expect(KSEF_MESSAGES.SESSION_EXPIRED).toBeTruthy();
      expect(KSEF_MESSAGES.SESSION_NOT_FOUND).toBeTruthy();
    });

    it('should have all required invoice messages', () => {
      expect(KSEF_MESSAGES.INVOICE_CREATED).toBeTruthy();
      expect(KSEF_MESSAGES.INVOICE_SUBMITTED).toBeTruthy();
      expect(KSEF_MESSAGES.INVOICE_ACCEPTED).toBeTruthy();
      expect(KSEF_MESSAGES.INVOICE_REJECTED).toBeTruthy();
      expect(KSEF_MESSAGES.INVOICE_NOT_FOUND).toBeTruthy();
      expect(KSEF_MESSAGES.INVOICE_NOT_DRAFT).toBeTruthy();
    });

    it('should have error messages', () => {
      expect(KSEF_MESSAGES.ENCRYPTION_ERROR).toBeTruthy();
      expect(KSEF_MESSAGES.XML_GENERATION_ERROR).toBeTruthy();
      expect(KSEF_MESSAGES.RATE_LIMIT_EXCEEDED).toBeTruthy();
      expect(KSEF_MESSAGES.NIP_REQUIRED).toBeTruthy();
    });

    it('should use Polish language', () => {
      expect(KSEF_MESSAGES.CONNECTION_SUCCESS).toContain('KSeF');
      expect(KSEF_MESSAGES.INVOICE_CREATED).toContain('Faktura');
    });
  });
});
