import { Injectable, Logger } from '@nestjs/common';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { Company, Client, KsefInvoice } from '@accounting/common';
import { KsefXmlGenerationException } from '../exceptions';
import { KsefInvoiceLineItemDto } from '../dto';

export interface InvoiceBuyerData {
  name: string;
  nip?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface ParsedKsefInvoice {
  invoiceNumber: string;
  issueDate: string;
  sellerNip: string;
  sellerName: string;
  buyerNip?: string;
  buyerName: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  lineItems: KsefInvoiceLineItemDto[];
}

@Injectable()
export class KsefXmlService {
  private readonly logger = new Logger(KsefXmlService.name);

  private readonly xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
    processEntities: true,
  });

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });

  /**
   * Generate FA(3) XML for a sales invoice.
   * Schema: schemat_FA(3)_v1-0E.xsd
   */
  generateInvoiceXml(
    invoice: KsefInvoice,
    seller: Company,
    buyer: Client | InvoiceBuyerData,
  ): string {
    try {
      const lineItems = (invoice.lineItems ?? []) as unknown as KsefInvoiceLineItemDto[];
      const isClient = 'companyId' in buyer;

      const buyerData: InvoiceBuyerData = isClient
        ? {
            name: (buyer as Client).name,
            nip: (buyer as Client).nip,
            country: 'PL',
          }
        : (buyer as InvoiceBuyerData);

      // Build VAT rate summary from line items
      const vatSummary = this.buildVatSummary(lineItems);

      const fa3 = {
        '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
        Faktura: {
          '@_xmlns': 'http://crd.gov.pl/wzor/2023/06/29/12648/',
          '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          Naglowek: {
            KodFormularza: {
              '@_kodSystemowy': 'FA (3)',
              '@_wersjaSchemy': '1-0E',
              '#text': 'FA',
            },
            WariantFormularza: 1,
            DataWytworzeniaFa: new Date().toISOString().split('T')[0],
            SystemInfo: 'AppTax Accounting Platform',
          },
          Podmiot1: {
            DaneIdentyfikacyjne: {
              NIP: seller.nip,
              Nazwa: seller.name,
            },
            Adres: {
              KodKraju: 'PL',
              AdresL1: [seller.street, seller.buildingNumber, seller.apartmentNumber].filter(Boolean).join(' '),
              AdresL2: [seller.postalCode, seller.city].filter(Boolean).join(' '),
            },
          },
          Podmiot2: {
            DaneIdentyfikacyjne: {
              ...(buyerData.nip ? { NIP: buyerData.nip } : {}),
              Nazwa: buyerData.name,
            },
            Adres: {
              KodKraju: buyerData.country ?? 'PL',
              AdresL1: buyerData.street ?? '',
              AdresL2: [buyerData.postalCode, buyerData.city].filter(Boolean).join(' '),
            },
          },
          Fa: {
            KodWaluty: invoice.currency ?? 'PLN',
            P_1: invoice.issueDate instanceof Date
              ? invoice.issueDate.toISOString().split('T')[0]
              : String(invoice.issueDate),
            P_2: invoice.invoiceNumber,
            ...(invoice.dueDate ? {
              P_6: invoice.dueDate instanceof Date
                ? invoice.dueDate.toISOString().split('T')[0]
                : String(invoice.dueDate),
            } : {}),
            // VAT summary by rate
            ...this.buildVatFields(vatSummary),
            P_15: Number(invoice.grossAmount).toFixed(2),
            // Line items
            FaWiersz: lineItems.map((item, idx) => ({
              NrWierszaFa: idx + 1,
              P_7: item.description,
              P_8A: item.unit ?? 'szt.',
              P_8B: item.quantity,
              P_9A: Number(item.unitNetPrice).toFixed(2),
              P_11: Number(item.netAmount).toFixed(2),
              P_11A: Number(item.netAmount).toFixed(2),
              P_12: this.mapVatRate(item.vatRate),
              ...(item.gtuCodes?.length ? { GTU: item.gtuCodes.join(',') } : {}),
            })),
          },
        },
      };

      return this.xmlBuilder.build(fa3);
    } catch (error) {
      this.logger.error(`XML generation failed: ${error}`);
      throw new KsefXmlGenerationException();
    }
  }

  /**
   * Parse KSeF invoice XML to extract data.
   */
  parseInvoiceXml(xml: string): ParsedKsefInvoice {
    const parsed = this.xmlParser.parse(xml);
    const faktura = parsed.Faktura ?? parsed['Faktura'];
    const fa = faktura?.Fa;
    const podmiot1 = faktura?.Podmiot1;
    const podmiot2 = faktura?.Podmiot2;

    return {
      invoiceNumber: fa?.P_2 ?? '',
      issueDate: fa?.P_1 ?? '',
      sellerNip: podmiot1?.DaneIdentyfikacyjne?.NIP ?? '',
      sellerName: podmiot1?.DaneIdentyfikacyjne?.Nazwa ?? '',
      buyerNip: podmiot2?.DaneIdentyfikacyjne?.NIP,
      buyerName: podmiot2?.DaneIdentyfikacyjne?.Nazwa ?? '',
      netAmount: parseFloat(fa?.P_11 ?? '0'),
      vatAmount: parseFloat(String(Number(fa?.P_15 ?? 0) - Number(fa?.P_11 ?? 0))),
      grossAmount: parseFloat(fa?.P_15 ?? '0'),
      currency: fa?.KodWaluty ?? 'PLN',
      lineItems: this.parseLineItems(fa?.FaWiersz),
    };
  }

  private buildVatSummary(items: KsefInvoiceLineItemDto[]): Map<number, { net: number; vat: number }> {
    const summary = new Map<number, { net: number; vat: number }>();
    for (const item of items) {
      const existing = summary.get(item.vatRate) ?? { net: 0, vat: 0 };
      existing.net += Number(item.netAmount);
      existing.vat += Number(item.vatAmount);
      summary.set(item.vatRate, existing);
    }
    return summary;
  }

  private buildVatFields(summary: Map<number, { net: number; vat: number }>): Record<string, string> {
    const fields: Record<string, string> = {};
    // Map standard Polish VAT rates to FA(3) fields
    // P_13_1 = net at 23%, P_14_1 = vat at 23%
    // P_13_2 = net at 8%, P_14_2 = vat at 8%
    // P_13_3 = net at 5%, P_14_3 = vat at 5%
    // P_13_6 = net at 0%
    const rateFieldMap: Record<number, [string, string]> = {
      23: ['P_13_1', 'P_14_1'],
      8: ['P_13_2', 'P_14_2'],
      5: ['P_13_3', 'P_14_3'],
      0: ['P_13_6', 'P_13_6'], // 0% only has net field
    };

    for (const [rate, amounts] of summary) {
      const fieldPair = rateFieldMap[rate];
      if (fieldPair) {
        fields[fieldPair[0]] = amounts.net.toFixed(2);
        if (rate > 0) {
          fields[fieldPair[1]] = amounts.vat.toFixed(2);
        }
      }
    }
    return fields;
  }

  private mapVatRate(rate: number): string {
    if (rate === 23) return '23';
    if (rate === 8) return '8';
    if (rate === 5) return '5';
    if (rate === 0) return '0';
    if (rate === -1) return 'zw'; // zwolniony (exempt)
    if (rate === -2) return 'np'; // nie podlega (not subject)
    return String(rate);
  }

  private parseLineItems(wiersze: unknown): KsefInvoiceLineItemDto[] {
    if (!wiersze) return [];
    const items = Array.isArray(wiersze) ? wiersze : [wiersze];
    return items.map(w => ({
      description: w.P_7 ?? '',
      quantity: Number(w.P_8B ?? 0),
      unit: w.P_8A ?? 'szt.',
      unitNetPrice: Number(w.P_9A ?? 0),
      netAmount: Number(w.P_11 ?? 0),
      vatRate: this.parseVatRate(w.P_12),
      vatAmount: Number(w.P_11A ?? 0) - Number(w.P_11 ?? 0),
      grossAmount: Number(w.P_11A ?? 0),
    }));
  }

  private parseVatRate(p12: unknown): number {
    const str = String(p12);
    if (str === 'zw') return -1;
    if (str === 'np') return -2;
    return parseInt(str, 10) || 0;
  }
}
