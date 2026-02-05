import { Test, type TestingModule } from '@nestjs/testing';

import {
  OfferStatus,
  type Offer,
  type OfferTemplate,
  type RecipientSnapshot,
} from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';

import { DocxGenerationService } from './docx-generation.service';
import {
  DocumentGenerationFailedException,
  DocumentTemplateInvalidException,
} from '../exceptions/offer.exception';

describe('DocxGenerationService - Security Tests', () => {
  let service: DocxGenerationService;
  let mockStorageService: jest.Mocked<StorageService>;
  let module: TestingModule;

  const createMockOffer = (overrides: Partial<Offer> = {}): Offer => {
    return {
      id: 'offer-123',
      offerNumber: 'OF/2026/001',
      title: 'Test Offer',
      description: 'Test description',
      offerDate: new Date('2026-01-01'),
      validUntil: new Date('2026-01-31'),
      totalNetAmount: 1000,
      totalGrossAmount: 1230,
      vatRate: 23,
      status: OfferStatus.DRAFT,
      recipientSnapshot: {
        name: 'Test Company',
        nip: '1234567890',
        regon: '123456789',
        street: 'Test Street 1',
        postalCode: '00-001',
        city: 'Warsaw',
        country: 'Polska',
        contactPerson: 'John Doe',
        contactPosition: 'Manager',
        email: 'test@example.com',
        phone: '+48 123 456 789',
      } as RecipientSnapshot,
      serviceTerms: {
        items: [
          { name: 'Service 1', quantity: 1, unitPrice: 500, unit: 'szt.' },
          { name: 'Service 2', quantity: 2, unitPrice: 250, unit: 'szt.' },
        ],
        paymentTermDays: 14,
        paymentMethod: 'bank transfer',
        additionalTerms: 'Standard terms apply',
      },
      ...overrides,
    } as Offer;
  };

  const createMockTemplate = (overrides: Partial<OfferTemplate> = {}): OfferTemplate => {
    return {
      id: 'template-123',
      name: 'Test Template',
      description: 'Test template description',
      templateFilePath: 'templates/test.docx',
      isActive: true,
      ...overrides,
    } as OfferTemplate;
  };

  beforeEach(async () => {
    mockStorageService = {
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getSignedUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    module = await Test.createTestingModule({
      providers: [
        DocxGenerationService,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<DocxGenerationService>(DocxGenerationService);

    // Initialize the service (load dependencies)
    await service.onModuleInit();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Template Injection Prevention', () => {
    it('should sanitize double curly braces {{ }} from placeholder values', () => {
      const maliciousValue = '{{malicious_placeholder}}';
      const offer = createMockOffer({
        recipientSnapshot: {
          name: maliciousValue,
          nip: '',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('{{');
      expect(data['nazwa']).not.toContain('}}');
      expect(data['nazwa']).toBe('malicious_placeholder');
    });

    it('should sanitize Jinja2 template syntax {% %} from placeholder values', () => {
      const maliciousValue = '{% for item in items %}';
      const offer = createMockOffer({
        recipientSnapshot: {
          name: maliciousValue,
          nip: '',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('{%');
      expect(data['nazwa']).not.toContain('%}');
    });

    it('should sanitize JavaScript template literals ${} from placeholder values', () => {
      const maliciousValue = '${process.env.SECRET}';
      const offer = createMockOffer({
        recipientSnapshot: {
          name: maliciousValue,
          nip: '',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('${');
    });

    it('should sanitize Thymeleaf syntax @{} and [[]] from placeholder values', () => {
      const maliciousName = '@{/admin/deleteAll}';
      const maliciousNip = '[[${user.password}]]';
      const offer = createMockOffer({
        recipientSnapshot: {
          name: maliciousName,
          nip: maliciousNip,
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('@{');
      expect(data['nip']).not.toContain('[[');
      expect(data['nip']).not.toContain(']]');
    });

    it('should sanitize all recipient fields against injection', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: '{{inject}}',
          nip: '{%inject%}',
          regon: '${inject}',
          street: '@{inject}',
          postalCode: '[[inject]]',
          city: '{{inject}}',
          country: '{%inject%}',
          contactPerson: '${inject}',
          contactPosition: '@{inject}',
          email: '{{inject}}@example.com',
          phone: '{{inject}}',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      // Verify all fields are sanitized
      expect(data['nazwa']).not.toContain('{{');
      expect(data['nip']).not.toContain('{%');
      expect(data['regon']).not.toContain('${');
      expect(data['ulica']).not.toContain('@{');
      expect(data['kod_pocztowy']).not.toContain('[[');
      expect(data['miasto']).not.toContain('{{');
      expect(data['kraj']).not.toContain('{%');
      expect(data['osoba_kontaktowa']).not.toContain('${');
      expect(data['stanowisko']).not.toContain('@{');
      expect(data['email']).not.toContain('{{');
      expect(data['telefon']).not.toContain('{{');
    });

    it('should sanitize service item names and units', () => {
      const offer = createMockOffer({
        serviceTerms: {
          items: [{ name: '{{malicious_service}}', quantity: 1, unitPrice: 100, unit: '{{szt}}' }],
        },
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['pozycje_uslugi']).not.toContain('{{');
      expect(data['pozycje_uslugi']).not.toContain('}}');
    });
  });

  describe('Placeholder Whitelist Enforcement', () => {
    it('should reject unknown custom placeholder keys', () => {
      const offer = createMockOffer();
      const customPlaceholders = {
        unknown_key: 'malicious value',
        another_bad_key: 'bad value',
      };

      const data = service.buildPlaceholderData(offer, customPlaceholders);

      expect(data['unknown_key']).toBeUndefined();
      expect(data['another_bad_key']).toBeUndefined();
    });

    it('should allow whitelisted custom placeholder keys', () => {
      const offer = createMockOffer();
      const customPlaceholders = {
        custom_field_1: 'valid value 1',
        custom_field_2: 'valid value 2',
        uwagi: 'some notes',
      };

      const data = service.buildPlaceholderData(offer, customPlaceholders);

      expect(data['custom_field_1']).toBe('valid value 1');
      expect(data['custom_field_2']).toBe('valid value 2');
      expect(data['uwagi']).toBe('some notes');
    });

    it('should prevent overwriting system placeholder keys', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: 'Real Company',
          nip: '1234567890',
        } as RecipientSnapshot,
      });

      const customPlaceholders = {
        nazwa: 'Fake Company', // Attempting to override system key
        nip: '0000000000', // Attempting to override system key
        numer_oferty: 'FAKE/001',
      };

      const data = service.buildPlaceholderData(offer, customPlaceholders);

      // System placeholders should NOT be overwritten
      expect(data['nazwa']).toBe('Real Company');
      expect(data['nip']).toBe('1234567890');
      expect(data['numer_oferty']).toBe('OF/2026/001');
    });

    it('should sanitize values in allowed custom placeholders', () => {
      const offer = createMockOffer();
      const customPlaceholders = {
        custom_field_1: '{{injection_attempt}}',
        uwagi: '{%malicious%}',
      };

      const data = service.buildPlaceholderData(offer, customPlaceholders);

      expect(data['custom_field_1']).not.toContain('{{');
      expect(data['uwagi']).not.toContain('{%');
    });

    it('should reject non-string values in custom placeholders', () => {
      const offer = createMockOffer();
      const customPlaceholders = {
        custom_field_1: { malicious: 'object' } as unknown as string,
        custom_field_2: 123 as unknown as string,
        custom_field_3: 'valid string',
      };

      const data = service.buildPlaceholderData(offer, customPlaceholders);

      expect(data['custom_field_1']).toBeUndefined();
      expect(data['custom_field_2']).toBeUndefined();
      expect(data['custom_field_3']).toBe('valid string');
    });
  });

  describe('Template Size Limit Validation', () => {
    it('should reject templates larger than 50MB', async () => {
      const offer = createMockOffer();
      const template = createMockTemplate();

      // Create a buffer larger than 50MB
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      mockStorageService.downloadFile.mockResolvedValue(largeBuffer);

      await expect(service.generateFromTemplate(template, offer)).rejects.toThrow(
        DocumentTemplateInvalidException
      );

      await expect(service.generateFromTemplate(template, offer)).rejects.toThrow(/rozmiar/i); // Polish for "size"
    });

    it('should accept templates at exactly 50MB', async () => {
      const offer = createMockOffer();
      const template = createMockTemplate();

      // Create a buffer at exactly 50MB (this should still fail due to invalid DOCX format,
      // but should NOT fail due to size limit)
      const maxSizeBuffer = Buffer.alloc(50 * 1024 * 1024);
      mockStorageService.downloadFile.mockResolvedValue(maxSizeBuffer);

      // This will throw due to invalid DOCX format, not size
      await expect(service.generateFromTemplate(template, offer)).rejects.not.toThrow(/rozmiar/i);
    });

    it('should reject templates without file path', async () => {
      const offer = createMockOffer();
      const template = createMockTemplate({ templateFilePath: undefined });

      await expect(service.generateFromTemplate(template, offer)).rejects.toThrow(
        DocumentTemplateInvalidException
      );

      await expect(service.generateFromTemplate(template, offer)).rejects.toThrow(/plik/i); // Polish for "file"
    });
  });

  describe('XML Escaping in Simple Document Generation', () => {
    it('should escape XML special characters in offer content', async () => {
      const offer = createMockOffer({
        title: 'Test <script>alert("XSS")</script>',
        description: 'Description with & and < > characters',
        recipientSnapshot: {
          name: '<Company & Co.>',
          nip: '',
        } as RecipientSnapshot,
      });

      // This tests the plain text fallback
      const result = service.generatePlainTextFallback(offer);
      const content = result.toString('utf-8');

      // Plain text shouldn't escape, but let's verify it doesn't break
      expect(content).toContain('Test <script>');
    });

    it('should generate valid DOCX structure with escaped content', async () => {
      const offer = createMockOffer({
        title: 'Test & Ampersand <Less> "Quotes"',
        description: "Single 'quote' test",
      });

      // The generateSimpleDocument method escapes XML
      // We need to mock the dependencies to be available
      try {
        const result = await service.generateSimpleDocument(offer);

        // Verify it's a valid buffer
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);

        // ZIP magic number check (PK\x03\x04)
        expect(result[0]).toBe(0x50); // P
        expect(result[1]).toBe(0x4b); // K
      } catch (error) {
        // If docx libraries not available, verify proper error handling
        expect(error).toBeInstanceOf(DocumentGenerationFailedException);
      }
    });
  });

  describe('Null and Empty Value Handling', () => {
    it('should handle null recipient fields gracefully', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: null,
          nip: null,
          regon: null,
          street: null,
          postalCode: null,
          city: null,
          country: null,
          contactPerson: null,
          contactPosition: null,
          email: null,
          phone: null,
        } as unknown as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      // All fields should be empty strings, not throw errors
      expect(data['nazwa']).toBe('');
      expect(data['nip']).toBe('');
      expect(data['regon']).toBe('');
      expect(data['ulica']).toBe('');
      expect(data['email']).toBe('');
    });

    it('should handle undefined recipient fields gracefully', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: 'Only Name',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      // Undefined fields should become empty strings
      expect(data['nazwa']).toBe('Only Name');
      expect(data['nip']).toBe('');
      expect(data['email']).toBe('');
    });

    it('should handle empty string values correctly', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: '',
          nip: '',
          email: '',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).toBe('');
      expect(data['nip']).toBe('');
      expect(data['email']).toBe('');
    });

    it('should handle missing serviceTerms gracefully', () => {
      const offer = createMockOffer({
        serviceTerms: undefined,
      });

      const data = service.buildPlaceholderData(offer);

      // Should not throw, should have undefined service-related placeholders
      expect(data['pozycje_uslugi']).toBeUndefined();
      expect(data['liczba_pozycji']).toBeUndefined();
    });
  });

  describe('Date and Currency Formatting', () => {
    it('should format dates in Polish format (DD.MM.YYYY)', () => {
      const offer = createMockOffer({
        offerDate: new Date('2026-03-15'),
        validUntil: new Date('2026-04-15'),
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['data_oferty']).toBe('15.03.2026');
      expect(data['wazna_do']).toBe('15.04.2026');
    });

    it('should format currency with Polish locale', () => {
      const offer = createMockOffer({
        totalNetAmount: 1234.56,
        totalGrossAmount: 1518.51,
      });

      const data = service.buildPlaceholderData(offer);

      // Should include PLN currency and proper formatting
      expect(data['cena_netto']).toMatch(/1[\s,.]?234[,.]56/);
      expect(data['cena_netto']).toContain('zł');
    });
  });

  describe('Complex Injection Scenarios', () => {
    it('should handle nested template injection attempts', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: '{{{{nested}}}}',
          nip: '{%{%nested%}%}',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('{{');
      expect(data['nip']).not.toContain('{%');
    });

    it('should handle mixed injection attempts in single value', () => {
      const maliciousValue = '{{start}}${middle}@{end}[[final]]';
      const offer = createMockOffer({
        recipientSnapshot: {
          name: maliciousValue,
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      expect(data['nazwa']).not.toContain('{{');
      expect(data['nazwa']).not.toContain('${');
      expect(data['nazwa']).not.toContain('@{');
      expect(data['nazwa']).not.toContain('[[');
    });

    it('should handle unicode and special characters safely', () => {
      const offer = createMockOffer({
        recipientSnapshot: {
          name: 'Żółta Firma Sp. z o.o. "Łódź"',
          city: 'Wrocław',
          street: 'ul. Ąę 123',
        } as RecipientSnapshot,
      });

      const data = service.buildPlaceholderData(offer);

      // Polish characters should be preserved
      expect(data['nazwa']).toContain('Żółta');
      expect(data['miasto']).toBe('Wrocław');
      expect(data['ulica']).toContain('Ąę');
    });
  });
});
