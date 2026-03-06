import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Browser } from 'puppeteer';
import sanitizeHtml from 'sanitize-html';

import {
  ContentBlockType,
  escapeHtml,
  getErrorMessage,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SignatureBlock,
  type TableBlock,
  type TextRun,
} from '@accounting/common';

const PLACEHOLDER_RE = /(\{\{[^}]+\}\})/g;

function renderTextRun(run: TextRun): string {
  let html = escapeHtml(run.text).replace(PLACEHOLDER_RE, '<span class="placeholder">$1</span>');
  if (run.bold) html = `<strong>${html}</strong>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.underline) html = `<u>${html}</u>`;
  return html;
}

function renderRuns(runs: TextRun[]): string {
  return runs.map(renderTextRun).join('');
}

function alignClass(alignment?: string): string {
  switch (alignment) {
    case 'center':
      return 'align-center';
    case 'right':
      return 'align-right';
    case 'justify':
      return 'align-justify';
    default:
      return '';
  }
}

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case ContentBlockType.PARAGRAPH: {
      const b = block as ParagraphBlock;
      return `<p class="paragraph ${alignClass(b.alignment)}">${renderRuns(b.content)}</p>`;
    }

    case ContentBlockType.HEADING: {
      const b = block as HeadingBlock;
      const tag = `h${b.level}`;
      return `<${tag} class="heading heading-${b.level} ${alignClass(b.alignment)}">${renderRuns(b.content)}</${tag}>`;
    }

    case ContentBlockType.TABLE: {
      const b = block as TableBlock;
      let html = '<table class="doc-table">';
      if (b.headers) {
        html += '<thead><tr class="header-row">';
        for (const cell of b.headers.cells) {
          html += `<th>${renderRuns(cell.content)}</th>`;
        }
        html += '</tr></thead>';
      }
      html += '<tbody>';
      for (const row of b.rows) {
        html += '<tr>';
        for (const cell of row.cells) {
          html += `<td>${renderRuns(cell.content)}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
    }

    case ContentBlockType.LIST: {
      const b = block as ListBlock;
      const tag = b.style === 'numbered' ? 'ol' : 'ul';
      const items = b.items.map((item) => `<li>${renderRuns(item.content)}</li>`).join('');
      return `<${tag} class="doc-list">${items}</${tag}>`;
    }

    case ContentBlockType.SEPARATOR:
      return '<hr class="doc-separator" />';

    case ContentBlockType.SIGNATURE: {
      const b = block as SignatureBlock;
      return `<div class="signature-grid">
        <div class="signature-col">
          <p class="signature-label">${escapeHtml(b.leftLabel)}</p>
          <div class="signature-space"></div>
          <div class="signature-line"></div>
          ${b.leftPlaceholder ? `<p class="signature-placeholder">${escapeHtml(b.leftPlaceholder)}</p>` : ''}
        </div>
        <div class="signature-col">
          <p class="signature-label">${escapeHtml(b.rightLabel)}</p>
          <div class="signature-space"></div>
          <div class="signature-line"></div>
          ${b.rightPlaceholder ? `<p class="signature-placeholder">${escapeHtml(b.rightPlaceholder)}</p>` : ''}
        </div>
      </div>`;
    }

    case ContentBlockType.ATTACHMENT_SECTION: {
      const b = block as AttachmentSectionBlock;
      return `<div class="attachment-section">
        <p class="attachment-title">Załącznik nr ${b.sectionNumber}: ${escapeHtml(b.title)}</p>
        ${b.content.length > 0 ? `<div class="attachment-content">${renderRuns(b.content)}</div>` : ''}
      </div>`;
    }

    case ContentBlockType.CLIENT_DATA: {
      const b = block as ClientDataBlock;
      let html = '<div class="client-data">';
      if (b.title) html += `<p class="client-data-title">${escapeHtml(b.title)}</p>`;
      if (b.fields.length > 0) {
        html += '<table class="client-data-table"><tbody>';
        for (const f of b.fields) {
          html += `<tr>
            <td class="field-label">${escapeHtml(f.label)}</td>
            <td class="field-value">${escapeHtml(f.placeholder)}</td>
          </tr>`;
        }
        html += '</tbody></table>';
      }
      html += '</div>';
      return html;
    }

    default:
      return '';
  }
}

const PDF_CSS_BODY = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Roboto', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2937;
  }

  .paragraph { margin-bottom: 0.75rem; line-height: 1.625; }
  .heading { font-weight: 700; margin-bottom: 0.75rem; }
  .heading-1 { font-size: 1.5rem; }
  .heading-2 { font-size: 1.25rem; }
  .heading-3 { font-size: 1.125rem; }

  .align-center { text-align: center; }
  .align-right { text-align: right; }
  .align-justify { text-align: justify; }

  .placeholder { color: #2563eb; text-decoration: underline; }

  .doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  .doc-table th, .doc-table td {
    border: 1px solid #9ca3af;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  .doc-table .header-row { background-color: #f3f4f6; }
  .doc-table th { font-weight: 600; }

  .doc-list { padding-left: 1.5rem; margin-bottom: 1rem; }
  .doc-list li { margin-bottom: 0.25rem; }
  ol.doc-list { list-style-type: decimal; }
  ul.doc-list { list-style-type: disc; }

  .doc-separator {
    border: none;
    border-top: 1px solid #9ca3af;
    margin: 1rem 0;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin: 1.5rem 0;
  }
  .signature-label { font-size: 0.875rem; font-weight: 600; }
  .signature-space { height: 2rem; }
  .signature-line { border-bottom: 1px solid #9ca3af; }
  .signature-placeholder {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .attachment-section { margin-bottom: 1rem; }
  .attachment-title { font-weight: 700; margin-bottom: 0.25rem; }
  .attachment-content { line-height: 1.625; }

  .client-data { margin-bottom: 1rem; }
  .client-data-title { font-weight: 700; margin-bottom: 0.5rem; }
  .client-data-table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
  .client-data-table tr { border-bottom: 1px solid #e5e7eb; }
  .client-data-table .field-label {
    width: 33%;
    padding: 0.375rem 1rem 0.375rem 0;
    font-weight: 500;
    color: #374151;
  }
  .client-data-table .field-value { padding: 0.375rem 0; }

  .doc-footer {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
    margin-top: 1rem;
  }
`;

/** Read a font file — try source-relative path (dev), fallback to cwd-based (dist) */
async function readFont(filename: string): Promise<Buffer> {
  const fromSource = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'common',
    'src',
    'lib',
    'assets',
    'fonts',
    filename
  );
  try {
    return await readFile(fromSource);
  } catch {
    const fromRoot = join(
      process.cwd(),
      'libs',
      'common',
      'src',
      'lib',
      'assets',
      'fonts',
      filename
    );
    return readFile(fromRoot);
  }
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class'],
  },
};

@Injectable()
export class DocumentPdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentPdfService.name);
  private browser: Browser | null = null;
  private browserLaunching: Promise<Browser> | null = null;
  private cachedCss = PDF_CSS_BODY;

  async onModuleInit(): Promise<void> {
    try {
      const [regularBuf, italicBuf] = await Promise.all([
        readFont('Roboto-Variable.ttf'),
        readFont('Roboto-Italic-Variable.ttf'),
      ]);

      const fontFaces = `
        @font-face {
          font-family: 'Roboto';
          font-style: normal;
          font-weight: 100 900;
          src: url(data:font/truetype;base64,${regularBuf.toString('base64')}) format('truetype');
        }
        @font-face {
          font-family: 'Roboto';
          font-style: italic;
          font-weight: 100 900;
          src: url(data:font/truetype;base64,${italicBuf.toString('base64')}) format('truetype');
        }
      `;
      this.cachedCss = fontFaces + PDF_CSS_BODY;
      this.logger.log('Roboto fonts loaded and embedded as base64');
    } catch (err) {
      this.logger.warn(
        'Failed to load Roboto fonts, PDF will use system sans-serif',
        getErrorMessage(err)
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing Puppeteer browser');
      await this.browser.close();
      this.browser = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }
    this.browser = null;
    if (!this.browserLaunching) {
      this.browserLaunching = (async () => {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        });
        this.logger.log('Puppeteer browser launched');
        return browser;
      })();
    }
    try {
      this.browser = await this.browserLaunching;
      return this.browser;
    } finally {
      this.browserLaunching = null;
    }
  }

  private buildHtmlDocument(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <style>${this.cachedCss}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }

  private renderFooter(): string {
    return `<p class="doc-footer">Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>`;
  }

  private async renderPdf(bodyHtml: string): Promise<Buffer> {
    const html = this.buildHtmlDocument(`${bodyHtml}\n${this.renderFooter()}`);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '60px', bottom: '60px', left: '40px', right: '40px' },
        printBackground: true,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async generatePdfFromBlocks(blocks: ContentBlock[]): Promise<Buffer> {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const bodyHtml = sorted.map(renderBlock).join('\n');

    this.logger.debug('Rendering PDF from content blocks via Puppeteer');
    return this.renderPdf(bodyHtml);
  }

  async generatePdfFromText(text: string, title: string): Promise<Buffer> {
    const isHtml = /<[a-z][\s\S]*>/i.test(text);
    const heading = `<h1 class="heading heading-1">${escapeHtml(title)}</h1>`;

    const bodyHtml = isHtml
      ? `${heading}\n<div>${sanitizeHtml(text, SANITIZE_OPTIONS)}</div>`
      : `${heading}\n<p class="paragraph">${escapeHtml(text)}</p>`;

    this.logger.debug('Rendering PDF from text via Puppeteer');
    return this.renderPdf(bodyHtml);
  }
}
