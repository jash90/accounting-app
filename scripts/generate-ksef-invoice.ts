/**
 * Skrypt do lokalnego generowania XML faktur FA(3) i walidacji zgodności z KSeF.
 *
 * Użycie:
 *   bun scripts/generate-ksef-invoice.ts [--output docs/invoice.xml] [--validate] [--validate-ksef test|demo]
 *
 * Flagi:
 *   --output <path>              Ścieżka do pliku wyjściowego XML (domyślnie: stdout)
 *   --validate                   Po wygenerowaniu uruchomi lokalną walidację KSeF
 *   --validate-ksef <env>        Wyślij XML do KSeF API (test|demo) i sprawdź zgodność ze schemą
 *   --token <string>             Token autoryzacyjny KSeF (wymagany z --validate-ksef)
 *   --nip <string>               NIP podmiotu (wymagany z --validate-ksef)
 *   --help                       Pokaż pomoc
 *
 * Przykłady:
 *   bun scripts/generate-ksef-invoice.ts --validate
 *   bun scripts/generate-ksef-invoice.ts --output test-invoice.xml --validate
 *   bun scripts/generate-ksef-invoice.ts --output test.xml --validate-ksef test --nip 8191654690 --token <token>
 */
import { XMLBuilder } from 'fast-xml-parser';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Lazy import for fetch (Bun has it natively)
const { fetch } = globalThis;

// ── Types ───────────────────────────────────────────────────────────────

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitNetPrice: number;
  netAmount: number;
  vatRate: number; // 23, 8, 5, 0, -1 (zw), -2 (np)
  vatAmount: number;
  grossAmount: number;
  gtuCodes?: string[];
}

interface InvoiceInput {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string;
  salesDate?: string;
  currency: string;
  sellerNip: string;
  sellerName: string;
  sellerAddress: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  buyerNip?: string;
  buyerName: string;
  buyerAddress?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  invoiceType: 'VAT' | 'KOR';
  lineItems: InvoiceLineItem[];
  correctionReason?: string;
  correctedInvoice?: {
    number: string;
    date: string;
    ksefNumber?: string;
  };
}

// ── Validation ──────────────────────────────────────────────────────────

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

function isValidPolishNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const checksum =
    NIP_WEIGHTS.reduce((sum, w, i) => sum + w * parseInt(nip[i], 10), 0) % 11;
  return checksum === parseInt(nip[9], 10);
}

const ALLOWED_VAT_RATES = new Set([23, 8, 5, 0, -1, -2]);
const MAX_XML_SIZE_BYTES = 1_000_000;
const VALID_GTU = /^GTU_(0[1-9]|1[0-3])$/;

interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

function validateInvoice(input: InvoiceInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // NIP validation
  if (!input.sellerNip) {
    issues.push({ code: 'SELLER_NIP_REQUIRED', message: 'NIP sprzedawcy jest wymagany', severity: 'error' });
  } else if (!isValidPolishNip(input.sellerNip)) {
    issues.push({ code: 'SELLER_NIP_INVALID', message: `NIP sprzedawcy ${input.sellerNip} ma nieprawidłową sumę kontrolną`, severity: 'error' });
  }

  if (input.buyerNip && !isValidPolishNip(input.buyerNip)) {
    issues.push({ code: 'BUYER_NIP_INVALID', message: `NIP nabywcy ${input.buyerNip} ma nieprawidłową sumę kontrolną`, severity: 'warning' });
  }

  // Dates
  if (!input.issueDate) {
    issues.push({ code: 'ISSUE_DATE_REQUIRED', message: 'Data wystawienia jest wymagana', severity: 'error' });
  } else {
    const issueDate = new Date(input.issueDate);
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 60);
    if (issueDate > maxDate) {
      issues.push({ code: 'ISSUE_DATE_FUTURE', message: 'Data wystawienia jest więcej niż 60 dni w przyszłość', severity: 'error' });
    }
  }

  // Line items
  if (input.lineItems.length === 0) {
    issues.push({ code: 'NO_LINE_ITEMS', message: 'Faktura musi zawierać co najmniej jedną pozycję', severity: 'error' });
  }

  const tolerance = 0.01;
  for (let i = 0; i < input.lineItems.length; i++) {
    const item = input.lineItems[i];
    const prefix = `Pozycja ${i + 1}`;

    // VAT rate check
    if (!ALLOWED_VAT_RATES.has(item.vatRate)) {
      issues.push({ code: 'INVALID_VAT_RATE', message: `${prefix}: niedozwolona stawka VAT ${item.vatRate}`, severity: 'error' });
    }

    // Net = qty × price
    const expectedNet = item.quantity * item.unitNetPrice;
    if (Math.abs(item.netAmount - expectedNet) > tolerance) {
      issues.push({ code: 'NET_MISMATCH', message: `${prefix}: netto ${item.netAmount} ≠ ilość × cena (${expectedNet.toFixed(2)})`, severity: 'error' });
    }

    // VAT calculation
    if (item.vatRate >= 0) {
      const expectedVat = item.netAmount * item.vatRate / 100;
      if (Math.abs(item.vatAmount - expectedVat) > tolerance) {
        issues.push({ code: 'VAT_MISMATCH', message: `${prefix}: VAT ${item.vatAmount} ≠ netto × stawka (${expectedVat.toFixed(2)})`, severity: 'error' });
      }
    } else if (Math.abs(item.vatAmount) > tolerance) {
      issues.push({ code: 'EXEMPT_VAT_NOT_ZERO', message: `${prefix}: VAT powinien wynosić 0 dla stawki ${item.vatRate === -1 ? 'zw' : 'np'}`, severity: 'error' });
    }

    // Gross = net + vat
    const expectedGross = item.netAmount + item.vatAmount;
    if (Math.abs(item.grossAmount - expectedGross) > tolerance) {
      issues.push({ code: 'GROSS_MISMATCH', message: `${prefix}: brutto ${item.grossAmount} ≠ netto + VAT (${expectedGross.toFixed(2)})`, severity: 'error' });
    }

    // GTU codes
    for (const code of item.gtuCodes ?? []) {
      if (!VALID_GTU.test(code)) {
        issues.push({ code: 'INVALID_GTU', message: `${prefix}: nieprawidłowy kod GTU "${code}"`, severity: 'error' });
      }
    }
  }

  // Correction-specific
  if (input.invoiceType === 'KOR') {
    if (!input.correctedInvoice) {
      issues.push({ code: 'CORRECTED_INVOICE_REQUIRED', message: 'Faktura korygująca wymaga wskazania faktury korygowanej', severity: 'error' });
    }
    if (!input.correctionReason) {
      issues.push({ code: 'CORRECTION_REASON_REQUIRED', message: 'Przyczyna korekty jest wymagana', severity: 'error' });
    }
  }

  return issues;
}

function validateXml(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // UTF-8 BOM check
  if (xml.charCodeAt(0) === 0xfeff) {
    issues.push({ code: 'XML_BOM', message: 'XML zawiera znak BOM — KSeF wymaga UTF-8 bez BOM', severity: 'error' });
  }

  // Size check
  const size = Buffer.byteLength(xml, 'utf-8');
  if (size > MAX_XML_SIZE_BYTES) {
    issues.push({ code: 'XML_TOO_LARGE', message: `Rozmiar XML (${size} bajtów) przekracza limit KSeF (1 MB)`, severity: 'error' });
  }

  // Processing instructions (except prolog)
  if (/<\?(?!xml\s)[^?]*\?>/.test(xml)) {
    issues.push({ code: 'XML_PI', message: 'XML zawiera instrukcje przetwarzania — KSeF tego nie akceptuje', severity: 'error' });
  }

  // Forbidden Unicode chars
  const forbiddenPattern = /[\x7F-\x84\x86-\x9F\uFDD0-\uFDEF\u{1FFFE}-\u{1FFFF}\u{2FFFE}-\u{2FFFF}\u{3FFFE}-\u{3FFFF}\u{4FFFE}-\u{4FFFF}\u{5FFFE}-\u{5FFFF}\u{6FFFE}-\u{6FFFF}\u{7FFFE}-\u{7FFFF}\u{8FFFE}-\u{8FFFF}\u{9FFFE}-\u{9FFFF}\u{AFFFE}-\u{AFFFF}\u{BFFFE}-\u{BFFFF}\u{CFFFE}-\u{CFFFF}\u{DFFFE}-\u{DFFFF}\u{EFFFE}-\u{EFFFF}\u{FFFFE}-\u{FFFFF}\u{10FFFE}-\u{10FFFF}]/u;
  if (forbiddenPattern.test(xml)) {
    issues.push({ code: 'XML_FORBIDDEN_UNICODE', message: 'XML zawiera niedozwolone znaki Unicode', severity: 'error' });
  }

  return issues;
}

// ── XML Generation ──────────────────────────────────────────────────────

const FA3_NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
const ETD_NS = 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/';

function mapVatRate(rate: number): string {
  if (rate === -1) return 'zw';
  if (rate === -2) return 'np';
  return String(rate);
}

function generateInvoiceXml(input: InvoiceInput): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
    processEntities: true,
  });

  // Build VAT summary from line items
  const vatSummary = new Map<number, { net: number; vat: number }>();
  for (const item of input.lineItems) {
    const existing = vatSummary.get(item.vatRate) ?? { net: 0, vat: 0 };
    existing.net += item.netAmount;
    existing.vat += item.vatAmount;
    vatSummary.set(item.vatRate, existing);
  }

  const rateFieldMap = new Map<number, [string, string | null]>([
    [23, ['P_13_1', 'P_14_1']],
    [8, ['P_13_2', 'P_14_2']],
    [5, ['P_13_3', 'P_14_3']],
    [0, ['P_13_6', null]],
    [-1, ['P_13_7', null]],
    [-2, ['P_13_11', null]],
  ]);

  const vatFields: Record<string, string> = {};
  for (const [rate, fieldPair] of rateFieldMap) {
    const amounts = vatSummary.get(rate);
    if (amounts) {
      vatFields[fieldPair[0]] = String(amounts.net);
      if (fieldPair[1] !== null) {
        vatFields[fieldPair[1]] = String(amounts.vat);
      }
    }
  }

  const totalGross = input.lineItems.reduce((s, i) => s + i.grossAmount, 0);

  // Buyer identification: NIP if valid Polish NIP, else BrakID
  const buyerHasValidNip = input.buyerNip && isValidPolishNip(input.buyerNip);
  const buyerDaneIdentyfikacyjne: Record<string, unknown> = {
    ...(buyerHasValidNip ? { NIP: input.buyerNip } : { BrakID: 1 }),
    Nazwa: input.buyerName,
  };

  const isCorrection = input.invoiceType === 'KOR';

  const fa3 = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    Faktura: {
      '@_xmlns': FA3_NS,
      '@_xmlns:etd': ETD_NS,
      Naglowek: {
        KodFormularza: {
          '@_kodSystemowy': 'FA (3)',
          '@_wersjaSchemy': '1-0E',
          '#text': 'FA',
        },
        WariantFormularza: 3,
        DataWytworzeniaFa: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        SystemInfo: 'KSeF Local Validator',
      },
      Podmiot1: {
        DaneIdentyfikacyjne: {
          NIP: input.sellerNip,
          Nazwa: input.sellerName,
        },
        Adres: {
          KodKraju: input.sellerAddress.country,
          AdresL1: input.sellerAddress.street,
          AdresL2: `${input.sellerAddress.postalCode} ${input.sellerAddress.city}`,
        },
      },
      Podmiot2: {
        DaneIdentyfikacyjne: buyerDaneIdentyfikacyjne,
        ...(input.buyerAddress ? {
          Adres: {
            KodKraju: input.buyerAddress.country ?? 'PL',
            AdresL1: input.buyerAddress.street || '---',
            AdresL2: [input.buyerAddress.postalCode, input.buyerAddress.city].filter(Boolean).join(' ') || '---',
          },
        } : {}),
        JST: 2,
        GV: 2,
      },
      Fa: {
        KodWaluty: input.currency,
        P_1: input.issueDate,
        P_2: input.invoiceNumber,
        ...(input.salesDate ? { P_6: input.salesDate } : {}),
        ...vatFields,
        P_15: totalGross.toFixed(2),
        Adnotacje: {
          P_16: totalGross > 15000 ? 1 : 2,
          P_17: 2,
          P_18: 2,
          P_18A: 2,
          Zwolnienie: { P_19N: 1 },
          NoweSrodkiTransportu: { P_22N: 1 },
          P_23: 2,
          PMarzy: { P_PMarzyN: 1 },
        },
        RodzajFaktury: input.invoiceType,
        ...(isCorrection && input.correctedInvoice ? {
          DaneFaKorygowanej: {
            DataWystFaKorygowanej: input.correctedInvoice.date,
            NrFaKorygowanej: input.correctedInvoice.number,
            ...(input.correctedInvoice.ksefNumber ? { NrKSeF: input.correctedInvoice.ksefNumber } : {}),
          },
          ...(input.correctionReason ? { PrzyczynaKorekty: input.correctionReason } : {}),
        } : {}),
        FaWiersz: input.lineItems.map((item, idx) => ({
          NrWierszaFa: idx + 1,
          P_7: item.description,
          P_8A: item.unit,
          P_8B: item.quantity,
          P_9A: item.unitNetPrice.toFixed(2),
          P_11: item.netAmount.toFixed(2),
          P_12: mapVatRate(item.vatRate),
          ...(item.gtuCodes?.length ? { GTU: item.gtuCodes } : {}),
        })),
        Platnosc: {
          TerminPlatnosci: {
            Termin: input.dueDate ?? input.issueDate,
          },
          FormaPlatnosci: 6, // przelew
        },
      },
    },
  };

  return builder.build(fa3);
}

// ── Sample Invoice ──────────────────────────────────────────────────────

function createSampleInvoice(): InvoiceInput {
  return {
    invoiceNumber: (() => {
      const d = new Date();
      return `FV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/0001`;
    })(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split('T')[0];
    })(),
    salesDate: new Date().toISOString().split('T')[0],
    currency: 'PLN',
    sellerNip: '8191654690', // valid Polish NIP
    sellerName: 'Biuro Rachunkowe Nowak Sp. z o.o.',
    sellerAddress: {
      street: 'ul. Długa 15',
      postalCode: '30-001',
      city: 'Kraków',
      country: 'PL',
    },
    buyerNip: '8522591435', // valid Polish NIP
    buyerName: 'Firma Testowa Sp. z o.o.',
    buyerAddress: {
      street: 'ul. Krótka 5/2',
      postalCode: '00-001',
      city: 'Warszawa',
      country: 'PL',
    },
    invoiceType: 'VAT',
    lineItems: [
      {
        description: 'Usługi programistyczne — czerwiec 2026',
        quantity: 1,
        unit: 'szt.',
        unitNetPrice: 7000,
        netAmount: 7000,
        vatRate: 23,
        vatAmount: 1610,
        grossAmount: 8610,
        gtuCodes: ['GTU_01'],
      },
    ],
  };
}

// ── KSeF API Validation ────────────────────────────────────────────────

const KSEF_API_URLS: Record<string, string> = {
  test: 'https://api-test.ksef.mf.gov.pl',
  demo: 'https://api-demo.ksef.mf.gov.pl',
  production: 'https://api.ksef.mf.gov.pl',
};

interface KsefValidateResponse {
  valid: boolean;
  invoiceVersion: string;
  canonicalForm?: string;
  error?: {
    code?: string;
    description?: string;
    details?: string;
  };
}

async function validateXmlWithKsefApi(
  xml: string,
  environment: string,
  token: string,
): Promise<KsefValidateResponse> {
  const baseUrl = KSEF_API_URLS[environment];
  if (!baseUrl) {
    throw new Error(`Nieobsługiwane środowisko: ${environment}. Użyj: test, demo, production`);
  }

  console.log(`\n🌐 Wysyłanie XML do KSeF API (${environment})...`);
  console.log(`   URL: ${baseUrl}/invoice/validate`);

  const response = await fetch(`${baseUrl}/invoice/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: xml,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KSeF API error ${response.status}: ${text.substring(0, 500)}`);
  }

  const data = await response.json() as KsefValidateResponse;
  return data;
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(args: string[]): {
  output?: string;
  validate: boolean;
  validateKsef?: string;
  token?: string;
  nip?: string;
  help: boolean;
} {
  let output: string | undefined;
  let validate = false;
  let validateKsef: string | undefined;
  let token: string | undefined;
  let nip: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    } else if (args[i] === '--validate') {
      validate = true;
    } else if (args[i] === '--validate-ksef' && args[i + 1]) {
      validateKsef = args[++i];
    } else if (args[i] === '--token' && args[i + 1]) {
      token = args[++i];
    } else if (args[i] === '--nip' && args[i + 1]) {
      nip = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      help = true;
    }
  }

  return { output, validate, validateKsef, token, nip, help };
}

function printHelp(): void {
  console.log(`
generate-ksef-invoice.ts — lokalny generator i walidator XML faktur KSeF FA(3)

Użycie:
  bun scripts/generate-ksef-invoice.ts [flagi]

Flagi:
  --output <path>              Zapisz XML do pliku (domyślnie: stdout)
  --validate                   Uruchom lokalną walidację KSeF po wygenerowaniu
  --validate-ksef <env>        Wyślij XML do KSeF API i sprawdź zgodność (test|demo|production)
  --token <string>             Token autoryzacyjny JWT KSeF (wymagany z --validate-ksef)
  --nip <string>               NIP podmiotu wysyłającego
  --help, -h                   Pokaż tę pomoc

Przykłady:
  bun scripts/generate-ksef-invoice.ts --validate
  bun scripts/generate-ksef-invoice.ts --output docs/test-invoice.xml --validate
  bun scripts/generate-ksef-invoice.ts --validate-ksef test --token <jwt-token>

Walidacja lokalna sprawdza:
  ✓ Suma kontrolna NIP (sprzedawca i nabywca)
  ✓ Data wystawienia (nie > 60 dni w przyszłość)
  ✓ Stawki VAT (tylko 23, 8, 5, 0, zw, np)
  ✓ Obliczenia kwot (netto, VAT, brutto per pozycja)
  ✓ Kody GTU (GTU_01 do GTU_13)
  ✓ Rozmiar XML (≤ 1 MB)
  ✓ UTF-8 bez BOM
  ✓ Brak niedozwolonych znaków Unicode
  ✓ Brak instrukcji przetwarzania (PI)

Walidacja KSeF API (--validate-ksef) sprawdza:
  ✓ Zgodność ze schemą XSD FA(3)
  ✓ Typy danych, pola obowiązkowe
  ✓ Formaty NIP, kwot, stawek VAT
  ✓ Zwraca wersję schemy i kanoniczną formę XML
`);
}

// ── Main ─────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

console.log('📋 Generowanie faktury XML KSeF FA(3)...\n');

const invoice = createSampleInvoice();

// Step 1: Validate invoice data
if (args.validate) {
  console.log('🔍 Walidacja danych faktury...');
  const issues = validateInvoice(invoice);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (warnings.length > 0) {
    console.log(`\n⚠️  Ostrzeżenia (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`   [${w.code}] ${w.message}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ Błędy (${errors.length}):`);
    for (const e of errors) {
      console.log(`   [${e.code}] ${e.message}`);
    }
    console.log('\n❌ Walidacja nie powiodła się. Popraw błędy przed wysyłką.');
    process.exit(1);
  } else {
    console.log('   ✓ Dane faktury prawidłowe');
  }
}

// Step 2: Generate XML
const xml = generateInvoiceXml(invoice);
const xmlSize = Buffer.byteLength(xml, 'utf-8');

if (args.validate) {
  console.log('\n🔍 Walidacja wygenerowanego XML...');
  const xmlIssues = validateXml(xml);
  const xmlErrors = xmlIssues.filter((i) => i.severity === 'error');

  if (xmlErrors.length > 0) {
    console.log(`\n❌ Błędy XML (${xmlErrors.length}):`);
    for (const e of xmlErrors) {
      console.log(`   [${e.code}] ${e.message}`);
    }
    process.exit(1);
  }
  console.log(`   ✓ XML prawidłowy (rozmiar: ${xmlSize.toLocaleString()} bajtów)`);
}

// Step 3: Output
if (args.output) {
  const outputPath = resolve(args.output);
  writeFileSync(outputPath, xml, 'utf-8');
  console.log(`\n✅ XML zapisany do: ${outputPath}`);
  console.log(`   Rozmiar: ${xmlSize.toLocaleString()} bajtów`);
} else {
  console.log('\n📄 Wygenerowany XML:');
  console.log('─'.repeat(60));
  console.log(xml);
  console.log('─'.repeat(60));
  console.log(`Rozmiar: ${xmlSize.toLocaleString()} bajtów`);
}

if (args.validate) {
  console.log('\n✅ Walidacja lokalna KSeF zakończona pomyślnie — faktura gotowa do wysyłki.');
}

// Step 4: KSeF API Validation (optional)
if (args.validateKsef) {
  if (!args.token) {
    console.error('\n❌ Flag --token <jwt> jest wymagana z --validate-ksef');
    console.error('   Uzyskaj token przez KSeF API: POST /auth/ksef-token');
    process.exit(1);
  }

  try {
    const result = await validateXmlWithKsefApi(xml, args.validateKsef, args.token);

    console.log('\n📡 Wynik walidacji KSeF API:');
    console.log(`   Wersja schemy:  ${result.invoiceVersion}`);
    console.log(`   Zgodna ze schemą: ${result.valid ? '✅ TAK' : '❌ NIE'}`);

    if (result.canonicalForm) {
      console.log(`   Forma kanoniczna: ${result.canonicalForm.substring(0, 60)}...`);
    }

    if (!result.valid && result.error) {
      console.log(`\n   ❌ Błąd KSeF:`);
      if (result.error.code) console.log(`      Kod:         ${result.error.code}`);
      if (result.error.description) console.log(`      Opis:        ${result.error.description}`);
      if (result.error.details) console.log(`      Szczegóły:   ${result.error.details}`);
      process.exit(1);
    }

    console.log('\n✅ XML faktury jest zgodny ze schemą KSeF FA(3) — gotowy do wysyłki!');
  } catch (error) {
    console.error(`\n❌ Błąd walidacji KSeF API: ${(error as Error).message}`);
    process.exit(1);
  }
}
