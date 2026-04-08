import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { AIProvider, User } from '@accounting/common';
import {
  AIConfigurationService,
  OpenAIProviderService,
  OpenRouterProviderService,
  TokenUsageService,
} from '@accounting/modules/ai-agent';

export type DocumentAiCategory = 'offer' | 'contract' | 'invoice' | 'report' | 'other' | string;

export interface DocumentAiGenerateOptions {
  prompt: string;
  templateName?: string;
  placeholders?: string[];
  category?: DocumentAiCategory;
  /**
   * Optional snapshot of the editor's current HTML. When supplied, the
   * AI is asked to extend / refine the existing document instead of
   * generating from scratch — used by the dialog's "insert at cursor"
   * mode where the user does NOT want to wipe their work.
   */
  currentHtml?: string;
}

export interface DocumentAiGenerateResult {
  html: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Generate document body content (HTML) from a free-form user prompt using
 * the company's configured AI provider. Mirrors the EmailAiService pattern
 * but produces HTML that drops straight into the TipTap editor via
 * editor.commands.setContent / insertContent.
 */
@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  constructor(
    private readonly configService: AIConfigurationService,
    private readonly openaiProvider: OpenAIProviderService,
    private readonly openrouterProvider: OpenRouterProviderService,
    private readonly tokenUsageService: TokenUsageService
  ) {}

  async generate(user: User, opts: DocumentAiGenerateOptions): Promise<DocumentAiGenerateResult> {
    const config = await this.configService.getConfiguration(user);
    if (!config) {
      this.logger.warn(`AI not configured for user ${user.id}`);
      throw new BadRequestException(
        'AI nie jest skonfigurowane. Skontaktuj się z administratorem.'
      );
    }

    const apiKey = await this.configService.getDecryptedApiKey(user);

    const systemPrompt = this.buildSystemPrompt(opts);
    const userPrompt = opts.prompt.trim();

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const provider =
      config.provider === AIProvider.OPENAI ? this.openaiProvider : this.openrouterProvider;

    this.logger.log(
      `Generating document content with ${config.provider}/${config.model} for user ${user.id}`
    );

    const response = await provider.chat(
      messages,
      config.model,
      config.temperature,
      config.maxTokens,
      apiKey
    );

    await this.tokenUsageService.trackUsage(user, response.inputTokens, response.outputTokens);

    this.logger.log(`Document AI generated: ${response.totalTokens} tokens used`);

    return {
      html: this.sanitiseHtml(response.content),
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.totalTokens,
    };
  }

  private buildSystemPrompt(opts: DocumentAiGenerateOptions): string {
    const sections: string[] = [];

    // ── Role ────────────────────────────────────────────────────────────
    sections.push(
      [
        'Jestes asystentem AI generujacym profesjonalne dokumenty ksiegowe, prawne',
        'i biurowe dla polskiego biura rachunkowego. Zawsze odpowiadaj po polsku,',
        'w formalnym tonie, uzywajac poprawnej terminologii ksiegowej i prawnej',
        'zgodnej z polskim prawem podatkowym i kodeksem cywilnym.',
      ].join('\n')
    );

    // ── Output format hard rules ────────────────────────────────────────
    sections.push(
      [
        '# FORMAT WYJSCIOWY',
        '',
        'Odpowiadaj WYLACZNIE czystym kodem HTML, bez blokow kodu (zadnych ```html```),',
        'bez komentarzy, bez wyjasnien przed lub po. Nie dodawaj <html>, <head>, <body>,',
        '<style> ani <script>. NIE uzywaj inline style="..." Z WYJATKIEM text-align na',
        '<p>, <h1>-<h4> oraz <td>/<th>.',
      ].join('\n')
    );

    // ── Allowed tags inventory ──────────────────────────────────────────
    sections.push(
      [
        '## Dozwolone znaczniki HTML',
        '',
        '### Struktura',
        '- <h1> - tytul dokumentu (zazwyczaj jeden, na poczatku)',
        '- <h2> - glowne sekcje (np. "Strony umowy", "Przedmiot", "Wynagrodzenie")',
        '- <h3>, <h4> - podsekcje',
        '- <p> - akapity (kazdy paragraf w osobnym <p>)',
        '- <hr> - pozioma linia (oddzielanie sekcji, separator przed blokiem podpisow)',
        '- <blockquote> - wyrozniony cytat (np. cytat z ustawy lub klauzuli)',
        '',
        '### Formatowanie inline',
        '- <strong> - pogrubienie. UZYWAJ dla kluczowych pojec, kwot, dat, NIP-ow,',
        '  numerow umow, stron umowy. To najwazniejszy znacznik dla czytelnosci.',
        '- <em> - kursywa (np. obce slowa, tytuly aktow prawnych)',
        '- <u> - podkreslenie (rzadko, np. tytuly sekcji)',
        '- <s> - przekreslenie',
        '- <sub> - indeks dolny (np. H<sub>2</sub>O, CO<sub>2</sub>)',
        '- <sup> - indeks gorny (np. m<sup>2</sup>, 1<sup>szy</sup>)',
        '- <code> - tekst monospace (numery referencyjne, kody)',
        '- <a href="..."> - linki (bezwzglednie z protokolem https://)',
        '',
        '### Listy',
        '- <ul><li>...</li></ul> - lista punktowana',
        '- <ol><li>...</li></ol> - lista numerowana. UZYWAJ dla:',
        '  warunkow umowy, postanowien, klauzul, krokow procedury.',
        '- Lista zadan z checkboxami (np. checklista dokumentow):',
        '  <ul data-type="taskList"><li data-type="taskItem" data-checked="false">',
        '  <div><p>Tekst zadania</p></div></li></ul>',
        '',
        '### Tabele (wymagane dla cen, uslug, kalkulacji, harmonogramow)',
        '<table>',
        '  <thead>',
        '    <tr><th>Nazwa</th><th>Cena netto</th><th>VAT</th><th>Brutto</th></tr>',
        '  </thead>',
        '  <tbody>',
        '    <tr><td>Usluga A</td><td>100,00 zl</td><td>23%</td><td>123,00 zl</td></tr>',
        '  </tbody>',
        '</table>',
        '',
        '### Sekcje skladane (dla opcjonalnych zalacznikow lub dlugich tresci)',
        '<details><summary>Tytul sekcji</summary><p>Tresc rozwijalna...</p></details>',
        '',
        '### Wyrownanie tekstu (jedyne dozwolone inline style)',
        '<p style="text-align: center">Wycentrowany akapit</p>',
        '<p style="text-align: right">Wyrownany do prawej</p>',
        '<p style="text-align: justify">Justowany blok tekstu</p>',
      ].join('\n')
    );

    // ── Placeholders ────────────────────────────────────────────────────
    const placeholderSection = this.buildPlaceholderSection(opts.placeholders);
    sections.push(placeholderSection);

    // ── Best practices ──────────────────────────────────────────────────
    sections.push(
      [
        '# DOBRE PRAKTYKI',
        '',
        '1. Zaczynaj od <h1> z tytulem dokumentu.',
        '2. Strony / podmioty / kontrahenci - na poczatku, KAZDY w <strong>.',
        '3. Wszystkie kwoty pieniezne, daty, NIP-y, numery, terminy: oznaczaj <strong>.',
        '4. Warunki umow, postanowienia, klauzule: ZAWSZE w <ol>, kazdy punkt jako <li>.',
        '5. Cennik / lista uslug / harmonogram platnosci: ZAWSZE w <table> z naglowkiem.',
        '6. Na koncu kazdego dokumentu transakcyjnego dodaj blok podpisow:',
        '   <hr>',
        '   <table><tr>',
        '     <td style="text-align: center"><br><br>______________________<br>Sprzedawca</td>',
        '     <td style="text-align: center"><br><br>______________________<br>Nabywca</td>',
        '   </tr></table>',
        '7. UZYWAJ placeholderow wszedzie tam gdzie wartosc zalezy od konkretnego klienta',
        '   - lepiej {{nazwa_klienta}} niz hardkodowana nazwa.',
        '8. Pisz konkretnie, krotko, ale kompletnie. Bez pustego balastu.',
        '9. Daty zapisuj w formacie polskim: "8 kwietnia 2026 r." lub "08.04.2026".',
        '10. Kwoty: zawsze ze zlotowkami, np. "1 234,56 zl" (spacja jako separator tysiecy).',
      ].join('\n')
    );

    // ── Context (template name + category-specific guidance) ────────────
    sections.push(this.buildContextSection(opts));

    // ── Existing content (extend mode) ─────────────────────────────────
    if (opts.currentHtml && opts.currentHtml.trim().length > 0) {
      sections.push(
        [
          '# ISTNIEJACA TRESC',
          '',
          'Ponizej znajduje sie obecna tresc dokumentu. NIE powtarzaj jej, NIE generuj',
          'jej od nowa. Zwroc TYLKO nowy fragment HTML, ktory uzytkownik chce dodac',
          '(zgodnie z jego promptem). Twoj output zostanie wstawiony w miejscu kursora',
          'do tej istniejacej tresci.',
          '',
          '```',
          opts.currentHtml.trim(),
          '```',
        ].join('\n')
      );
    }

    return sections.join('\n\n');
  }

  private buildPlaceholderSection(placeholders?: string[]): string {
    const lines: string[] = [
      '# PLACEHOLDERY',
      '',
      'Dla zmiennych podmienianych przed wyslaniem dokumentu uzywaj skladni Handlebars:',
      '{{nazwa_zmiennej}}. Te tokeny sa wypelniane rzeczywistymi danymi (klient, kwoty,',
      'daty) przed wygenerowaniem .docx.',
    ];

    if (placeholders && placeholders.length > 0) {
      lines.push(
        '',
        'Dostepne placeholdery dla tego szablonu (uzyj ich KIEDY tylko pasuja):',
        placeholders.map((k) => `- {{${k}}}`).join('\n')
      );
    } else {
      lines.push(
        '',
        'Ten szablon nie ma jeszcze zdefiniowanych placeholderow. Mozesz proponowac',
        'wlasne nazwy w stylu {{nazwa_klienta}}, {{nip}}, {{data}}, {{kwota}} itp.'
      );
    }

    return lines.join('\n');
  }

  private buildContextSection(opts: DocumentAiGenerateOptions): string {
    const lines: string[] = ['# KONTEKST'];

    if (opts.templateName) {
      lines.push('', `Nazwa szablonu: "${opts.templateName}"`);
    }

    const category = (opts.category ?? 'other').toLowerCase();
    lines.push(`Kategoria szablonu: ${category}`);

    const categoryGuidance: Record<string, string[]> = {
      contract: [
        '',
        'To UMOWA. Twoj output musi zawierac:',
        '- Tytul z numerem ("Umowa nr {{numer_umowy}}")',
        '- Date i miejsce zawarcia',
        '- Sekcja "Strony umowy" - obie strony z pelnymi danymi (nazwa, adres, NIP)',
        '- Sekcja "Przedmiot umowy" - co dokladnie jest swiadczone',
        '- Sekcja "Wynagrodzenie" - kwota netto/brutto/VAT, termin platnosci, sposob',
        '- Sekcja "Czas trwania umowy" - data rozpoczecia, czas trwania',
        '- Sekcja "Wypowiedzenie" - okres wypowiedzenia, warunki',
        '- Sekcja "Postanowienia koncowe" - prawo wlasciwe, sad wlasciwy, liczba egzemplarzy',
        '- Blok podpisow na koncu',
      ],
      invoice: [
        '',
        'To FAKTURA. Twoj output musi zawierac:',
        '- Tytul "FAKTURA VAT nr {{numer}}"',
        '- Data wystawienia + data sprzedazy',
        '- Sprzedawca: nazwa, adres, NIP (wszystko w <strong>)',
        '- Nabywca: nazwa, adres, NIP (wszystko w <strong>)',
        '- <table> uslug/towarow: kolumny: Lp, Nazwa, Ilosc, Cena netto, VAT %, Wartosc netto, Wartosc VAT, Wartosc brutto',
        '- Podsumowanie: razem netto, razem VAT (z podzialem na stawki), razem brutto',
        '- Kwota slownie',
        '- Sposob platnosci, termin platnosci, numer konta',
        '- Adnotacje (np. "metoda kasowa" jezeli dotyczy)',
      ],
      offer: [
        '',
        'To OFERTA HANDLOWA. Twoj output musi zawierac:',
        '- Tytul oferty z numerem',
        '- Data oferty i termin waznosci',
        '- Dane nadawcy (biuro) i odbiorcy (klient)',
        '- Krotki wstep / wprowadzenie',
        '- <table> uslug z cennikiem (netto, VAT, brutto)',
        '- Warunki realizacji (terminy, harmonogram)',
        '- Warunki platnosci',
        '- Stopka z danymi kontaktowymi',
      ],
      report: [
        '',
        'To RAPORT. Strukturyzuj jako:',
        '- Tytul i okres ktorego raport dotyczy',
        '- Wstep / cel raportu',
        '- Sekcja "Dane" - <table> z liczbami',
        '- Sekcja "Analiza" - akapity wyjaśniajace dane',
        '- Sekcja "Wnioski" - <ul> z bullet pointami',
        '- Podsumowanie',
      ],
      other: [
        '',
        'Kategoria "inne" - dostosuj strukture do tego czego prosi uzytkownik.',
        'Zachowaj profesjonalny uklad: tytul, sekcje z naglowkami, listy/tabele dla',
        'danych, blok podpisow jezeli to dokument transakcyjny.',
      ],
    };

    const guide = categoryGuidance[category] ?? categoryGuidance['other'];
    lines.push(...guide);

    return lines.join('\n');
  }

  /**
   * Defensive cleanup: some models still wrap their output in markdown code
   * fences despite the system prompt forbidding it. Strip the fence so the
   * HTML drops cleanly into the editor.
   */
  private sanitiseHtml(raw: string): string {
    let html = raw.trim();
    const fenceRegex = /^```(?:html|HTML)?\s*\n?([\s\S]*?)\n?```$/;
    const match = fenceRegex.exec(html);
    if (match) html = match[1].trim();
    return html;
  }
}
