import pdfmakeModule from 'pdfmake';
import type { StyleDictionary } from 'pdfmake/interfaces';

// pdfmake 0.3.x runtime exports a singleton with `virtualfs` + `createPdf`,
// but @types/pdfmake doesn't declare `virtualfs`, so we cast.
const pdfmake = pdfmakeModule as typeof pdfmakeModule & {
  virtualfs: { writeFileSync(name: string, data: Buffer): void };
};

// Lazily initialised once per process
let fontsReady = false;

/**
 * Ensures Roboto fonts are registered with pdfmake's virtual filesystem.
 * Safe to call multiple times — initialisation happens only once per process.
 * Returns the pdfmake singleton ready to use.
 */
export function ensurePdfmakeFonts(): typeof pdfmakeModule {
  if (!fontsReady) {
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
  return pdfmakeModule;
}

/**
 * Default PDF style dictionary for use with pdfmake documents.
 * Import in PDF generation services to ensure consistent document styling.
 */
export const DEFAULT_PDF_STYLES: StyleDictionary = {
  heading1: {
    fontSize: 18,
    bold: true,
    margin: [0, 0, 0, 10],
  },
  heading2: {
    fontSize: 14,
    bold: true,
    margin: [0, 10, 0, 5],
  },
  heading3: {
    fontSize: 12,
    bold: true,
    margin: [0, 8, 0, 4],
  },
  tableHeader: {
    bold: true,
    fontSize: 10,
    color: 'black',
    fillColor: '#f3f4f6',
  },
  footer: {
    fontSize: 8,
    color: '#6b7280',
    italics: true,
  },
};

/** Default document style (font + base font size) for pdfmake documents */
export const DEFAULT_PDF_DEFAULT_STYLE = {
  font: 'Roboto',
  fontSize: 10,
};
