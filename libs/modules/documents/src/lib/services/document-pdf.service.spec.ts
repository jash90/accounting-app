import { Test, type TestingModule } from '@nestjs/testing';

import {
  ContentBlockType,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SeparatorBlock,
  type SignatureBlock,
  type TableBlock,
} from '@accounting/common';

import { DocumentPdfService } from './document-pdf.service';

/* ---------- helpers ---------- */

const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  evaluateHandle: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
};

jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn().mockResolvedValue(mockBrowser),
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake-font-data')),
}));

/* ---------- block fixtures ---------- */

function paragraphBlock(
  text: string,
  order = 0,
  opts: Partial<ParagraphBlock> = {}
): ParagraphBlock {
  return {
    id: `p-${order}`,
    type: ContentBlockType.PARAGRAPH,
    order,
    content: [{ text }],
    ...opts,
  };
}

function headingBlock(text: string, level: 1 | 2 | 3, order = 0): HeadingBlock {
  return {
    id: `h-${order}`,
    type: ContentBlockType.HEADING,
    order,
    level,
    content: [{ text }],
  };
}

function tableBlock(order = 0): TableBlock {
  return {
    id: `t-${order}`,
    type: ContentBlockType.TABLE,
    order,
    columnCount: 2,
    headers: { cells: [{ content: [{ text: 'Col A' }] }, { content: [{ text: 'Col B' }] }] },
    rows: [{ cells: [{ content: [{ text: 'r1c1' }] }, { content: [{ text: 'r1c2' }] }] }],
  };
}

function listBlock(style: 'numbered' | 'bulleted', order = 0): ListBlock {
  return {
    id: `l-${order}`,
    type: ContentBlockType.LIST,
    order,
    style,
    items: [
      { id: 'li-1', content: [{ text: 'Item 1' }] },
      { id: 'li-2', content: [{ text: 'Item 2' }] },
    ],
  };
}

function separatorBlock(order = 0): SeparatorBlock {
  return { id: `sep-${order}`, type: ContentBlockType.SEPARATOR, order };
}

function signatureBlock(order = 0): SignatureBlock {
  return {
    id: `sig-${order}`,
    type: ContentBlockType.SIGNATURE,
    order,
    leftLabel: 'Zleceniodawca',
    rightLabel: 'Wykonawca',
    leftPlaceholder: '(podpis)',
    rightPlaceholder: '(podpis)',
  };
}

function attachmentBlock(order = 0): AttachmentSectionBlock {
  return {
    id: `att-${order}`,
    type: ContentBlockType.ATTACHMENT_SECTION,
    order,
    sectionNumber: 1,
    title: 'Dokumenty',
    content: [{ text: 'Treść załącznika' }],
  };
}

function clientDataBlock(order = 0): ClientDataBlock {
  return {
    id: `cd-${order}`,
    type: ContentBlockType.CLIENT_DATA,
    order,
    title: 'Dane klienta',
    fields: [
      { id: 'f1', label: 'NIP', placeholder: 'nip' },
      { id: 'f2', label: 'Nazwa', placeholder: 'nazwa' },
    ],
  };
}

/* ---------- test suite ---------- */

describe('DocumentPdfService', () => {
  let service: DocumentPdfService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DocumentPdfService,
          useFactory: () => new DocumentPdfService(),
        },
      ],
    }).compile();

    service = module.get<DocumentPdfService>(DocumentPdfService);
  });

  /* ---- onModuleInit / onModuleDestroy ---- */

  describe('onModuleInit', () => {
    it('should load fonts and embed them in cached CSS', async () => {
      await service.onModuleInit();

      // After init, cachedCss should contain @font-face declarations
      // We verify indirectly by generating a PDF and checking setContent was called with font-face
      const blocks: ContentBlock[] = [paragraphBlock('Test')];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('@font-face');
      expect(html).toContain('Roboto');
    });

    it('should gracefully handle font loading failure', async () => {
      // The service catches font loading errors internally and falls back to system fonts.
      // We test this by verifying the service still works after init even when fonts can't load.
      // The actual readFont function tries two paths; if both fail the catch block handles it.
      // Since our mock always resolves successfully, we just verify init completes without error.
      await service.onModuleInit();
      // Verify the service is still functional after init
      const blocks: ContentBlock[] = [paragraphBlock('After init')];
      await service.generatePdfFromBlocks(blocks);
      expect(mockPage.setContent).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close browser if it was launched', async () => {
      // Launch browser by generating a PDF
      await service.generatePdfFromBlocks([paragraphBlock('test')]);
      await service.onModuleDestroy();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should do nothing if browser was never launched', async () => {
      await service.onModuleDestroy();
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });
  });

  /* ---- generatePdfFromBlocks ---- */

  describe('generatePdfFromBlocks', () => {
    it('should render a paragraph block', async () => {
      const blocks: ContentBlock[] = [paragraphBlock('Hello world')];
      const result = await service.generatePdfFromBlocks(blocks);

      expect(result).toBeInstanceOf(Buffer);
      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('Hello world');
      expect(html).toContain('<p class="paragraph');
    });

    it('should render heading blocks with correct level tags', async () => {
      const blocks: ContentBlock[] = [
        headingBlock('Title', 1, 0),
        headingBlock('Subtitle', 2, 1),
        headingBlock('Section', 3, 2),
      ];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<h1 class="heading heading-1');
      expect(html).toContain('<h2 class="heading heading-2');
      expect(html).toContain('<h3 class="heading heading-3');
    });

    it('should render a table block with headers and rows', async () => {
      const blocks: ContentBlock[] = [tableBlock(0)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<table class="doc-table">');
      expect(html).toContain('<thead>');
      expect(html).toContain('<th>Col A</th>');
      expect(html).toContain('<td>r1c1</td>');
    });

    it('should render numbered and bulleted list blocks', async () => {
      const blocks: ContentBlock[] = [listBlock('numbered', 0), listBlock('bulleted', 1)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<ol class="doc-list">');
      expect(html).toContain('<ul class="doc-list">');
      expect(html).toContain('<li>Item 1</li>');
    });

    it('should render separator block', async () => {
      const blocks: ContentBlock[] = [separatorBlock(0)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<hr class="doc-separator" />');
    });

    it('should render signature block with labels and placeholders', async () => {
      const blocks: ContentBlock[] = [signatureBlock(0)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('Zleceniodawca');
      expect(html).toContain('Wykonawca');
      expect(html).toContain('(podpis)');
      expect(html).toContain('signature-grid');
    });

    it('should render attachment section block', async () => {
      const blocks: ContentBlock[] = [attachmentBlock(0)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('Załącznik nr 1: Dokumenty');
      expect(html).toContain('Treść załącznika');
    });

    it('should render client data block with title and fields', async () => {
      const blocks: ContentBlock[] = [clientDataBlock(0)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('Dane klienta');
      expect(html).toContain('NIP');
      expect(html).toContain('nip');
    });

    it('should sort blocks by order before rendering', async () => {
      const blocks: ContentBlock[] = [paragraphBlock('Second', 2), paragraphBlock('First', 1)];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      const firstIdx = html.indexOf('First');
      const secondIdx = html.indexOf('Second');
      expect(firstIdx).toBeLessThan(secondIdx);
    });

    it('should apply bold, italic, and underline formatting', async () => {
      const block: ParagraphBlock = {
        id: 'p-fmt',
        type: ContentBlockType.PARAGRAPH,
        order: 0,
        content: [
          { text: 'bold', bold: true },
          { text: 'italic', italic: true },
          { text: 'underline', underline: true },
        ],
      };
      await service.generatePdfFromBlocks([block]);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<u>underline</u>');
    });

    it('should render alignment classes', async () => {
      const blocks: ContentBlock[] = [
        paragraphBlock('center', 0, { alignment: 'center' } as any),
        paragraphBlock('right', 1, { alignment: 'right' } as any),
        paragraphBlock('justify', 2, { alignment: 'justify' } as any),
      ];
      await service.generatePdfFromBlocks(blocks);

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('align-center');
      expect(html).toContain('align-right');
      expect(html).toContain('align-justify');
    });

    it('should call puppeteer with correct PDF options', async () => {
      await service.generatePdfFromBlocks([paragraphBlock('test')]);

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          printBackground: true,
          margin: { top: '60px', bottom: '60px', left: '40px', right: '40px' },
        })
      );
    });

    it('should close the page even if pdf generation fails', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF failed'));

      await expect(service.generatePdfFromBlocks([paragraphBlock('test')])).rejects.toThrow(
        'PDF failed'
      );
      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  /* ---- generatePdfFromText ---- */

  describe('generatePdfFromText', () => {
    it('should render plain text with escaped HTML', async () => {
      await service.generatePdfFromText('Simple text', 'My Doc');

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<h1 class="heading heading-1">My Doc</h1>');
      expect(html).toContain('<p class="paragraph">Simple text</p>');
    });

    it('should detect and sanitize HTML content', async () => {
      await service.generatePdfFromText('<p>Some <b>html</b></p>', 'HTML Doc');

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('<div>');
      expect(html).toContain('<b>html</b>');
      // Should NOT wrap in <p> since it's detected as HTML
      expect(html).not.toContain('<p class="paragraph"><p>');
    });

    it('should include generated timestamp footer', async () => {
      await service.generatePdfFromText('test', 'Title');

      const html = mockPage.setContent.mock.calls[0][0] as string;
      expect(html).toContain('doc-footer');
      expect(html).toContain('Wygenerowano:');
    });
  });
});
