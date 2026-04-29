import { Injectable } from '@nestjs/common';

import { KsefInvoice, KsefInvoiceType } from '@accounting/common';

import { isValidPolishNip } from '../utils/nip-validator';

export interface KsefValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface KsefValidationResult {
  valid: boolean;
  issues: KsefValidationIssue[];
}

interface LineItem {
  description?: string;
  quantity?: number;
  unitNetPrice?: number;
  netAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  grossAmount?: number;
  gtuCodes?: string[];
}

const TOLERANCE = 0.01;

/** KSeF maximum invoice size without attachments: 1 MB (1 000 000 bytes) */
const MAX_INVOICE_SIZE_BYTES = 1_000_000;

/** Allowed VAT rates per KSeF FA(3) schema */
const ALLOWED_VAT_RATES = new Set([23, 8, 5, 0, -1, -2]);

@Injectable()
export class KsefInvoiceValidationService {
  validate(invoice: KsefInvoice): KsefValidationResult {
    const issues: KsefValidationIssue[] = [];
    const lineItems = this.parseLineItems(invoice.lineItems);

    this.validateRequiredFields(invoice, lineItems, issues);
    this.validateSellerNip(invoice, issues);
    this.validateBuyerNip(invoice, issues);
    this.validateDates(invoice, issues);
    this.validateVatRates(lineItems, issues);
    this.validateVatCalculations(lineItems, issues);
    this.validateTotals(invoice, lineItems, issues);
    this.validateGtuCodes(lineItems, issues);
    this.validateCurrency(invoice, issues);
    this.validateAddresses(invoice, issues);

    const hasErrors = issues.some((i) => i.severity === 'error');
    return { valid: !hasErrors, issues };
  }

  /**
   * Validate generated XML against KSeF technical requirements:
   * - size ≤ 1 MB (no attachments)
   * - UTF-8 without BOM
   * - no forbidden Unicode characters per XML W3C spec
   * - no processing instructions beyond the XML prolog
   */
  validateXml(xml: string): KsefValidationResult {
    const issues: KsefValidationIssue[] = [];
    this.validateXmlSizeInternal(xml, issues);
    this.validateXmlFormatInternal(xml, issues);
    const hasErrors = issues.some((i) => i.severity === 'error');
    return { valid: !hasErrors, issues };
  }

  /**
   * Validate XML size against KSeF limits.
   * Standalone method for use without format checks.
   */
  validateXmlSize(xml: string): KsefValidationResult {
    const issues: KsefValidationIssue[] = [];
    this.validateXmlSizeInternal(xml, issues);
    const hasErrors = issues.some((i) => i.severity === 'error');
    return { valid: !hasErrors, issues };
  }

  /**
   * Validate XML format (BOM, forbidden chars, processing instructions).
   * Standalone method for use without size checks.
   */
  validateXmlFormat(xml: string): KsefValidationResult {
    const issues: KsefValidationIssue[] = [];
    this.validateXmlFormatInternal(xml, issues);
    const hasErrors = issues.some((i) => i.severity === 'error');
    return { valid: !hasErrors, issues };
  }

  private parseLineItems(
    raw: Record<string, unknown>[] | null | undefined,
  ): LineItem[] {
    if (!raw) return [];
    return raw.map((item) => ({
      description: item.description as string | undefined,
      quantity: Number(item.quantity ?? 0),
      unitNetPrice: Number(item.unitNetPrice ?? 0),
      netAmount: Number(item.netAmount ?? 0),
      vatRate: Number(item.vatRate ?? 0),
      vatAmount: Number(item.vatAmount ?? 0),
      grossAmount: Number(item.grossAmount ?? 0),
      gtuCodes: item.gtuCodes as string[] | undefined,
    }));
  }

  private validateRequiredFields(
    invoice: KsefInvoice,
    lineItems: LineItem[],
    issues: KsefValidationIssue[],
  ): void {
    if (!invoice.issueDate) {
      issues.push({
        field: 'issueDate',
        code: 'ISSUE_DATE_REQUIRED',
        message: 'Data wystawienia jest wymagana',
        severity: 'error',
      });
    }

    if (!invoice.sellerNip) {
      issues.push({
        field: 'sellerNip',
        code: 'SELLER_NIP_REQUIRED',
        message: 'NIP sprzedawcy jest wymagany',
        severity: 'error',
      });
    }

    if (!invoice.buyerName) {
      issues.push({
        field: 'buyerName',
        code: 'BUYER_NAME_REQUIRED',
        message: 'Nazwa nabywcy jest wymagana',
        severity: 'error',
      });
    }

    if (lineItems.length === 0) {
      issues.push({
        field: 'lineItems',
        code: 'LINE_ITEMS_REQUIRED',
        message: 'Faktura musi zawierać co najmniej jedną pozycję',
        severity: 'error',
      });
    }

    if (invoice.invoiceType === KsefInvoiceType.CORRECTION) {
      if (!invoice.correctedInvoiceId) {
        issues.push({
          field: 'correctedInvoiceId',
          code: 'CORRECTED_INVOICE_REQUIRED',
          message: 'Faktura korygująca wymaga wskazania faktury korygowanej',
          severity: 'error',
        });
      }

      const reason = (invoice.metadata as Record<string, unknown>)
        ?.correctionReason;
      if (!reason) {
        issues.push({
          field: 'correctionReason',
          code: 'CORRECTION_REASON_REQUIRED',
          message: 'Przyczyna korekty jest wymagana dla faktury korygującej',
          severity: 'error',
        });
      }
    }
  }

  private validateSellerNip(
    invoice: KsefInvoice,
    issues: KsefValidationIssue[],
  ): void {
    if (invoice.sellerNip && !isValidPolishNip(invoice.sellerNip)) {
      issues.push({
        field: 'sellerNip',
        code: 'SELLER_NIP_CHECKSUM_INVALID',
        message: `NIP sprzedawcy ${invoice.sellerNip} ma nieprawidłową sumę kontrolną`,
        severity: 'error',
      });
    }
  }

  private validateBuyerNip(
    invoice: KsefInvoice,
    issues: KsefValidationIssue[],
  ): void {
    if (!invoice.buyerNip) {
      issues.push({
        field: 'buyerNip',
        code: 'BUYER_NIP_MISSING',
        message:
          'Brak NIP nabywcy — faktura zostanie wystawiona z oznaczeniem BrakID',
        severity: 'warning',
      });
      return;
    }

    if (!isValidPolishNip(invoice.buyerNip)) {
      issues.push({
        field: 'buyerNip',
        code: 'BUYER_NIP_CHECKSUM_INVALID',
        message: `NIP nabywcy ${invoice.buyerNip} ma nieprawidłową sumę kontrolną — faktura zostanie wystawiona z BrakID`,
        severity: 'warning',
      });
    }

    if (invoice.buyerNip === invoice.sellerNip) {
      issues.push({
        field: 'buyerNip',
        code: 'BUYER_SELLER_NIP_SAME',
        message: 'NIP nabywcy jest taki sam jak NIP sprzedawcy',
        severity: 'warning',
      });
    }
  }

  private validateDates(
    invoice: KsefInvoice,
    issues: KsefValidationIssue[],
  ): void {
    if (!invoice.issueDate) return;

    const issueDate =
      invoice.issueDate instanceof Date
        ? invoice.issueDate
        : new Date(invoice.issueDate);
    const now = new Date();
    const maxForwardDays = 60;
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxForwardDays);

    if (issueDate > maxDate) {
      issues.push({
        field: 'issueDate',
        code: 'ISSUE_DATE_TOO_FAR_FUTURE',
        message: `Data wystawienia nie może być dalej niż ${maxForwardDays} dni w przyszłość`,
        severity: 'error',
      });
    }

    if (invoice.dueDate) {
      const dueDate =
        invoice.dueDate instanceof Date
          ? invoice.dueDate
          : new Date(invoice.dueDate);
      if (dueDate < issueDate) {
        issues.push({
          field: 'dueDate',
          code: 'DUE_DATE_BEFORE_ISSUE_DATE',
          message: 'Termin płatności nie może być wcześniejszy niż data wystawienia',
          severity: 'error',
        });
      }
    }

    if (invoice.salesDate) {
      const salesDate =
        invoice.salesDate instanceof Date
          ? invoice.salesDate
          : new Date(invoice.salesDate);
      const monthDiff =
        (issueDate.getFullYear() - salesDate.getFullYear()) * 12 +
        (issueDate.getMonth() - salesDate.getMonth());
      if (Math.abs(monthDiff) > 1) {
        issues.push({
          field: 'salesDate',
          code: 'SALES_DATE_TOO_FAR_FROM_ISSUE',
          message:
            'Data sprzedaży powinna być w tym samym lub sąsiednim miesiącu co data wystawienia',
          severity: 'warning',
        });
      }
    }
  }

  private validateVatCalculations(
    lineItems: LineItem[],
    issues: KsefValidationIssue[],
  ): void {
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const prefix = `lineItems[${i}]`;

      // net = quantity * unitNetPrice
      const expectedNet = item.quantity! * item.unitNetPrice!;
      if (Math.abs(item.netAmount! - expectedNet) > TOLERANCE) {
        issues.push({
          field: `${prefix}.netAmount`,
          code: 'NET_AMOUNT_MISMATCH',
          message: `Pozycja ${i + 1}: kwota netto (${item.netAmount!.toFixed(2)}) nie zgadza się z ilość × cena (${expectedNet.toFixed(2)})`,
          severity: 'error',
        });
      }

      // VAT calculation
      if (item.vatRate! >= 0) {
        // Standard rates: 0, 5, 8, 23
        const expectedVat = item.netAmount! * item.vatRate! / 100;
        if (Math.abs(item.vatAmount! - expectedVat) > TOLERANCE) {
          issues.push({
            field: `${prefix}.vatAmount`,
            code: 'VAT_AMOUNT_MISMATCH',
            message: `Pozycja ${i + 1}: kwota VAT (${item.vatAmount!.toFixed(2)}) nie zgadza się z netto × stawka (${expectedVat.toFixed(2)})`,
            severity: 'error',
          });
        }
      } else {
        // Exempt (-1) and not-subject (-2): VAT must be 0
        if (Math.abs(item.vatAmount!) > TOLERANCE) {
          issues.push({
            field: `${prefix}.vatAmount`,
            code: 'EXEMPT_VAT_NOT_ZERO',
            message: `Pozycja ${i + 1}: kwota VAT powinna wynosić 0 dla stawki ${item.vatRate === -1 ? 'zwolnionej (zw)' : 'nie podlega (np)'}`,
            severity: 'error',
          });
        }
      }

      // gross = net + vat
      const expectedGross = item.netAmount! + item.vatAmount!;
      if (Math.abs(item.grossAmount! - expectedGross) > TOLERANCE) {
        issues.push({
          field: `${prefix}.grossAmount`,
          code: 'GROSS_AMOUNT_MISMATCH',
          message: `Pozycja ${i + 1}: kwota brutto (${item.grossAmount!.toFixed(2)}) nie zgadza się z netto + VAT (${expectedGross.toFixed(2)})`,
          severity: 'error',
        });
      }
    }
  }

  private validateTotals(
    invoice: KsefInvoice,
    lineItems: LineItem[],
    issues: KsefValidationIssue[],
  ): void {
    if (lineItems.length === 0) return;

    const sumNet = lineItems.reduce((s, i) => s + i.netAmount!, 0);
    const sumVat = lineItems.reduce((s, i) => s + i.vatAmount!, 0);
    const sumGross = lineItems.reduce((s, i) => s + i.grossAmount!, 0);

    if (Math.abs(Number(invoice.netAmount) - sumNet) > TOLERANCE) {
      issues.push({
        field: 'netAmount',
        code: 'TOTAL_NET_MISMATCH',
        message: `Suma netto faktury (${Number(invoice.netAmount).toFixed(2)}) nie zgadza się z sumą pozycji (${sumNet.toFixed(2)})`,
        severity: 'error',
      });
    }

    if (Math.abs(Number(invoice.vatAmount) - sumVat) > TOLERANCE) {
      issues.push({
        field: 'vatAmount',
        code: 'TOTAL_VAT_MISMATCH',
        message: `Suma VAT faktury (${Number(invoice.vatAmount).toFixed(2)}) nie zgadza się z sumą pozycji (${sumVat.toFixed(2)})`,
        severity: 'error',
      });
    }

    if (Math.abs(Number(invoice.grossAmount) - sumGross) > TOLERANCE) {
      issues.push({
        field: 'grossAmount',
        code: 'TOTAL_GROSS_MISMATCH',
        message: `Suma brutto faktury (${Number(invoice.grossAmount).toFixed(2)}) nie zgadza się z sumą pozycji (${sumGross.toFixed(2)})`,
        severity: 'error',
      });
    }
  }

  private validateGtuCodes(
    lineItems: LineItem[],
    issues: KsefValidationIssue[],
  ): void {
    const validPattern = /^GTU_(0[1-9]|1[0-3])$/;

    for (let i = 0; i < lineItems.length; i++) {
      const codes = lineItems[i].gtuCodes;
      if (!codes) continue;

      for (const code of codes) {
        if (!validPattern.test(code)) {
          issues.push({
            field: `lineItems[${i}].gtuCodes`,
            code: 'INVALID_GTU_CODE',
            message: `Pozycja ${i + 1}: nieprawidłowy kod GTU "${code}" (oczekiwany format: GTU_01 do GTU_13)`,
            severity: 'error',
          });
        }
      }
    }
  }

  private validateVatRates(
    lineItems: LineItem[],
    issues: KsefValidationIssue[],
  ): void {
    for (let i = 0; i < lineItems.length; i++) {
      const rate = lineItems[i].vatRate!;
      if (!ALLOWED_VAT_RATES.has(rate)) {
        issues.push({
          field: `lineItems[${i}].vatRate`,
          code: 'INVALID_VAT_RATE',
          message: `Pozycja ${i + 1}: niedozwolona stawka VAT ${rate}% — dozwolone: 23, 8, 5, 0, -1 (zw), -2 (np)`,
          severity: 'error',
        });
      }
    }
  }

  private validateXmlSizeInternal(
    xml: string,
    issues: KsefValidationIssue[],
  ): void {
    const sizeInBytes = Buffer.byteLength(xml, 'utf-8');
    if (sizeInBytes > MAX_INVOICE_SIZE_BYTES) {
      issues.push({
        field: 'xmlContent',
        code: 'XML_SIZE_EXCEEDED',
        message: `Rozmiar XML (${sizeInBytes.toLocaleString()} bajtów) przekracza limit KSeF (${MAX_INVOICE_SIZE_BYTES.toLocaleString()} bajtów)`,
        severity: 'error',
      });
    }
  }

  private validateXmlFormatInternal(
    xml: string,
    issues: KsefValidationIssue[],
  ): void {
    // UTF-8 BOM check
    if (xml.charCodeAt(0) === 0xfeff) {
      issues.push({
        field: 'xmlContent',
        code: 'XML_UTF8_BOM_DETECTED',
        message: 'XML zawiera znak BOM (UTF-8 BOM) — KSeF wymaga UTF-8 bez BOM',
        severity: 'error',
      });
    }

    // Forbidden Unicode characters per XML W3C spec
    // Ranges: [#x7F-#x84], [#x86-#x9F], [#xFDD0-#xFDEF], [#x1FFFE-#x1FFFF]...
    const forbiddenPattern = /[\x7F-\x84\x86-\x9F\uFDD0-\uFDEF\u{1FFFE}-\u{1FFFF}\u{2FFFE}-\u{2FFFF}\u{3FFFE}-\u{3FFFF}\u{4FFFE}-\u{4FFFF}\u{5FFFE}-\u{5FFFF}\u{6FFFE}-\u{6FFFF}\u{7FFFE}-\u{7FFFF}\u{8FFFE}-\u{8FFFF}\u{9FFFE}-\u{9FFFF}\u{AFFFE}-\u{AFFFF}\u{BFFFE}-\u{BFFFF}\u{CFFFE}-\u{CFFFF}\u{DFFFE}-\u{DFFFF}\u{EFFFE}-\u{EFFFF}\u{FFFFE}-\u{FFFFF}\u{10FFFE}-\u{10FFFF}]/u;
    if (forbiddenPattern.test(xml)) {
      issues.push({
        field: 'xmlContent',
        code: 'XML_FORBIDDEN_UNICODE_CHARS',
        message: 'XML zawiera niedozwolone znaki Unicode zgodnie ze specyfikacją XML W3C',
        severity: 'error',
      });
    }

    // Processing instructions (except the XML prolog <?xml ...?>)
    // Match <?...?> that is NOT the xml prolog at the start
    const piPattern = /<\?(?!xml\s)[^?]*\?>/;
    if (piPattern.test(xml)) {
      issues.push({
        field: 'xmlContent',
        code: 'XML_PROCESSING_INSTRUCTION_DETECTED',
        message: 'XML zawiera instrukcje przetwarzania (processing instructions) — KSeF tego nie akceptuje',
        severity: 'error',
      });
    }
  }

  private validateCurrency(
    invoice: KsefInvoice,
    issues: KsefValidationIssue[],
  ): void {
    if (invoice.currency && invoice.currency !== 'PLN') {
      issues.push({
        field: 'currency',
        code: 'FOREIGN_CURRENCY_EXCHANGE_RATE',
        message: `Faktura w walucie ${invoice.currency} — upewnij się, że kurs wymiany jest prawidłowy`,
        severity: 'warning',
      });
    }
  }

  private validateAddresses(
    invoice: KsefInvoice,
    issues: KsefValidationIssue[],
  ): void {
    // Buyer address check — client entity may lack address fields
    // The XML generator falls back to empty strings, which may cause KSeF rejection
    if (!invoice.buyerNip && !invoice.buyerName) {
      return; // Already flagged by validateRequiredFields
    }

    // Check if buyer has address data via metadata or client relation
    const metadata = invoice.metadata as Record<string, unknown> | null;
    const buyerData = metadata?.buyerData as
      | Record<string, unknown>
      | undefined;
    const client = invoice.client;

    const hasAddress =
      buyerData?.street ||
      buyerData?.city ||
      (client && 'street' in client && (client as Record<string, unknown>).street);

    if (!hasAddress) {
      issues.push({
        field: 'buyerAddress',
        code: 'BUYER_ADDRESS_MISSING',
        message:
          'Brak danych adresowych nabywcy — element Adres w Podmiot2 może być niekompletny',
        severity: 'warning',
      });
    }
  }
}
