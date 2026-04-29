import { Injectable, Logger } from '@nestjs/common';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { Company, Client, KsefInvoice } from '@accounting/common';
import { KsefXmlGenerationException } from '../exceptions';
import { KsefInvoiceLineItemDto } from '../dto';
import { isValidPolishNip as isValidPolishNipUtil } from '../utils/nip-validator';

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
  /**
   * FA(3) XML namespace — must match schemat_FA(3)_v1-0E.xsd
   */
  private static readonly FA3_NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
  private static readonly ETD_NS = 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/';

  generateInvoiceXml(
    invoice: KsefInvoice,
    seller: Company,
    buyer: Client | InvoiceBuyerData,
    correctedInvoice?: KsefInvoice | null,
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

      const now = new Date();
      const fa3 = {
        '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
        Faktura: {
          '@_xmlns': KsefXmlService.FA3_NS,
          '@_xmlns:etd': KsefXmlService.ETD_NS,
          Naglowek: {
            KodFormularza: {
              '@_kodSystemowy': 'FA (3)',
              '@_wersjaSchemy': '1-0E',
              '#text': 'FA',
            },
            WariantFormularza: 3,
            DataWytworzeniaFa: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
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
            ...((seller as unknown as Record<string, unknown>).email ? {
              DaneKontaktowe: {
                Email: (seller as unknown as Record<string, unknown>).email as string,
              },
            } : {}),
          },
          Podmiot2: {
            DaneIdentyfikacyjne: {
              // FA(3) xsd:choice: must have exactly one of NIP / KodUE+NrVatUE / KodKraju+NrID / BrakID
              // Only use NIP if it's a valid 10-digit Polish NIP different from the seller (no self-invoicing)
              ...(this.isValidPolishNip(buyerData.nip) && buyerData.nip !== seller.nip
                ? { NIP: buyerData.nip }
                : { BrakID: 1 }),
              Nazwa: buyerData.name,
            },
            // FA(3): Adres in Podmiot2 is mandatory
            Adres: {
              KodKraju: buyerData.country ?? 'PL',
              AdresL1: buyerData.street || '---',
              AdresL2: [buyerData.postalCode, buyerData.city].filter(Boolean).join(' ') || '---',
            },
            // JST=2, GV=2 means "nie dotyczy" — correct for standard B2B invoices.
            // FA(3) made these mandatory. Future: derive from buyer entity type.
            JST: 2,
            GV: 2,
          },
          Fa: {
            KodWaluty: invoice.currency ?? 'PLN',
            P_1: invoice.issueDate instanceof Date
              ? invoice.issueDate.toISOString().split('T')[0]
              : String(invoice.issueDate),
            P_2: invoice.invoiceNumber,
            ...((() => {
              const salesDate = 'salesDate' in invoice ? (invoice as any).salesDate : null;
              const p6Date = salesDate ?? invoice.issueDate;
              return p6Date ? {
                P_6: p6Date instanceof Date
                  ? p6Date.toISOString().split('T')[0]
                  : String(p6Date),
              } : {};
            })()),
            // VAT summary by rate
            ...this.buildVatFields(vatSummary),
            P_15: Number(invoice.grossAmount),
            // Required annotations before FaWiersz
            Adnotacje: {
              // P_16=1 when split payment (MPP) applies — mandatory for gross > 15 000 PLN
              P_16: Number(invoice.grossAmount) > 15000 ? 1 : 2,
              P_17: 2, // TODO: set to 1 for self-invoicing
              P_18: 2, // TODO: set to 1 for reverse charge
              P_18A: 2, // TODO: set to 1 for intra-community supply
              Zwolnienie: { P_19N: 1 }, // TODO: P_19=1 + P_19A/B/C if exemption applies
              NoweSrodkiTransportu: { P_22N: 1 },
              P_23: 2, // TODO: set to 1 for cash-basis accounting
              PMarzy: { P_PMarzyN: 1 },
            },
            ...((() => {
              const isCorrection = invoice.invoiceType === 'CORRECTION' && correctedInvoice;
              return {
                RodzajFaktury: isCorrection ? 'KOR' : 'VAT',
                ...(isCorrection ? {
                  DaneFaKorygowanej: {
                    DataWystFaKorygowanej: correctedInvoice.issueDate instanceof Date
                      ? correctedInvoice.issueDate.toISOString().split('T')[0]
                      : String(correctedInvoice.issueDate),
                    NrFaKorygowanej: correctedInvoice.invoiceNumber,
                    ...(correctedInvoice.ksefNumber ? { NrKSeF: correctedInvoice.ksefNumber } : {}),
                  },
                  P_15ZK: (Number(invoice.grossAmount) - Number(correctedInvoice.grossAmount)).toFixed(2),
                  ...(((invoice.metadata as any)?.correctionReason) ? {
                    PrzyczynaKorekty: (invoice.metadata as any).correctionReason,
                  } : {}),
                } : {}),
              };
            })()),
            // Line items
            FaWiersz: lineItems.map((item, idx) => ({
              NrWierszaFa: idx + 1,
              P_7: item.description,
              P_8A: item.unit ?? 'szt.',
              P_8B: item.quantity,
              P_9A: Number(item.unitNetPrice).toFixed(2),
              P_11: Number(item.netAmount),
              P_12: this.mapVatRate(item.vatRate),
              ...(item.gtuCodes?.length ? { GTU: item.gtuCodes } : {}),
            })),
            // Payment — inside Fa per FA(3) XSD sequence
            Platnosc: {
              TerminPlatnosci: {
                Termin: invoice.dueDate instanceof Date
                  ? invoice.dueDate.toISOString().split('T')[0]
                  : (invoice.issueDate instanceof Date
                    ? invoice.issueDate.toISOString().split('T')[0]
                    : String(invoice.issueDate)),
              },
              FormaPlatnosci: this.mapPaymentMethod(
                (invoice.metadata as Record<string, unknown>)?.paymentMethod as string | undefined,
              ),
            },
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

    // FA(3) puts dueDate inside Platnosc/TerminPlatnosci/Termin or as P_6
    const dueDate = fa?.Platnosc?.TerminPlatnosci?.Termin
      ?? fa?.Platnosc?.TerminPlatnosci
      ?? fa?.P_6
      ?? '';

    return {
      invoiceNumber: fa?.P_2 ?? '',
      issueDate: fa?.P_1 ?? '',
      sellerNip: podmiot1?.DaneIdentyfikacyjne?.NIP ?? '',
      sellerName: podmiot1?.DaneIdentyfikacyjne?.Nazwa ?? '',
      buyerNip: podmiot2?.DaneIdentyfikacyjne?.NIP,
      buyerName: podmiot2?.DaneIdentyfikacyjne?.Nazwa ?? '',
      netAmount: this.sumP13Fields(fa),
      vatAmount: parseFloat(fa?.P_15 ?? '0') - this.sumP13Fields(fa),
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
    // Map standard Polish VAT rates to FA(3) fields — in XSD sequence order.
    // Iterating rateFieldMap (fixed order) rather than summary ensures the emitted
    // XML elements always appear in the XSD-prescribed sequence regardless of
    // which line items were added first.
    // P_13_1 = net at 23%, P_14_1 = vat at 23%
    // P_13_2 = net at 8%,  P_14_2 = vat at 8%
    // P_13_3 = net at 5%,  P_14_3 = vat at 5%
    // P_13_6 = net at 0%   (no VAT-amount field)
    // P_13_7 = net exempt  (zwolniony, no VAT-amount field)
    // P_13_11 = net not subject (nie podlega, no VAT-amount field)
    const rateFieldMap = new Map<number, [string, string | null]>([
      [23, ['P_13_1', 'P_14_1']],
      [8,  ['P_13_2', 'P_14_2']],
      [5,  ['P_13_3', 'P_14_3']],
      [0,  ['P_13_6', null]],
      [-1, ['P_13_7', null]],
      [-2, ['P_13_11', null]],
    ]);

    for (const [rate, fieldPair] of rateFieldMap) {
      const amounts = summary.get(rate);
      if (amounts) {
        fields[fieldPair[0]] = String(amounts.net);
        if (fieldPair[1] !== null) {
          fields[fieldPair[1]] = String(amounts.vat);
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

  private sumP13Fields(fa: Record<string, unknown>): number {
    const fields = ['P_13_1', 'P_13_2', 'P_13_3', 'P_13_6', 'P_13_7', 'P_13_11'];
    return fields.reduce((sum, field) => sum + parseFloat(String(fa?.[field] ?? '0')), 0);
  }

  private mapPaymentMethod(method?: string): number {
    const map: Record<string, number> = {
      'gotówka': 1, 'gotowka': 1, 'cash': 1,
      'karta': 2, 'card': 2,
      'kompensata': 5, 'offset': 5,
      'przelew': 6, 'transfer': 6,
    };
    return map[method?.toLowerCase() ?? ''] ?? 6; // default: przelew
  }

  /** Returns true only for a valid 10-digit Polish NIP (digits only, checksum passes). */
  private isValidPolishNip(nip?: string | null): boolean {
    return isValidPolishNipUtil(nip);
  }

  private parseVatRate(p12: unknown): number {
    const str = String(p12);
    if (str === 'zw') return -1;
    if (str === 'np') return -2;
    return parseInt(str, 10) || 0;
  }
}
