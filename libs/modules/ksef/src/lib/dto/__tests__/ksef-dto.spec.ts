import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { KsefInvoiceType, KsefInvoiceStatus, KsefInvoiceDirection } from '@accounting/common';

import {
  CreateKsefInvoiceDto,
  UpdateKsefInvoiceDto,
  GetKsefInvoicesQueryDto,
  KsefInvoiceLineItemDto,
  InvoiceBuyerDataDto,
} from '../ksef-invoice.dto';
import { UpsertKsefConfigDto } from '../ksef-config.dto';
import { KsefSyncRequestDto } from '../ksef-sync.dto';
import { GetKsefAuditLogsQueryDto } from '../ksef-audit.dto';

describe('Ksef DTOs', () => {
  describe('KsefInvoiceLineItemDto', () => {
    it('should validate a correct line item', async () => {
      const dto = plainToInstance(KsefInvoiceLineItemDto, {
        description: 'Test service',
        quantity: 1,
        unit: 'szt.',
        unitNetPrice: 100,
        netAmount: 100,
        vatRate: 23,
        vatAmount: 23,
        grossAmount: 123,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject negative quantity', async () => {
      const dto = plainToInstance(KsefInvoiceLineItemDto, {
        description: 'Test',
        quantity: -1,
        unitNetPrice: 100,
        netAmount: 100,
        vatRate: 23,
        vatAmount: 23,
        grossAmount: 123,
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'quantity')).toBe(true);
    });

    it('should reject missing description', async () => {
      const dto = plainToInstance(KsefInvoiceLineItemDto, {
        quantity: 1,
        unitNetPrice: 100,
        netAmount: 100,
        vatRate: 23,
        vatAmount: 23,
        grossAmount: 123,
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'description')).toBe(true);
    });

    it('should reject vatRate above 100', async () => {
      const dto = plainToInstance(KsefInvoiceLineItemDto, {
        description: 'Test',
        quantity: 1,
        unitNetPrice: 100,
        netAmount: 100,
        vatRate: 101,
        vatAmount: 23,
        grossAmount: 123,
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'vatRate')).toBe(true);
    });
  });

  describe('CreateKsefInvoiceDto', () => {
    const validLineItem = {
      description: 'Test',
      quantity: 1,
      unitNetPrice: 100,
      netAmount: 100,
      vatRate: 23,
      vatAmount: 23,
      grossAmount: 123,
    };

    it('should validate a correct invoice with clientId', async () => {
      const dto = plainToInstance(CreateKsefInvoiceDto, {
        invoiceType: KsefInvoiceType.SALES,
        issueDate: '2026-04-10',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        lineItems: [validLineItem],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate a correct invoice with buyerData', async () => {
      const dto = plainToInstance(CreateKsefInvoiceDto, {
        invoiceType: KsefInvoiceType.SALES,
        issueDate: '2026-04-10',
        buyerData: { name: 'Buyer Name' },
        lineItems: [validLineItem],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty line items', async () => {
      const dto = plainToInstance(CreateKsefInvoiceDto, {
        invoiceType: KsefInvoiceType.SALES,
        issueDate: '2026-04-10',
        lineItems: [],
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'lineItems')).toBe(true);
    });

    it('should reject invalid issueDate', async () => {
      const dto = plainToInstance(CreateKsefInvoiceDto, {
        invoiceType: KsefInvoiceType.SALES,
        issueDate: 'not-a-date',
        lineItems: [validLineItem],
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'issueDate')).toBe(true);
    });

    it('should accept optional fields', async () => {
      const dto = plainToInstance(CreateKsefInvoiceDto, {
        invoiceType: KsefInvoiceType.CORRECTION,
        issueDate: '2026-04-10',
        dueDate: '2026-04-24',
        correctedInvoiceId: '550e8400-e29b-41d4-a716-446655440000',
        paymentMethod: 'przelew',
        bankAccount: 'PL12345678901234567890123456',
        notes: 'Test notes',
        currency: 'PLN',
        lineItems: [validLineItem],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('GetKsefInvoicesQueryDto', () => {
    it('should apply default pagination values', () => {
      const dto = plainToInstance(GetKsefInvoicesQueryDto, {});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
      expect(dto.sortBy).toBe('createdAt');
      expect(dto.sortOrder).toBe('desc');
    });

    it('should validate sortBy enum', async () => {
      const dto = plainToInstance(GetKsefInvoicesQueryDto, {
        sortBy: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'sortBy')).toBe(true);
    });

    it('should accept valid sortBy values', async () => {
      for (const sortBy of ['issueDate', 'invoiceNumber', 'grossAmount', 'status', 'createdAt']) {
        const dto = plainToInstance(GetKsefInvoicesQueryDto, { sortBy });
        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'sortBy')).toBe(false);
      }
    });

    it('should reject page below 1', async () => {
      const dto = plainToInstance(GetKsefInvoicesQueryDto, { page: 0 });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should reject limit above 100', async () => {
      const dto = plainToInstance(GetKsefInvoicesQueryDto, { limit: 101 });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });
  });

  describe('UpsertKsefConfigDto', () => {
    it('should validate correct config', async () => {
      const dto = plainToInstance(UpsertKsefConfigDto, {
        environment: 'TEST',
        authMethod: 'TOKEN',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid environment', async () => {
      const dto = plainToInstance(UpsertKsefConfigDto, {
        environment: 'INVALID',
        authMethod: 'TOKEN',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'environment')).toBe(true);
    });

    it('should reject NIP not exactly 10 chars', async () => {
      const dto = plainToInstance(UpsertKsefConfigDto, {
        environment: 'TEST',
        authMethod: 'TOKEN',
        nip: '123',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'nip')).toBe(true);
    });

    it('should accept 10-character NIP', async () => {
      const dto = plainToInstance(UpsertKsefConfigDto, {
        environment: 'TEST',
        authMethod: 'TOKEN',
        nip: '1234567890',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'nip')).toBe(false);
    });
  });

  describe('KsefSyncRequestDto', () => {
    it('should validate correct sync request', async () => {
      const dto = plainToInstance(KsefSyncRequestDto, {
        dateFrom: '2026-01-01',
        dateTo: '2026-04-10',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing dateFrom', async () => {
      const dto = plainToInstance(KsefSyncRequestDto, {
        dateTo: '2026-04-10',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'dateFrom')).toBe(true);
    });
  });

  describe('GetKsefAuditLogsQueryDto', () => {
    it('should validate with default pagination', () => {
      const dto = plainToInstance(GetKsefAuditLogsQueryDto, {});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('should accept valid filter parameters', async () => {
      const dto = plainToInstance(GetKsefAuditLogsQueryDto, {
        action: 'INVOICE_CREATED',
        entityType: 'KsefInvoice',
        dateFrom: '2026-01-01',
        dateTo: '2026-04-10',
        page: 2,
        limit: 50,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
