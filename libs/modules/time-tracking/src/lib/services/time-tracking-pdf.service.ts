import { Injectable } from '@nestjs/common';

import * as pdfmakeModule from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import { GroupedReportData, ReportSummary } from './timesheet.service';

// pdfmake 0.3.x runtime exports a singleton with `virtualfs` + `createPdf`,
// but @types/pdfmake doesn't declare `virtualfs`, so we cast.
const pdfmake = pdfmakeModule as typeof pdfmakeModule & {
  virtualfs: { writeFileSync(name: string, data: Buffer): void };
};

// Lazily initialised once per process
let fontsReady = false;
function ensureFonts(): void {
  if (fontsReady) return;
   
  const { fonts, vfs } = require('pdfmake/build/fonts/Roboto') as {
    fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
    vfs: Record<string, { data: string; encoding?: string }>;
  };
  for (const [filename, entry] of Object.entries(vfs)) {
    pdfmake.virtualfs.writeFileSync(
      filename,
      Buffer.from(entry.data, (entry.encoding as BufferEncoding) ?? 'base64')
    );
  }
  pdfmake.addFonts(fonts);
  fontsReady = true;
}

@Injectable()
export class TimeTrackingPdfService {
  private formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  private formatAmount(amount: number): string {
    return `${amount.toFixed(2)} PLN`;
  }

  generatePdf(data: ReportSummary): Promise<Buffer> {
    ensureFonts();

    const content: TDocumentDefinitions['content'] = [
      {
        text: 'Raport czasu pracy',
        style: 'header',
        margin: [0, 0, 0, 4],
      },
      {
        text: `Okres: ${data.startDate} \u2013 ${data.endDate}`,
        style: 'subheader',
        margin: [0, 0, 0, 16],
      },
      {
        text: 'Podsumowanie',
        style: 'sectionTitle',
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Parametr', style: 'tableHeader' },
              { text: 'Wartość', style: 'tableHeader' },
            ],
            ['Całkowity czas', this.formatMinutes(data.totalMinutes)],
            ['Czas rozliczalny', this.formatMinutes(data.billableMinutes)],
            ['Czas nierozliczalny', this.formatMinutes(data.nonBillableMinutes)],
            ['Całkowita kwota', this.formatAmount(data.totalAmount)],
            ['Liczba wpisów', String(data.entriesCount)],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      },
    ];

    if (data.groupedData && data.groupedData.length > 0) {
      (content as object[]).push({
        text: 'Dane szczegółowe',
        style: 'sectionTitle',
        margin: [0, 0, 0, 6],
      });

      (content as object[]).push({
        table: {
          widths: ['*', 80, 80, 80, 50],
          body: [
            [
              { text: 'Grupa', style: 'tableHeader' },
              { text: 'Czas', style: 'tableHeader' },
              { text: 'Czas rozliczalny', style: 'tableHeader' },
              { text: 'Kwota', style: 'tableHeader' },
              { text: 'Wpisy', style: 'tableHeader' },
            ],
            ...data.groupedData.map((row: GroupedReportData) => [
              row.groupName,
              this.formatMinutes(row.totalMinutes),
              this.formatMinutes(row.billableMinutes),
              this.formatAmount(row.totalAmount),
              String(row.entriesCount),
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      });
    }

    (content as object[]).push({
      text: `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`,
      style: 'footer',
      margin: [0, 8, 0, 0],
    });

    const docDefinition: TDocumentDefinitions = {
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
      },
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        subheader: {
          fontSize: 12,
          color: '#555555',
        },
        sectionTitle: {
          fontSize: 12,
          bold: true,
        },
        tableHeader: {
          bold: true,
          fillColor: '#f3f4f6',
        },
        footer: {
          fontSize: 9,
          color: '#888888',
          italics: true,
        },
      },
      pageMargins: [40, 40, 40, 40],
    };

    const doc = pdfmake.createPdf(docDefinition);
    return doc.getBuffer();
  }
}
