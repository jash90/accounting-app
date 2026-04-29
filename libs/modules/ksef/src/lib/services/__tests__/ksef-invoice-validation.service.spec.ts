import {
  KsefInvoice,
  KsefInvoiceDirection,
  KsefInvoiceStatus,
  KsefInvoiceType,
} from '@accounting/common';

import { KsefInvoiceValidationService } from '../ksef-invoice-validation.service';

describe('KsefInvoiceValidationService', () => {
  let service: KsefInvoiceValidationService;

  const createMockInvoice = (
    overrides: Partial<KsefInvoice> = {},
  ): KsefInvoice =>
    ({
      id: 'invoice-1',
      companyId: 'company-1',
      invoiceType: KsefInvoiceType.SALES,
      direction: KsefInvoiceDirection.OUTGOING,
      invoiceNumber: 'FV/2026/04/0001',
      status: KsefInvoiceStatus.DRAFT,
      issueDate: new Date('2026-04-10'),
      dueDate: new Date('2026-04-24'),
      sellerNip: '8191654690',
      sellerName: 'Test Company Sp. z o.o.',
      buyerNip: '1234563218',
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
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as KsefInvoice;

  beforeEach(() => {
    service = new KsefInvoiceValidationService();
  });

  // ── validate() — happy path ─────────────────────────────────────────

  describe('validate — valid invoice', () => {
    it('should return valid for a correct sales invoice', () => {
      const result = service.validate(createMockInvoice());

      expect(result.valid).toBe(true);
      // May have warnings (e.g. BUYER_ADDRESS_MISSING) but no errors
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('should return valid for an invoice without buyer NIP', () => {
      const result = service.validate(
        createMockInvoice({ buyerNip: null }),
      );

      expect(result.valid).toBe(true);
      // Warning about missing buyer NIP is OK
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });

  // ── validateRequiredFields ──────────────────────────────────────────

  describe('validateRequiredFields', () => {
    it('should error when issueDate is missing', () => {
      const result = service.validate(
        createMockInvoice({ issueDate: null as unknown as Date }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === 'ISSUE_DATE_REQUIRED' && i.severity === 'error',
        ),
      ).toBe(true);
    });

    it('should error when sellerNip is missing', () => {
      const result = service.validate(
        createMockInvoice({ sellerNip: '' }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === 'SELLER_NIP_REQUIRED' && i.severity === 'error',
        ),
      ).toBe(true);
    });

    it('should error when buyerName is missing', () => {
      const result = service.validate(
        createMockInvoice({ buyerName: '' }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === 'BUYER_NAME_REQUIRED' && i.severity === 'error',
        ),
      ).toBe(true);
    });

    it('should error when lineItems is empty', () => {
      const result = service.validate(
        createMockInvoice({ lineItems: [] }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === 'LINE_ITEMS_REQUIRED' && i.severity === 'error',
        ),
      ).toBe(true);
    });

    it('should error when lineItems is null', () => {
      const result = service.validate(
        createMockInvoice({ lineItems: null }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'LINE_ITEMS_REQUIRED'),
      ).toBe(true);
    });

    it('should error when correction invoice missing correctedInvoiceId', () => {
      const result = service.validate(
        createMockInvoice({
          invoiceType: KsefInvoiceType.CORRECTION,
          correctedInvoiceId: null,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'CORRECTED_INVOICE_REQUIRED'),
      ).toBe(true);
    });

    it('should error when correction invoice missing correctionReason', () => {
      const result = service.validate(
        createMockInvoice({
          invoiceType: KsefInvoiceType.CORRECTION,
          correctedInvoiceId: 'some-id',
          metadata: {},
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'CORRECTION_REASON_REQUIRED'),
      ).toBe(true);
    });

    it('should pass correction invoice with all required fields', () => {
      const result = service.validate(
        createMockInvoice({
          invoiceType: KsefInvoiceType.CORRECTION,
          correctedInvoiceId: 'some-id',
          metadata: { correctionReason: 'Błąd w kwocie' },
        }),
      );

      const correctionErrors = result.issues.filter(
        (i) =>
          i.code === 'CORRECTED_INVOICE_REQUIRED' ||
          i.code === 'CORRECTION_REASON_REQUIRED',
      );
      expect(correctionErrors).toHaveLength(0);
    });
  });

  // ── validateSellerNip ───────────────────────────────────────────────

  describe('validateSellerNip', () => {
    it('should error for seller NIP with invalid checksum', () => {
      const result = service.validate(
        createMockInvoice({ sellerNip: '1234567890' }), // invalid checksum
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'SELLER_NIP_CHECKSUM_INVALID'),
      ).toBe(true);
    });

    it('should pass for valid seller NIP', () => {
      const result = service.validate(
        createMockInvoice({ sellerNip: '8191654690' }),
      );

      expect(
        result.issues.some((i) => i.code === 'SELLER_NIP_CHECKSUM_INVALID'),
      ).toBe(false);
    });
  });

  // ── validateBuyerNip ────────────────────────────────────────────────

  describe('validateBuyerNip', () => {
    it('should warn when buyer NIP is missing', () => {
      const result = service.validate(
        createMockInvoice({ buyerNip: null }),
      );

      const buyerNipWarning = result.issues.find(
        (i) => i.code === 'BUYER_NIP_MISSING',
      );
      expect(buyerNipWarning).toBeDefined();
      expect(buyerNipWarning!.severity).toBe('warning');
    });

    it('should warn for buyer NIP with invalid checksum', () => {
      const result = service.validate(
        createMockInvoice({ buyerNip: '1234567890' }), // invalid checksum
      );

      const buyerNipIssue = result.issues.find(
        (i) => i.code === 'BUYER_NIP_CHECKSUM_INVALID',
      );
      expect(buyerNipIssue).toBeDefined();
      expect(buyerNipIssue!.severity).toBe('warning');
    });

    it('should warn when buyer NIP equals seller NIP', () => {
      const result = service.validate(
        createMockInvoice({
          sellerNip: '8191654690',
          buyerNip: '8191654690',
        }),
      );

      const sameNipIssue = result.issues.find(
        (i) => i.code === 'BUYER_SELLER_NIP_SAME',
      );
      expect(sameNipIssue).toBeDefined();
      expect(sameNipIssue!.severity).toBe('warning');
    });
  });

  // ── validateDates ───────────────────────────────────────────────────

  describe('validateDates', () => {
    it('should error when issueDate is more than 60 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const result = service.validate(
        createMockInvoice({ issueDate: futureDate }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'ISSUE_DATE_TOO_FAR_FUTURE'),
      ).toBe(true);
    });

    it('should pass when issueDate is within 60 days in the future', () => {
      const nearFuture = new Date();
      nearFuture.setDate(nearFuture.getDate() + 30);

      const result = service.validate(
        createMockInvoice({ issueDate: nearFuture }),
      );

      expect(
        result.issues.some((i) => i.code === 'ISSUE_DATE_TOO_FAR_FUTURE'),
      ).toBe(false);
    });

    it('should error when dueDate is before issueDate', () => {
      const result = service.validate(
        createMockInvoice({
          issueDate: new Date('2026-04-20'),
          dueDate: new Date('2026-04-10'),
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'DUE_DATE_BEFORE_ISSUE_DATE'),
      ).toBe(true);
    });

    it('should warn when salesDate is more than 1 month from issueDate', () => {
      const result = service.validate(
        createMockInvoice({
          issueDate: new Date('2026-06-10'),
          salesDate: new Date('2026-03-10'),
        }),
      );

      const salesDateIssue = result.issues.find(
        (i) => i.code === 'SALES_DATE_TOO_FAR_FROM_ISSUE',
      );
      expect(salesDateIssue).toBeDefined();
      expect(salesDateIssue!.severity).toBe('warning');
    });

    it('should pass when salesDate is within 1 month of issueDate', () => {
      const result = service.validate(
        createMockInvoice({
          issueDate: new Date('2026-04-10'),
          salesDate: new Date('2026-04-05'),
        }),
      );

      expect(
        result.issues.some(
          (i) => i.code === 'SALES_DATE_TOO_FAR_FROM_ISSUE',
        ),
      ).toBe(false);
    });
  });

  // ── validateVatCalculations ─────────────────────────────────────────

  describe('validateVatCalculations', () => {
    it('should error when net amount does not match qty × price', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Test',
              quantity: 10,
              unitNetPrice: 100,
              netAmount: 999, // should be 1000
              vatRate: 23,
              vatAmount: 230,
              grossAmount: 1229,
            },
          ],
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'NET_AMOUNT_MISMATCH'),
      ).toBe(true);
    });

    it('should error when VAT amount does not match net × rate', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Test',
              quantity: 1,
              unitNetPrice: 1000,
              netAmount: 1000,
              vatRate: 23,
              vatAmount: 200, // should be 230
              grossAmount: 1200,
            },
          ],
          netAmount: 1000,
          vatAmount: 200,
          grossAmount: 1200,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'VAT_AMOUNT_MISMATCH'),
      ).toBe(true);
    });

    it('should error when gross does not match net + vat', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Test',
              quantity: 1,
              unitNetPrice: 1000,
              netAmount: 1000,
              vatRate: 23,
              vatAmount: 230,
              grossAmount: 1500, // should be 1230
            },
          ],
          grossAmount: 1500,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'GROSS_AMOUNT_MISMATCH'),
      ).toBe(true);
    });

    it('should pass for correct exempt (zw) line item', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Usługa zwolniona',
              quantity: 1,
              unitNetPrice: 500,
              netAmount: 500,
              vatRate: -1,
              vatAmount: 0,
              grossAmount: 500,
            },
          ],
          netAmount: 500,
          vatAmount: 0,
          grossAmount: 500,
        }),
      );

      const vatErrors = result.issues.filter(
        (i) =>
          i.code === 'NET_AMOUNT_MISMATCH' ||
          i.code === 'VAT_AMOUNT_MISMATCH' ||
          i.code === 'GROSS_AMOUNT_MISMATCH' ||
          i.code === 'EXEMPT_VAT_NOT_ZERO',
      );
      expect(vatErrors).toHaveLength(0);
    });

    it('should pass for correct not-subject (np) line item', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Nie podlega',
              quantity: 1,
              unitNetPrice: 300,
              netAmount: 300,
              vatRate: -2,
              vatAmount: 0,
              grossAmount: 300,
            },
          ],
          netAmount: 300,
          vatAmount: 0,
          grossAmount: 300,
        }),
      );

      const vatErrors = result.issues.filter(
        (i) => i.code === 'EXEMPT_VAT_NOT_ZERO',
      );
      expect(vatErrors).toHaveLength(0);
    });

    it('should error when exempt item has non-zero VAT', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Zwolniona',
              quantity: 1,
              unitNetPrice: 500,
              netAmount: 500,
              vatRate: -1,
              vatAmount: 50, // should be 0 for exempt
              grossAmount: 550,
            },
          ],
          netAmount: 500,
          vatAmount: 50,
          grossAmount: 550,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'EXEMPT_VAT_NOT_ZERO'),
      ).toBe(true);
    });
  });

  // ── validateTotals ──────────────────────────────────────────────────

  describe('validateTotals', () => {
    it('should error when total net does not match sum of line items', () => {
      const result = service.validate(
        createMockInvoice({
          netAmount: 900, // line items sum to 1000
          vatAmount: 230,
          grossAmount: 1230,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'TOTAL_NET_MISMATCH'),
      ).toBe(true);
    });

    it('should error when total VAT does not match sum of line items', () => {
      const result = service.validate(
        createMockInvoice({
          netAmount: 1000,
          vatAmount: 100, // line items sum to 230
          grossAmount: 1230,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'TOTAL_VAT_MISMATCH'),
      ).toBe(true);
    });

    it('should error when total gross does not match sum of line items', () => {
      const result = service.validate(
        createMockInvoice({
          netAmount: 1000,
          vatAmount: 230,
          grossAmount: 2000, // line items sum to 1230
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'TOTAL_GROSS_MISMATCH'),
      ).toBe(true);
    });

    it('should skip totals validation when no line items', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [],
          netAmount: 1000,
        }),
      );

      // Should have LINE_ITEMS_REQUIRED but not TOTAL_*_MISMATCH
      expect(
        result.issues.some((i) => i.code.startsWith('TOTAL_')),
      ).toBe(false);
    });
  });

  // ── validateGtuCodes ────────────────────────────────────────────────

  describe('validateGtuCodes', () => {
    it('should pass for valid GTU codes', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Usługa IT',
              quantity: 1,
              unitNetPrice: 1000,
              netAmount: 1000,
              vatRate: 23,
              vatAmount: 230,
              grossAmount: 1230,
              gtuCodes: ['GTU_01', 'GTU_13'],
            },
          ],
        }),
      );

      expect(
        result.issues.some((i) => i.code === 'INVALID_GTU_CODE'),
      ).toBe(false);
    });

    it('should error for invalid GTU code format', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Usługa',
              quantity: 1,
              unitNetPrice: 1000,
              netAmount: 1000,
              vatRate: 23,
              vatAmount: 230,
              grossAmount: 1230,
              gtuCodes: ['GTU_14', 'INVALID'],
            },
          ],
        }),
      );

      expect(result.valid).toBe(false);
      const gtuErrors = result.issues.filter(
        (i) => i.code === 'INVALID_GTU_CODE',
      );
      expect(gtuErrors).toHaveLength(2);
    });

    it('should pass when no GTU codes present', () => {
      const result = service.validate(createMockInvoice());

      expect(
        result.issues.some((i) => i.code === 'INVALID_GTU_CODE'),
      ).toBe(false);
    });
  });

  // ── validateCurrency ────────────────────────────────────────────────

  describe('validateCurrency', () => {
    it('should warn for foreign currency', () => {
      const result = service.validate(
        createMockInvoice({ currency: 'EUR' }),
      );

      const currencyWarning = result.issues.find(
        (i) => i.code === 'FOREIGN_CURRENCY_EXCHANGE_RATE',
      );
      expect(currencyWarning).toBeDefined();
      expect(currencyWarning!.severity).toBe('warning');
    });

    it('should not warn for PLN', () => {
      const result = service.validate(
        createMockInvoice({ currency: 'PLN' }),
      );

      expect(
        result.issues.some(
          (i) => i.code === 'FOREIGN_CURRENCY_EXCHANGE_RATE',
        ),
      ).toBe(false);
    });
  });

  // ── validateVatRates ────────────────────────────────────────────────

  describe('validateVatRates', () => {
    it('should error for unsupported VAT rate 17', () => {
      const result = service.validate(
        createMockInvoice({
          lineItems: [
            {
              description: 'Test',
              quantity: 1,
              unitNetPrice: 100,
              netAmount: 100,
              vatRate: 17,
              vatAmount: 17,
              grossAmount: 117,
            },
          ],
          netAmount: 100,
          vatAmount: 17,
          grossAmount: 117,
        }),
      );

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'INVALID_VAT_RATE'),
      ).toBe(true);
    });

    it('should accept all standard VAT rates', () => {
      const rates = [23, 8, 5, 0, -1, -2];

      for (const rate of rates) {
        const vatAmount = rate > 0 ? 100 * rate / 100 : 0;
        const result = service.validate(
          createMockInvoice({
            lineItems: [
              {
                description: `Item @ ${rate}%`,
                quantity: 1,
                unitNetPrice: 100,
                netAmount: 100,
                vatRate: rate,
                vatAmount,
                grossAmount: 100 + vatAmount,
              },
            ],
            netAmount: 100,
            vatAmount,
            grossAmount: 100 + vatAmount,
          }),
        );

        expect(
          result.issues.some((i) => i.code === 'INVALID_VAT_RATE'),
        ).toBe(false);
      }
    });
  });

  // ── validateXmlSize ─────────────────────────────────────────────────

  describe('validateXmlSize', () => {
    it('should pass for XML under 1 MB', () => {
      const smallXml = '<?xml version="1.0" encoding="UTF-8"?><Faktura/>';
      const result = service.validateXmlSize(smallXml);

      expect(result.valid).toBe(true);
    });

    it('should error for XML over 1 MB', () => {
      // Create XML slightly over 1 MB
      const padding = 'x'.repeat(1_000_001);
      const largeXml = `<?xml version="1.0" encoding="UTF-8"?><Faktura>${padding}</Faktura>`;
      const result = service.validateXmlSize(largeXml);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'XML_SIZE_EXCEEDED'),
      ).toBe(true);
    });

    it('should report the actual size in the error message', () => {
      const padding = 'x'.repeat(1_000_001);
      const largeXml = `<?xml version="1.0"?><root>${padding}</root>`;
      const result = service.validateXmlSize(largeXml);

      const issue = result.issues.find((i) => i.code === 'XML_SIZE_EXCEEDED');
      expect(issue).toBeDefined();
      expect(issue!.message).toContain('bajtów');
    });
  });

  // ── validateXmlFormat ───────────────────────────────────────────────

  describe('validateXmlFormat', () => {
    it('should pass for valid UTF-8 XML without BOM', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><Faktura/>';
      const result = service.validateXmlFormat(xml);

      expect(result.valid).toBe(true);
    });

    it('should error for XML with UTF-8 BOM', () => {
      const bom = '\uFEFF';
      const xml = `${bom}<?xml version="1.0" encoding="UTF-8"?><Faktura/>`;
      const result = service.validateXmlFormat(xml);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'XML_UTF8_BOM_DETECTED'),
      ).toBe(true);
    });

    it('should error for processing instructions beyond prolog', () => {
      const xml =
        '<?xml version="1.0"?><Faktura><?target instruction?></Faktura>';
      const result = service.validateXmlFormat(xml);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some(
          (i) => i.code === 'XML_PROCESSING_INSTRUCTION_DETECTED',
        ),
      ).toBe(true);
    });

    it('should pass for XML with only prolog processing instruction', () => {
      const xml = '<?xml version="1.0"?><Faktura/>';
      const result = service.validateXmlFormat(xml);

      expect(result.valid).toBe(true);
    });

    it('should error for forbidden Unicode characters', () => {
      // #x7F-#x84 range (DEL + C1 control chars)
      const xml = `<?xml version="1.0"?><Faktura>\u007F</Faktura>`;
      const result = service.validateXmlFormat(xml);

      expect(result.valid).toBe(false);
      expect(
        result.issues.some((i) => i.code === 'XML_FORBIDDEN_UNICODE_CHARS'),
      ).toBe(true);
    });
  });

  // ── validateXml (combined) ──────────────────────────────────────────

  describe('validateXml', () => {
    it('should run both size and format checks', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><Faktura><Data>test</Data></Faktura>';
      const result = service.validateXml(xml);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should aggregate issues from both checks', () => {
      const bom = '\uFEFF';
      const padding = 'x'.repeat(1_000_001);
      const largeXmlWithBom = `${bom}<?xml version="1.0"?><root>${padding}</root>`;
      const result = service.validateXml(largeXmlWithBom);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(
        result.issues.some((i) => i.code === 'XML_UTF8_BOM_DETECTED'),
      ).toBe(true);
      expect(
        result.issues.some((i) => i.code === 'XML_SIZE_EXCEEDED'),
      ).toBe(true);
    });
  });
});
