import { Injectable } from '@nestjs/common';

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

import {
  ContentBlockType,
  ensurePdfmakeFonts,
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

@Injectable()
export class DocumentPdfService {
  private mapTextRuns(runs: TextRun[]): Content[] {
    return runs.map((run) => ({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      decoration: run.underline ? ('underline' as const) : undefined,
    }));
  }

  private mapBlock(block: ContentBlock): Content | null {
    switch (block.type) {
      case ContentBlockType.PARAGRAPH: {
        const b = block as ParagraphBlock;
        return {
          text: this.mapTextRuns(b.content),
          alignment: b.alignment ?? 'left',
          margin: [0, 0, 0, 8],
        };
      }

      case ContentBlockType.HEADING: {
        const b = block as HeadingBlock;
        const styleMap: Record<number, string> = { 1: 'heading1', 2: 'heading2', 3: 'heading3' };
        return {
          text: this.mapTextRuns(b.content),
          style: styleMap[b.level] ?? 'heading1',
          alignment: b.alignment ?? 'left',
          margin: [0, 8, 0, 8],
        };
      }

      case ContentBlockType.TABLE: {
        const b = block as TableBlock;
        const headerRows = b.headers ? 1 : 0;
        const widths: string[] = Array(b.columnCount).fill('*') as string[];
        const bodyRows: Content[][] = [];

        if (b.headers) {
          bodyRows.push(
            b.headers.cells.map((cell) => ({
              text: this.mapTextRuns(cell.content),
              style: 'tableHeader',
            }))
          );
        }
        for (const row of b.rows) {
          bodyRows.push(
            row.cells.map((cell) => ({
              text: this.mapTextRuns(cell.content),
            }))
          );
        }

        return {
          table: { headerRows, widths, body: bodyRows },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 8],
        };
      }

      case ContentBlockType.LIST: {
        const b = block as ListBlock;
        const items = b.items.map((item) => ({ text: this.mapTextRuns(item.content) }));
        if (b.style === 'numbered') {
          return { ol: items, margin: [0, 0, 0, 8] };
        }
        return { ul: items, margin: [0, 0, 0, 8] };
      }

      case ContentBlockType.SEPARATOR: {
        return {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
          margin: [0, 8, 0, 8],
        };
      }

      case ContentBlockType.SIGNATURE: {
        const b = block as SignatureBlock;
        const lineCanvas: Content = {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }],
        };
        const leftStack: Content = {
          stack: [lineCanvas, { text: b.leftLabel, fontSize: 9, color: '#555555' }],
        };
        const rightStack: Content = {
          stack: [lineCanvas, { text: b.rightLabel, fontSize: 9, color: '#555555' }],
        };
        return {
          columns: [leftStack, { text: '', width: '*' }, rightStack],
          margin: [0, 30, 0, 12],
        };
      }

      case ContentBlockType.ATTACHMENT_SECTION: {
        const b = block as AttachmentSectionBlock;
        const title = `Załącznik ${b.sectionNumber}: ${b.title}`;
        const stackItems: Content[] = [{ text: title, bold: true }];
        if (b.content.length > 0) {
          stackItems.push({ text: this.mapTextRuns(b.content) });
        }
        return { stack: stackItems, margin: [0, 0, 0, 8] };
      }

      case ContentBlockType.CLIENT_DATA: {
        const b = block as ClientDataBlock;
        const stackItems: Content[] = [];
        if (b.title) stackItems.push({ text: b.title, bold: true });
        for (const field of b.fields) {
          stackItems.push({ text: `${field.label}: ${field.placeholder}` });
        }
        return { stack: stackItems, margin: [0, 0, 0, 8] };
      }

      default:
        return null;
    }
  }

  generatePdfFromBlocks(blocks: ContentBlock[], title: string): Promise<Buffer> {
    const pdfmake = ensurePdfmakeFonts();

    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const content: Content[] = [
      { text: title, style: 'heading1', margin: [0, 0, 0, 16] },
      ...sorted.map((b) => this.mapBlock(b)).filter((c): c is Content => c !== null),
      {
        text: `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`,
        style: 'footer',
        margin: [0, 16, 0, 0],
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      content,
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        heading1: { fontSize: 18, bold: true },
        heading2: { fontSize: 14, bold: true },
        heading3: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fillColor: '#f3f4f6' },
        footer: { fontSize: 9, color: '#888888', italics: true },
      },
    };

    return pdfmake.createPdf(docDefinition).getBuffer();
  }

  generatePdfFromText(text: string, title: string): Promise<Buffer> {
    const pdfmake = ensurePdfmakeFonts();

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: title, style: 'heading1', margin: [0, 0, 0, 16] },
        { text, margin: [0, 0, 0, 8] },
        {
          text: `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`,
          style: 'footer',
          margin: [0, 16, 0, 0],
        },
      ],
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      styles: {
        heading1: { fontSize: 18, bold: true },
        footer: { fontSize: 9, color: '#888888', italics: true },
      },
    };

    return pdfmake.createPdf(docDefinition).getBuffer();
  }
}
