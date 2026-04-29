import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { KsefAuditLog, KsefConfiguration } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { KsefAuditLogService } from '../ksef-audit-log.service';
import { KsefHttpClientService } from '../ksef-http-client.service';

describe('KsefAuditLogService', () => {
  let service: KsefAuditLogService;
  let auditLogRepo: jest.Mocked<Repository<KsefAuditLog>>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefAuditLogService,
        KsefHttpClientService,
        { provide: getRepositoryToken(KsefConfiguration), useValue: { findOne: jest.fn() } },
        { provide: EncryptionService, useValue: { decrypt: jest.fn() } },
        {
          provide: getRepositoryToken(KsefAuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(KsefAuditLogService);
    auditLogRepo = module.get(getRepositoryToken(KsefAuditLog));
  });

  describe('log', () => {
    it('should create and save an audit log entry', async () => {
      const logEntry = {
        id: 'log-1',
        companyId: mockCompanyId,
        userId: mockUserId,
        action: 'INVOICE_CREATED',
        entityType: 'KsefInvoice',
        entityId: 'invoice-1',
        httpMethod: 'POST',
        httpUrl: '/sessions/online/ref-123/invoices',
        httpStatusCode: 200,
        durationMs: 150,
        createdAt: new Date(),
      };

      (auditLogRepo.create as jest.Mock).mockReturnValue(logEntry);
      (auditLogRepo.save as jest.Mock).mockResolvedValue(logEntry);

      await service.log({
        companyId: mockCompanyId,
        userId: mockUserId,
        action: 'INVOICE_CREATED',
        entityType: 'KsefInvoice',
        entityId: 'invoice-1',
        httpMethod: 'POST',
        httpUrl: '/sessions/online/ref-123/invoices',
        httpStatusCode: 200,
        durationMs: 150,
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: mockCompanyId,
          userId: mockUserId,
          action: 'INVOICE_CREATED',
          httpStatusCode: 200,
        }),
      );
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('should log with minimal fields', async () => {
      (auditLogRepo.create as jest.Mock).mockReturnValue({ id: 'log-2' });
      (auditLogRepo.save as jest.Mock).mockResolvedValue({ id: 'log-2' });

      await service.log({
        companyId: mockCompanyId,
        userId: mockUserId,
        action: 'CONNECTION_TEST',
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONNECTION_TEST',
        }),
      );
      expect(auditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'INVOICE_CREATED', createdAt: new Date(), companyId: mockCompanyId, userId: mockUserId, user: { id: mockUserId, email: 'test@test.com' } },
        { id: 'log-2', action: 'SESSION_OPENED', createdAt: new Date(), companyId: mockCompanyId, userId: mockUserId, user: { id: mockUserId, email: 'test@test.com' } },
      ];

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      (auditLogRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findAll(mockCompanyId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(qb.where).toHaveBeenCalledWith('log.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should apply action filter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      (auditLogRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.findAll(mockCompanyId, {
        action: 'INVOICE_CREATED',
        page: 1,
        limit: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('log.action = :action', {
        action: 'INVOICE_CREATED',
      });
    });
  });

  describe('findByEntity', () => {
    it('should find logs by entity type and id', async () => {
      const mockLogs = [{ id: 'log-1', action: 'INVOICE_CREATED' }];
      (auditLogRepo.find as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.findByEntity('KsefInvoice', 'invoice-1');

      expect(auditLogRepo.find).toHaveBeenCalledWith({
        where: { entityType: 'KsefInvoice', entityId: 'invoice-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
