import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  KsefConfiguration,
  KsefInvoice,
  KsefInvoiceStatus,
  KsefSession,
  KsefSessionStatus,
} from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { KsefStatsService } from '../ksef-stats.service';
import { KsefHttpClientService } from '../ksef-http-client.service';
import { KsefConfigService } from '../ksef-config.service';
import { KsefAuditLogService } from '../ksef-audit-log.service';

describe('KsefStatsService', () => {
  let service: KsefStatsService;
  let invoiceRepo: jest.Mocked<Repository<KsefInvoice>>;
  let sessionRepo: jest.Mocked<Repository<KsefSession>>;

  const mockCompanyId = 'company-123';

  beforeEach(async () => {
    const mockAuditLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefStatsService,
        KsefHttpClientService,
        { provide: KsefAuditLogService, useValue: mockAuditLogService },
        { provide: getRepositoryToken(KsefConfiguration), useValue: { findOne: jest.fn() } },
        { provide: EncryptionService, useValue: { decrypt: jest.fn() } },
        { provide: KsefConfigService, useValue: { getConfigOrFail: jest.fn(), getConfig: jest.fn() } },
        {
          provide: getRepositoryToken(KsefInvoice),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KsefSession),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(KsefStatsService);
    invoiceRepo = module.get(getRepositoryToken(KsefInvoice));
    sessionRepo = module.get(getRepositoryToken(KsefSession));
  });

  describe('getDashboardStats', () => {
    it('should return correct dashboard stats', async () => {
      // Mock status counts
      const statusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: KsefInvoiceStatus.DRAFT, count: '5' },
          { status: KsefInvoiceStatus.ACCEPTED, count: '20' },
          { status: KsefInvoiceStatus.SUBMITTED, count: '3' },
          { status: KsefInvoiceStatus.REJECTED, count: '1' },
        ]),
      };

      // Mock amount sums
      const amountQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalNet: '15000.50',
          totalGross: '18450.62',
        }),
      };

      let callCount = 0;
      invoiceRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? statusQb : amountQb;
      });

      // Mock active session check
      (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getDashboardStats(mockCompanyId);

      expect(result.totalInvoices).toBe(29);
      expect(result.draftCount).toBe(5);
      expect(result.acceptedCount).toBe(20);
      expect(result.pendingCount).toBe(3);
      expect(result.rejectedCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.activeSessionExists).toBe(false);
      expect(result.totalNetAmount).toBe(15000.5);
      expect(result.totalGrossAmount).toBeCloseTo(18450.62);
    });

    it('should detect active session', async () => {
      const statusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const amountQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalNet: '0',
          totalGross: '0',
        }),
      };

      let callCount = 0;
      invoiceRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? statusQb : amountQb;
      });

      (sessionRepo.findOne as jest.Mock).mockResolvedValue({ id: 'session-1' });

      const result = await service.getDashboardStats(mockCompanyId);

      expect(result.activeSessionExists).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      const statusQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const amountQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      let callCount = 0;
      invoiceRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? statusQb : amountQb;
      });

      (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getDashboardStats(mockCompanyId);

      expect(result.totalInvoices).toBe(0);
      expect(result.totalNetAmount).toBe(0);
      expect(result.totalGrossAmount).toBe(0);
    });
  });
});
