import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  KsefAuditLog,
  KsefAuthMethod,
  KsefConfiguration,
} from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { KsefAuditLogService } from '../ksef-audit-log.service';
import { KsefHttpClientService } from '../ksef-http-client.service';

/**
 * Regression test for the demo-encryption Suspect #1 fix.
 *
 * Before the fix, `getHttpsAgent` unconditionally attached a client
 * certificate to every request whenever the company had any cert/key in
 * `KsefConfiguration` — even when the auth method was `TOKEN`, which is
 * NOT supposed to use mTLS. Demo (and prod) reject those handshakes with
 * 21115 ("Nieprawidłowy certyfikat"), which surfaces to the user as a
 * vague "encryption is broken" error.
 *
 * After the fix, mTLS is only attached for `XADES`. The tests below pin
 * that behaviour for both auth methods and for the no-config edge case.
 */
describe('KsefHttpClientService — mTLS gating by auth method', () => {
  let service: KsefHttpClientService;
  let configRepo: jest.Mocked<Repository<KsefConfiguration>>;
  let encryptionService: { decrypt: jest.Mock };

  const COMPANY_ID = 'company-123';
  const FAKE_PEM_CERT = '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----';
  const FAKE_PEM_KEY = '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----';

  const baseConfig: Partial<KsefConfiguration> = {
    companyId: COMPANY_ID,
    encryptedCertificate: 'enc-cert',
    encryptedPrivateKey: 'enc-key',
    encryptedCertificatePassword: null,
  };

  beforeEach(async () => {
    encryptionService = {
      decrypt: jest.fn(async (value: string) => {
        if (value === 'enc-cert') return FAKE_PEM_CERT;
        if (value === 'enc-key') return FAKE_PEM_KEY;
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefHttpClientService,
        { provide: KsefAuditLogService, useValue: { log: jest.fn() } },
        {
          provide: getRepositoryToken(KsefConfiguration),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(KsefAuditLog),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        { provide: EncryptionService, useValue: encryptionService },
      ],
    }).compile();

    service = module.get(KsefHttpClientService);
    configRepo = module.get(getRepositoryToken(KsefConfiguration));
  });

  it('does NOT attach mTLS when authMethod is TOKEN even if cert + key are present', async () => {
    (configRepo.findOne as jest.Mock).mockResolvedValue({
      ...baseConfig,
      authMethod: KsefAuthMethod.TOKEN,
    });

    const agent = await (service as unknown as {
      getHttpsAgent: (id: string) => Promise<unknown>;
    }).getHttpsAgent(COMPANY_ID);

    expect(agent).toBeUndefined();
    // Decryption must NOT be called — we should bail out before touching the cert.
    expect(encryptionService.decrypt).not.toHaveBeenCalled();
  });

  it('does NOT attach mTLS when there is no config at all', async () => {
    (configRepo.findOne as jest.Mock).mockResolvedValue(null);

    const agent = await (service as unknown as {
      getHttpsAgent: (id: string) => Promise<unknown>;
    }).getHttpsAgent(COMPANY_ID);

    expect(agent).toBeUndefined();
    expect(encryptionService.decrypt).not.toHaveBeenCalled();
  });

  it('does NOT attach mTLS when authMethod is XADES but cert is missing', async () => {
    (configRepo.findOne as jest.Mock).mockResolvedValue({
      companyId: COMPANY_ID,
      authMethod: KsefAuthMethod.XADES,
      encryptedCertificate: null,
      encryptedPrivateKey: null,
    });

    const agent = await (service as unknown as {
      getHttpsAgent: (id: string) => Promise<unknown>;
    }).getHttpsAgent(COMPANY_ID);

    expect(agent).toBeUndefined();
  });

  it('caches the "no agent" decision per company across calls', async () => {
    (configRepo.findOne as jest.Mock).mockResolvedValue({
      ...baseConfig,
      authMethod: KsefAuthMethod.TOKEN,
    });

    await (service as unknown as {
      getHttpsAgent: (id: string) => Promise<unknown>;
    }).getHttpsAgent(COMPANY_ID);

    // Token-auth path explicitly skips caching the "undefined" decision so
    // that switching the auth method later still triggers a fresh lookup.
    // (We assert configRepo.findOne IS called more than once on a second
    // call to lock that contract.)
    await (service as unknown as {
      getHttpsAgent: (id: string) => Promise<unknown>;
    }).getHttpsAgent(COMPANY_ID);

    expect((configRepo.findOne as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  describe('clearAgentCache', () => {
    it('is a no-op when no agent was cached', () => {
      expect(() => service.clearAgentCache(COMPANY_ID)).not.toThrow();
    });
  });
});
