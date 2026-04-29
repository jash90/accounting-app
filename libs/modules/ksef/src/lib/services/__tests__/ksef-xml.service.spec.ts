import { Test, type TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';

import { Company, Client, KsefConfiguration, KsefInvoice, KsefInvoiceType, KsefInvoiceDirection } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';
import { getRepositoryToken } from '@nestjs/typeorm';

import { KsefXmlService } from '../ksef-xml.service';
import { KsefHttpClientService } from '../ksef-http-client.service';
import { KsefAuditLogService } from '../ksef-audit-log.service';

describe('KsefXmlService', () => {
  let service: KsefXmlService;

  const createMockCompany = (): Company =>
    ({
      nip: '1234567890',
      name: 'Test Company Sp. z o.o.',
      street: 'ul. Testowa',
      buildingNumber: '1',
      apartmentNumber: '2',
      city: 'Warszawa',
      postalCode: '00-001',
    }) as Company;

  const createMockInvoice = (overrides: Partial<KsefInvoice> = {}): KsefInvoice =>
    ({
      id: 'invoice-1',
      companyId: 'company-1',
      invoiceType: KsefInvoiceType.SALES,
      direction: KsefInvoiceDirection.OUTGOING,
      invoiceNumber: 'FV/2026/04/0001',
      status: 'DRAFT',
      issueDate: new Date('2026-04-10'),
      dueDate: new Date('2026-04-24'),
      sellerNip: '1234567890',
      sellerName: 'Test Company Sp. z o.o.',
      buyerNip: '0987654321',
      buyerName: 'Test Client Sp. z o.o.',
      netAmount: 1000,
      vatAmount: 230,
      grossAmount: 1230,
      currency: 'PLN',
      lineItems: [
        {
          description: 'Usługa programistyczna',
          quantity: 10,
          unit: 'godz.',
          unitNetPrice: 100,
          netAmount: 1000,
          vatRate: 23,
          vatAmount: 230,
          grossAmount: 1230,
        },
      ],
      ...overrides,
    }) as KsefInvoice;

  const createMockClient = (): Client =>
    ({
      id: 'client-1',
      name: 'Test Client Sp. z o.o.',
      nip: '0987654321',
      companyId: 'company-1',
    }) as Client;

  beforeEach(async () => {
    const mockAuditLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        KsefXmlService,
        KsefHttpClientService,
        { provide: KsefAuditLogService, useValue: mockAuditLogService },
        { provide: getRepositoryToken(KsefConfiguration), useValue: { findOne: jest.fn() } },
        { provide: EncryptionService, useValue: { decrypt: jest.fn() } },
      ],
    }).compile();

    service = module.get(KsefXmlService);
  });

  describe('generateInvoiceXml', () => {
    it('should generate valid XML with required FA(3) fields', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      // FA(3) namespace
      expect(xml).toContain('http://crd.gov.pl/wzor/2025/06/25/13775/');
      expect(xml).toContain('Faktura');
      expect(xml).toContain('KodFormularza');
      expect(xml).toContain('FA');
      // WariantFormularza must be 3 for FA(3)
      expect(xml).toContain('WariantFormularza');
      expect(xml).toMatch(/WariantFormularza[^<]*>3/);
      // Podmiot2 must have JST and GV
      expect(xml).toContain('<JST>');
      expect(xml).toContain('<GV>');
      // Fa must have RodzajFaktury
      expect(xml).toContain('RodzajFaktury');
      expect(xml).toContain('VAT');
      // Adnotacje must be present
      expect(xml).toContain('Adnotacje');
      // NIP fields
      expect(xml).toContain(company.nip);
      expect(xml).toContain(client.nip!);
    });

    it('should include line items in FaWiersz', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('FaWiersz');
      expect(xml).toContain('NrWierszaFa');
      expect(xml).toContain('Usługa programistyczna');
      expect(xml).toContain('P_7');
      expect(xml).toContain('P_8B');
    });

    it('should include VAT summary fields for 23% rate', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('P_13_1');
      expect(xml).toContain('P_14_1');
    });

    it('should include P_15 (gross amount)', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('P_15');
      expect(xml).toContain('1230.00');
    });

    it('should include currency code', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('KodWaluty');
      expect(xml).toContain('PLN');
    });

    it('should include invoice number in P_2', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('P_2');
      expect(xml).toContain('FV/2026/04/0001');
    });

    it('should include GTU codes when provided', () => {
      const invoice = createMockInvoice({
        lineItems: [
          {
            description: 'Usługa IT',
            quantity: 1,
            unit: 'szt.',
            unitNetPrice: 1000,
            netAmount: 1000,
            vatRate: 23,
            vatAmount: 230,
            grossAmount: 1230,
            gtuCodes: ['GTU_01', 'GTU_12'],
          },
        ],
      });
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('GTU');
      expect(xml).toContain('GTU_01,GTU_12');
    });

    it('should handle buyer without NIP', () => {
      const invoice = createMockInvoice({ buyerNip: null });
      const company = createMockCompany();

      const xml = service.generateInvoiceXml(invoice, company, {
        name: 'Consumer Client',
      });

      expect(xml).toContain('Consumer Client');
    });

    it('should map exempt (zw) VAT rate correctly', () => {
      const invoice = createMockInvoice({
        lineItems: [
          {
            description: 'Usługa zwolniona',
            quantity: 1,
            unit: 'szt.',
            unitNetPrice: 500,
            netAmount: 500,
            vatRate: -1, // exempt
            vatAmount: 0,
            grossAmount: 500,
          },
        ],
      });
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('zw');
    });

    it('should handle multiple VAT rates in same invoice', () => {
      const invoice = createMockInvoice({
        netAmount: 1500,
        vatAmount: 280,
        grossAmount: 1780,
        lineItems: [
          {
            description: 'Item 23%',
            quantity: 1,
            unitNetPrice: 1000,
            netAmount: 1000,
            vatRate: 23,
            vatAmount: 230,
            grossAmount: 1230,
          },
          {
            description: 'Item 5%',
            quantity: 1,
            unitNetPrice: 500,
            netAmount: 500,
            vatRate: 5,
            vatAmount: 25,
            grossAmount: 525,
          },
        ],
      });
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);

      expect(xml).toContain('P_13_1');
      expect(xml).toContain('P_13_3');
    });
  });

  describe('parseInvoiceXml', () => {
    it('should parse basic invoice fields from XML', () => {
      // Use the generate function to create valid XML, then parse it
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);
      const parsed = service.parseInvoiceXml(xml);

      expect(parsed.invoiceNumber).toBe('FV/2026/04/0001');
      expect(String(parsed.sellerNip)).toBe(company.nip);
      expect(parsed.buyerName).toBe('Test Client Sp. z o.o.');
      expect(parsed.currency).toBe('PLN');
      expect(parsed.lineItems.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse line items', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);
      const parsed = service.parseInvoiceXml(xml);

      expect(parsed.lineItems[0].description).toBe('Usługa programistyczna');
      expect(parsed.lineItems[0].vatRate).toBe(23);
    });

    it('should handle empty XML gracefully', () => {
      const parsed = service.parseInvoiceXml('<root/>');

      expect(parsed.invoiceNumber).toBe('');
      expect(parsed.lineItems).toEqual([]);
    });
  });

  describe('round-trip: generate then parse', () => {
    it('should preserve key invoice data through XML round-trip', () => {
      const invoice = createMockInvoice();
      const company = createMockCompany();
      const client = createMockClient();

      const xml = service.generateInvoiceXml(invoice, company, client);
      const parsed = service.parseInvoiceXml(xml);

      expect(parsed.invoiceNumber).toBe(invoice.invoiceNumber);
      expect(String(parsed.sellerNip)).toBe(company.nip);
      expect(parsed.buyerName).toBe(client.name);
      expect(parsed.currency).toBe('PLN');
    });
  });
});
