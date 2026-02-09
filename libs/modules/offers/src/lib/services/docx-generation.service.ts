import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { Offer, OfferTemplate, RecipientSnapshot, type ContentBlock } from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';

import { DocxBlockRendererService } from './docx-block-renderer.service';
import {
  DocumentGenerationFailedException,
  DocumentTemplateInvalidException,
} from '../exceptions/offer.exception';

/**
 * Whitelist of allowed custom placeholder keys.
 * Only these keys can be provided via customPlaceholders to prevent
 * overwriting system placeholders with potentially malicious content.
 */
const ALLOWED_CUSTOM_PLACEHOLDER_KEYS: ReadonlySet<string> = new Set([
  // Custom business fields
  'custom_field_1',
  'custom_field_2',
  'custom_field_3',
  'custom_field_4',
  'custom_field_5',
  // Additional notes and descriptions
  'dodatkowe_informacje',
  'uwagi',
  'opis_dodatkowy',
  'warunki_specjalne',
  // Custom contact fields
  'kontakt_dodatkowy',
  'osoba_odpowiedzialna',
  // Custom dates
  'data_realizacji',
  'data_rozpoczecia',
  // Contract-specific fields
  'numer_umowy',
  'data_umowy',
  'imie_nazwisko',
  'zwrot_pan_pani',
  'zwrot_zwany_zwana',
  'miejsce_zawarcia',
  'nazwa_firmy_klienta',
  'adres_klienta',
  'nip_klienta',
  'regon_klienta',
]);

/**
 * System placeholder keys that MUST NOT be overwritten by custom placeholders.
 */
const SYSTEM_PLACEHOLDER_KEYS: ReadonlySet<string> = new Set([
  // Recipient data
  'nazwa',
  'nip',
  'regon',
  'adres',
  'ulica',
  'kod_pocztowy',
  'miasto',
  'kraj',
  'osoba_kontaktowa',
  'stanowisko',
  'email',
  'telefon',
  // Offer data
  'numer_oferty',
  'data_oferty',
  'wazna_do',
  'cena_netto',
  'stawka_vat',
  'cena_brutto',
  'kwota_vat',
  // Service items
  'pozycje_uslugi',
  'liczba_pozycji',
  'termin_platnosci',
  'forma_platnosci',
  'dodatkowe_warunki',
]);

@Injectable()
export class DocxGenerationService implements OnModuleInit {
  private readonly logger = new Logger(DocxGenerationService.name);

  // Instance properties for dependencies (makes testing/mocking easier)
  private docxtemplater: typeof import('docxtemplater') | null = null;
  private pizzip: typeof import('pizzip') | null = null;

  constructor(
    private readonly storageService: StorageService,
    private readonly blockRenderer: DocxBlockRendererService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadDependencies();
  }

  private async loadDependencies(): Promise<void> {
    try {
      this.docxtemplater = (await import('docxtemplater')).default;
      this.pizzip = (await import('pizzip')).default;
    } catch {
      this.logger.warn(
        'docxtemplater or pizzip not installed. DOCX generation will not be available.'
      );
    }
  }

  /**
   * DOCX files are ZIP archives with a specific magic number signature.
   * This validates the file header matches the PK ZIP format.
   */
  private isValidDocxMagicBytes(buffer: Buffer): boolean {
    // DOCX files are ZIP archives, which start with PK (0x50 0x4B)
    // followed by version info (0x03 0x04 for regular files, or 0x05 0x06 for empty archives)
    if (buffer.length < 4) {
      return false;
    }
    // Check for PK signature
    const isPkSignature = buffer[0] === 0x50 && buffer[1] === 0x4b;
    // Valid ZIP local file header or central directory signature
    const isValidZipVersion =
      (buffer[2] === 0x03 && buffer[3] === 0x04) || // Local file header
      (buffer[2] === 0x05 && buffer[3] === 0x06); // Empty archive (central directory)
    return isPkSignature && isValidZipVersion;
  }

  /**
   * Sanitizes a placeholder value to prevent template injection.
   * Uses context-aware XML escaping plus removal of template syntax characters.
   */
  private sanitizePlaceholderValue(value: string): string {
    // First escape XML special characters for safe DOCX embedding
    const sanitized = this.escapeXml(value);
    // Then remove template delimiters that could be used for injection
    return sanitized
      .replace(/\{\{/g, '')
      .replace(/\}\}/g, '')
      .replace(/\{%/g, '')
      .replace(/%\}/g, '')
      .replace(/\$\{/g, '') // JavaScript template literals
      .replace(/@\{/g, '') // Thymeleaf syntax
      .replace(/\[\[/g, '') // Thymeleaf inline expressions
      .replace(/\]\]/g, '');
  }

  /**
   * Validates and sanitizes custom placeholders.
   * Only allows whitelisted keys and ensures values don't contain template injection.
   */
  private validateCustomPlaceholders(
    customPlaceholders: Record<string, string>
  ): Record<string, string> {
    const validated: Record<string, string> = {};

    for (const [key, value] of Object.entries(customPlaceholders)) {
      // Skip if key is a system placeholder (security: prevent override)
      if (SYSTEM_PLACEHOLDER_KEYS.has(key)) {
        this.logger.warn(`Rejected attempt to override system placeholder: ${key}`);
        continue;
      }

      // Only allow whitelisted custom keys
      if (!ALLOWED_CUSTOM_PLACEHOLDER_KEYS.has(key)) {
        this.logger.warn(`Rejected unknown custom placeholder key: ${key}`);
        continue;
      }

      // Validate value type
      if (typeof value !== 'string') {
        this.logger.warn(`Rejected non-string value for placeholder: ${key}`);
        continue;
      }

      // Sanitize the value
      validated[key] = this.sanitizePlaceholderValue(value);
    }

    return validated;
  }

  /**
   * Formats a date to Polish format (DD.MM.YYYY)
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Formats a number to Polish currency format
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(amount);
  }

  /**
   * Builds full address from recipient snapshot
   */
  private buildFullAddress(recipient: RecipientSnapshot): string {
    const parts = [];
    if (recipient.street) parts.push(recipient.street);
    if (recipient.postalCode || recipient.city) {
      parts.push(`${recipient.postalCode || ''} ${recipient.city || ''}`.trim());
    }
    if (recipient.country && recipient.country !== 'Polska') {
      parts.push(recipient.country);
    }
    return parts.join(', ');
  }

  /**
   * Builds placeholder data from offer
   */
  buildPlaceholderData(
    offer: Offer,
    customPlaceholders?: Record<string, string>
  ): Record<string, string> {
    const recipient = offer.recipientSnapshot;
    const vatAmount = Number(offer.totalGrossAmount) - Number(offer.totalNetAmount);

    const data: Record<string, string> = {
      // Recipient data - sanitize all user-provided fields to prevent template injection
      nazwa: this.sanitizePlaceholderValue(recipient.name || ''),
      nip: this.sanitizePlaceholderValue(recipient.nip || ''),
      regon: this.sanitizePlaceholderValue(recipient.regon || ''),
      adres: this.sanitizePlaceholderValue(this.buildFullAddress(recipient)),
      ulica: this.sanitizePlaceholderValue(recipient.street || ''),
      kod_pocztowy: this.sanitizePlaceholderValue(recipient.postalCode || ''),
      miasto: this.sanitizePlaceholderValue(recipient.city || ''),
      kraj: this.sanitizePlaceholderValue(recipient.country || 'Polska'),
      osoba_kontaktowa: this.sanitizePlaceholderValue(recipient.contactPerson || ''),
      stanowisko: this.sanitizePlaceholderValue(recipient.contactPosition || ''),
      email: this.sanitizePlaceholderValue(recipient.email || ''),
      telefon: this.sanitizePlaceholderValue(recipient.phone || ''),

      // Offer data
      numer_oferty: offer.offerNumber,
      data_oferty: this.formatDate(offer.offerDate),
      wazna_do: this.formatDate(offer.validUntil),
      cena_netto: this.formatCurrency(Number(offer.totalNetAmount)),
      stawka_vat: `${offer.vatRate}%`,
      cena_brutto: this.formatCurrency(Number(offer.totalGrossAmount)),
      kwota_vat: this.formatCurrency(vatAmount),

      // Service items (if available)
      ...this.buildServiceItemsPlaceholders(offer),
    };

    // Merge validated custom placeholders (security: whitelist + sanitization)
    if (customPlaceholders) {
      const validatedPlaceholders = this.validateCustomPlaceholders(customPlaceholders);
      Object.assign(data, validatedPlaceholders);
    }

    return data;
  }

  /**
   * Builds placeholder data for service items
   */
  private buildServiceItemsPlaceholders(offer: Offer): Record<string, string> {
    const data: Record<string, string> = {};

    if (offer.serviceTerms?.items) {
      const items = offer.serviceTerms.items;

      // Build a simple table-like representation
      // Sanitize item names and units to prevent template injection
      const itemsList = items
        .map((item, index) => {
          const netAmount = item.unitPrice * item.quantity;
          const sanitizedName = this.sanitizePlaceholderValue(item.name || '');
          const sanitizedUnit = this.sanitizePlaceholderValue(item.unit || 'szt.');
          return `${index + 1}. ${sanitizedName} - ${item.quantity} ${sanitizedUnit} x ${this.formatCurrency(item.unitPrice)} = ${this.formatCurrency(netAmount)}`;
        })
        .join('\n');

      data['pozycje_uslugi'] = itemsList;
      data['liczba_pozycji'] = items.length.toString();

      // Payment terms - sanitize user-provided fields
      if (offer.serviceTerms.paymentTermDays) {
        data['termin_platnosci'] = `${offer.serviceTerms.paymentTermDays} dni`;
      }
      if (offer.serviceTerms.paymentMethod) {
        data['forma_platnosci'] = this.sanitizePlaceholderValue(offer.serviceTerms.paymentMethod);
      }
      if (offer.serviceTerms.additionalTerms) {
        data['dodatkowe_warunki'] = this.sanitizePlaceholderValue(
          offer.serviceTerms.additionalTerms
        );
      }
    }

    return data;
  }

  /**
   * Generates a DOCX document from a template
   */
  async generateFromTemplate(
    template: OfferTemplate,
    offer: Offer,
    customPlaceholders?: Record<string, string>
  ): Promise<Buffer> {
    if (!this.docxtemplater || !this.pizzip) {
      throw new DocumentGenerationFailedException(
        'Biblioteki do generowania dokumentów nie są zainstalowane'
      );
    }

    if (!template.templateFilePath) {
      throw new DocumentTemplateInvalidException('Szablon nie ma przypisanego pliku');
    }

    // Security: Validate file extension
    if (!template.templateFilePath.toLowerCase().endsWith('.docx')) {
      throw new DocumentTemplateInvalidException('Szablon musi być plikiem .docx');
    }

    try {
      // Download template file
      const templateBuffer = await this.storageService.downloadFile(template.templateFilePath);

      // Security: Prevent memory exhaustion from oversized templates
      // 10MB is more than sufficient for DOCX templates (typical size is <5MB)
      const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10MB
      if (templateBuffer.length > MAX_TEMPLATE_SIZE) {
        throw new DocumentTemplateInvalidException(
          `Szablon przekracza maksymalny dozwolony rozmiar (${MAX_TEMPLATE_SIZE / 1024 / 1024}MB)`
        );
      }

      // Security: Validate file is actually a DOCX (ZIP archive) via magic bytes
      if (!this.isValidDocxMagicBytes(templateBuffer)) {
        throw new DocumentTemplateInvalidException(
          'Plik nie jest prawidłowym dokumentem DOCX (nieprawidłowy format pliku)'
        );
      }

      // Load template
      const zip = new this.pizzip(templateBuffer);
      const doc = new this.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
      });

      // Build placeholder data
      const data = this.buildPlaceholderData(offer, customPlaceholders);

      // Render document
      doc.render(data);

      // Generate output
      const outputBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return outputBuffer;
    } catch (error) {
      this.logger.error('Error generating DOCX document', error);

      if (error instanceof Error) {
        throw new DocumentGenerationFailedException(error.message);
      }
      throw new DocumentGenerationFailedException('Nieznany błąd');
    }
  }

  /**
   * Generates a DOCX document from content blocks.
   * Delegates to DocxBlockRendererService.
   */
  generateFromBlocks(blocks: ContentBlock[], placeholderData?: Record<string, string>): Buffer {
    return this.blockRenderer.renderBlocksToDocx(blocks, placeholderData);
  }

  /**
   * Generates a plain text fallback when no template is available.
   * NOTE: This returns plain text content, NOT a DOCX file.
   * The caller should handle the file extension appropriately (e.g., .txt).
   *
   * @returns Buffer containing plain text content (UTF-8 encoded)
   */
  generatePlainTextFallback(offer: Offer): Buffer {
    // Sanitize all user-provided recipient data to prevent any potential injection
    const sanitizedName = this.sanitizePlaceholderValue(offer.recipientSnapshot.name || '');
    const sanitizedNip = this.sanitizePlaceholderValue(offer.recipientSnapshot.nip || '');
    const sanitizedEmail = this.sanitizePlaceholderValue(offer.recipientSnapshot.email || '');
    const sanitizedPhone = this.sanitizePlaceholderValue(offer.recipientSnapshot.phone || '');
    const sanitizedTitle = this.sanitizePlaceholderValue(offer.title || '');
    const sanitizedDescription = this.sanitizePlaceholderValue(offer.description || '');

    // Build sanitized address
    const sanitizedAddress = this.sanitizePlaceholderValue(
      this.buildFullAddress(offer.recipientSnapshot)
    );

    const content = `
OFERTA ${offer.offerNumber}

Data: ${this.formatDate(offer.offerDate)}
Ważna do: ${this.formatDate(offer.validUntil)}

ODBIORCA:
${sanitizedName}
${sanitizedNip ? `NIP: ${sanitizedNip}` : ''}
${sanitizedAddress}
${sanitizedEmail ? `Email: ${sanitizedEmail}` : ''}
${sanitizedPhone ? `Tel: ${sanitizedPhone}` : ''}

${sanitizedTitle}
${sanitizedDescription}

PODSUMOWANIE:
Kwota netto: ${this.formatCurrency(Number(offer.totalNetAmount))}
VAT (${offer.vatRate}%): ${this.formatCurrency(Number(offer.totalGrossAmount) - Number(offer.totalNetAmount))}
Kwota brutto: ${this.formatCurrency(Number(offer.totalGrossAmount))}
    `.trim();

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Generates a simple DOCX document without a template (fallback).
   * Uses docxtemplater with an embedded minimal template to create a proper DOCX file.
   *
   * @throws DocumentGenerationFailedException if docx libraries are not available
   */
  async generateSimpleDocument(offer: Offer): Promise<Buffer> {
    if (!this.docxtemplater || !this.pizzip) {
      this.logger.warn('DOCX libraries not available, falling back to plain text');
      // If DOCX generation isn't available, throw an error to let caller handle it
      throw new DocumentGenerationFailedException(
        'Biblioteki do generowania dokumentów nie są zainstalowane. Użyj generatePlainTextFallback() dla formatu tekstowego.'
      );
    }

    try {
      // Create a minimal DOCX structure using PizZip
      // A DOCX file is a ZIP archive with specific XML files
      const zip = new this.pizzip();

      // Create the minimal required structure for a DOCX file
      const contentXml = this.createMinimalDocxContent(offer);

      // Add required files to create valid DOCX
      zip.file('[Content_Types].xml', this.createContentTypesXml());
      zip.file('_rels/.rels', this.createRelsXml());
      zip.file('word/_rels/document.xml.rels', this.createDocumentRelsXml());
      zip.file('word/document.xml', contentXml);
      zip.file('word/styles.xml', this.createStylesXml());

      const outputBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return outputBuffer;
    } catch (error) {
      this.logger.error('Error generating simple DOCX document', error);
      throw new DocumentGenerationFailedException(
        error instanceof Error ? error.message : 'Nie udało się wygenerować dokumentu'
      );
    }
  }

  /**
   * Creates the [Content_Types].xml file required for DOCX
   */
  private createContentTypesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  }

  /**
   * Creates the _rels/.rels file required for DOCX
   */
  private createRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  /**
   * Creates the word/_rels/document.xml.rels file required for DOCX
   */
  private createDocumentRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  /**
   * Creates minimal styles.xml for DOCX
   */
  private createStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>
</w:styles>`;
  }

  /**
   * Escapes XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Creates a paragraph element for DOCX
   */
  private createParagraph(text: string, bold = false): string {
    const escapedText = this.escapeXml(text);
    const boldTag = bold ? '<w:b/>' : '';
    return `<w:p><w:r><w:rPr>${boldTag}</w:rPr><w:t>${escapedText}</w:t></w:r></w:p>`;
  }

  /**
   * Creates the main document content XML
   */
  private createMinimalDocxContent(offer: Offer): string {
    const vatAmount = Number(offer.totalGrossAmount) - Number(offer.totalNetAmount);
    const paragraphs: string[] = [];

    // Title
    paragraphs.push(this.createParagraph(`OFERTA ${offer.offerNumber}`, true));
    paragraphs.push(this.createParagraph(''));

    // Dates
    paragraphs.push(this.createParagraph(`Data: ${this.formatDate(offer.offerDate)}`));
    paragraphs.push(this.createParagraph(`Ważna do: ${this.formatDate(offer.validUntil)}`));
    paragraphs.push(this.createParagraph(''));

    // Recipient
    paragraphs.push(this.createParagraph('ODBIORCA:', true));
    paragraphs.push(this.createParagraph(offer.recipientSnapshot.name));
    if (offer.recipientSnapshot.nip) {
      paragraphs.push(this.createParagraph(`NIP: ${offer.recipientSnapshot.nip}`));
    }
    const address = this.buildFullAddress(offer.recipientSnapshot);
    if (address) {
      paragraphs.push(this.createParagraph(address));
    }
    if (offer.recipientSnapshot.email) {
      paragraphs.push(this.createParagraph(`Email: ${offer.recipientSnapshot.email}`));
    }
    if (offer.recipientSnapshot.phone) {
      paragraphs.push(this.createParagraph(`Tel: ${offer.recipientSnapshot.phone}`));
    }
    paragraphs.push(this.createParagraph(''));

    // Offer content
    paragraphs.push(this.createParagraph(offer.title, true));
    if (offer.description) {
      paragraphs.push(this.createParagraph(offer.description));
    }
    paragraphs.push(this.createParagraph(''));

    // Summary
    paragraphs.push(this.createParagraph('PODSUMOWANIE:', true));
    paragraphs.push(
      this.createParagraph(`Kwota netto: ${this.formatCurrency(Number(offer.totalNetAmount))}`)
    );
    paragraphs.push(
      this.createParagraph(`VAT (${offer.vatRate}%): ${this.formatCurrency(vatAmount)}`)
    );
    paragraphs.push(
      this.createParagraph(`Kwota brutto: ${this.formatCurrency(Number(offer.totalGrossAmount))}`)
    );

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n    ')}
  </w:body>
</w:document>`;
  }
}
