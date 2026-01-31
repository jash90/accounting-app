import { Injectable, Logger } from '@nestjs/common';

import { Offer, OfferTemplate, RecipientSnapshot } from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';

import {
  DocumentGenerationFailedException,
  DocumentTemplateInvalidException,
} from '../exceptions/offer.exception';

// Import will be dynamically loaded
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let Docxtemplater: typeof import('docxtemplater') | undefined;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let PizZip: typeof import('pizzip') | undefined;

@Injectable()
export class DocxGenerationService {
  private readonly logger = new Logger(DocxGenerationService.name);

  constructor(private readonly storageService: StorageService) {
    // Dynamically import docxtemplater and pizzip
    this.loadDependencies();
  }

  private async loadDependencies(): Promise<void> {
    try {
      Docxtemplater = (await import('docxtemplater')).default;
      PizZip = (await import('pizzip')).default;
    } catch {
      this.logger.warn(
        'docxtemplater or pizzip not installed. DOCX generation will not be available.'
      );
    }
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
      // Recipient data
      nazwa: recipient.name || '',
      nip: recipient.nip || '',
      regon: recipient.regon || '',
      adres: this.buildFullAddress(recipient),
      ulica: recipient.street || '',
      kod_pocztowy: recipient.postalCode || '',
      miasto: recipient.city || '',
      kraj: recipient.country || 'Polska',
      osoba_kontaktowa: recipient.contactPerson || '',
      stanowisko: recipient.contactPosition || '',
      email: recipient.email || '',
      telefon: recipient.phone || '',

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

    // Merge custom placeholders
    if (customPlaceholders) {
      Object.assign(data, customPlaceholders);
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
      const itemsList = items
        .map((item, index) => {
          const netAmount = item.unitPrice * item.quantity;
          return `${index + 1}. ${item.name} - ${item.quantity} ${item.unit || 'szt.'} x ${this.formatCurrency(item.unitPrice)} = ${this.formatCurrency(netAmount)}`;
        })
        .join('\n');

      data['pozycje_uslugi'] = itemsList;
      data['liczba_pozycji'] = items.length.toString();

      // Payment terms
      if (offer.serviceTerms.paymentTermDays) {
        data['termin_platnosci'] = `${offer.serviceTerms.paymentTermDays} dni`;
      }
      if (offer.serviceTerms.paymentMethod) {
        data['forma_platnosci'] = offer.serviceTerms.paymentMethod;
      }
      if (offer.serviceTerms.additionalTerms) {
        data['dodatkowe_warunki'] = offer.serviceTerms.additionalTerms;
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
    if (!Docxtemplater || !PizZip) {
      throw new DocumentGenerationFailedException(
        'Biblioteki do generowania dokumentów nie są zainstalowane'
      );
    }

    if (!template.templateFilePath) {
      throw new DocumentTemplateInvalidException('Szablon nie ma przypisanego pliku');
    }

    try {
      // Download template file
      const templateBuffer = await this.storageService.downloadFile(template.templateFilePath);

      // Load template
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
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
   * Generates a simple DOCX document without a template (fallback)
   */
  async generateSimpleDocument(offer: Offer): Promise<Buffer> {
    // For now, use a basic text approach
    // In production, you'd want to use the 'docx' library for more control

    const content = `
OFERTA ${offer.offerNumber}

Data: ${this.formatDate(offer.offerDate)}
Ważna do: ${this.formatDate(offer.validUntil)}

ODBIORCA:
${offer.recipientSnapshot.name}
${offer.recipientSnapshot.nip ? `NIP: ${offer.recipientSnapshot.nip}` : ''}
${this.buildFullAddress(offer.recipientSnapshot)}
${offer.recipientSnapshot.email ? `Email: ${offer.recipientSnapshot.email}` : ''}
${offer.recipientSnapshot.phone ? `Tel: ${offer.recipientSnapshot.phone}` : ''}

${offer.title}
${offer.description || ''}

PODSUMOWANIE:
Kwota netto: ${this.formatCurrency(Number(offer.totalNetAmount))}
VAT (${offer.vatRate}%): ${this.formatCurrency(Number(offer.totalGrossAmount) - Number(offer.totalNetAmount))}
Kwota brutto: ${this.formatCurrency(Number(offer.totalGrossAmount))}
    `.trim();

    // For a minimal implementation, return a text file
    // In production, use the 'docx' library to create proper DOCX
    return Buffer.from(content, 'utf-8');
  }
}
