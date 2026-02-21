import { Injectable, Logger } from '@nestjs/common';

import {
  ContentBlockType,
  type AttachmentSectionBlock,
  type ClientDataBlock,
  type ContentBlock,
  type HeadingBlock,
  type ListBlock,
  type ParagraphBlock,
  type SignatureBlock,
  type TableBlock,
  type TextAlignment,
  type TextRun,
} from '@accounting/common';

import { DocumentGenerationFailedException } from '../exceptions/offer.exception';

@Injectable()
export class DocxBlockRendererService {
  private readonly logger = new Logger(DocxBlockRendererService.name);

  private pizzip: typeof import('pizzip') | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.pizzip = (await import('pizzip')).default;
    } catch {
      this.logger.warn('pizzip not installed. DOCX block rendering will not be available.');
    }
  }

  renderBlocksToDocx(blocks: ContentBlock[], placeholderData?: Record<string, string>): Buffer {
    if (!this.pizzip) {
      throw new DocumentGenerationFailedException(
        'Biblioteki do generowania dokumentów nie są zainstalowane'
      );
    }

    try {
      const sorted = [...blocks].sort((a, b) => a.order - b.order);
      const bodyXml = sorted.map((block) => this.renderBlock(block, placeholderData)).join('\n');

      const zip = new this.pizzip();

      zip.file('[Content_Types].xml', this.contentTypesXml());
      zip.file('_rels/.rels', this.relsXml());
      zip.file('word/_rels/document.xml.rels', this.documentRelsXml());
      zip.file('word/document.xml', this.wrapBody(bodyXml));
      zip.file('word/styles.xml', this.stylesXml());
      zip.file('word/numbering.xml', this.numberingXml());

      return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch (error) {
      this.logger.error('Error rendering blocks to DOCX', error);
      throw new DocumentGenerationFailedException(
        error instanceof Error ? error.message : 'Nie udało się wygenerować dokumentu z bloków'
      );
    }
  }

  private renderBlock(block: ContentBlock, placeholderData?: Record<string, string>): string {
    switch (block.type) {
      case ContentBlockType.PARAGRAPH:
        return this.renderParagraph(block, placeholderData);
      case ContentBlockType.HEADING:
        return this.renderHeading(block, placeholderData);
      case ContentBlockType.TABLE:
        return this.renderTable(block, placeholderData);
      case ContentBlockType.LIST:
        return this.renderList(block, placeholderData);
      case ContentBlockType.SEPARATOR:
        return this.renderSeparator();
      case ContentBlockType.SIGNATURE:
        return this.renderSignature(block, placeholderData);
      case ContentBlockType.ATTACHMENT_SECTION:
        return this.renderAttachmentSection(block, placeholderData);
      case ContentBlockType.CLIENT_DATA:
        return this.renderClientData(block, placeholderData);
      default:
        return '';
    }
  }

  private renderParagraph(block: ParagraphBlock, placeholderData?: Record<string, string>): string {
    const runs = this.renderTextRuns(block.content, placeholderData);
    const pPr = this.paragraphProperties(block.alignment);
    return `<w:p>${pPr}${runs}</w:p>`;
  }

  private renderHeading(block: HeadingBlock, placeholderData?: Record<string, string>): string {
    const runs = this.renderTextRuns(block.content, placeholderData);
    const styleId = `Heading${block.level}`;
    const jc = block.alignment ? `<w:jc w:val="${this.mapAlignment(block.alignment)}"/>` : '';
    const pPr = `<w:pPr><w:pStyle w:val="${styleId}"/>${jc}</w:pPr>`;
    return `<w:p>${pPr}${runs}</w:p>`;
  }

  private renderTable(block: TableBlock, placeholderData?: Record<string, string>): string {
    const gridCols = Array.from(
      { length: block.columnCount },
      () => '<w:gridCol w:w="4500"/>'
    ).join('');

    const tblPr = `<w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>`;

    let rows = '';
    if (block.headers) {
      rows += this.renderTableRow(block.headers.cells, placeholderData, true);
    }
    for (const row of block.rows) {
      rows += this.renderTableRow(row.cells, placeholderData, false);
    }

    return `<w:tbl>${tblPr}<w:tblGrid>${gridCols}</w:tblGrid>${rows}</w:tbl>`;
  }

  private renderTableRow(
    cells: { content: TextRun[] }[],
    placeholderData?: Record<string, string>,
    isHeader = false
  ): string {
    const tcs = cells
      .map((cell) => {
        const runs = this.renderTextRuns(cell.content, placeholderData);
        // For headers, wrap in bold runs
        const cellContent = isHeader
          ? `<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr>${runs}</w:p>`
          : `<w:p>${runs}</w:p>`;
        return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${cellContent}</w:tc>`;
      })
      .join('');
    return `<w:tr>${tcs}</w:tr>`;
  }

  private renderList(block: ListBlock, placeholderData?: Record<string, string>): string {
    const numId = block.style === 'numbered' ? '1' : '2';
    return block.items
      .map((item) => {
        const runs = this.renderTextRuns(item.content, placeholderData);
        return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${runs}</w:p>`;
      })
      .join('');
  }

  private renderSeparator(): string {
    return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>`;
  }

  private renderSignature(block: SignatureBlock, placeholderData?: Record<string, string>): string {
    const leftText = this.substitutePlaceholders(block.leftPlaceholder || '', placeholderData);
    const rightText = this.substitutePlaceholders(block.rightPlaceholder || '', placeholderData);
    const leftLabel = this.escapeXml(block.leftLabel);
    const rightLabel = this.escapeXml(block.rightLabel);
    const leftVal = this.escapeXml(leftText);
    const rightVal = this.escapeXml(rightText);

    // Two-column borderless table
    return `<w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr></w:pPr><w:r><w:t>${leftLabel}</w:t></w:r></w:p>
          ${leftVal ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>${leftVal}</w:t></w:r></w:p>` : ''}
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr></w:pPr><w:r><w:t>${rightLabel}</w:t></w:r></w:p>
          ${rightVal ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>${rightVal}</w:t></w:r></w:p>` : ''}
        </w:tc>
      </w:tr>
    </w:tbl>`;
  }

  private renderAttachmentSection(
    block: AttachmentSectionBlock,
    placeholderData?: Record<string, string>
  ): string {
    const title = this.escapeXml(`Załącznik nr ${block.sectionNumber} - ${block.title}`);
    const runs = this.renderTextRuns(block.content, placeholderData);

    return [
      `<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${title}</w:t></w:r></w:p>`,
      `<w:p>${runs}</w:p>`,
    ].join('');
  }

  private renderClientData(
    block: ClientDataBlock,
    placeholderData?: Record<string, string>
  ): string {
    const parts: string[] = [];

    if (block.title) {
      const title = this.escapeXml(block.title);
      parts.push(
        `<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${title}</w:t></w:r></w:p>`
      );
    }

    // Two-column table (label | value)
    const rows = block.fields
      .map((field) => {
        const label = this.escapeXml(field.label);
        const value = this.escapeXml(
          this.substitutePlaceholders(field.placeholder, placeholderData)
        );
        return `<w:tr>
          <w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${label}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
      })
      .join('');

    parts.push(`<w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
      </w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid>
      ${rows}
    </w:tbl>`);

    return parts.join('');
  }

  // ── Helpers ──

  private renderTextRuns(runs: TextRun[], placeholderData?: Record<string, string>): string {
    return runs
      .map((run) => {
        const text = this.escapeXml(this.substitutePlaceholders(run.text, placeholderData));
        const rPrParts: string[] = [];
        if (run.bold) rPrParts.push('<w:b/>');
        if (run.italic) rPrParts.push('<w:i/>');
        if (run.underline) rPrParts.push('<w:u w:val="single"/>');
        const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
        return `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`;
      })
      .join('');
  }

  private paragraphProperties(alignment?: TextAlignment): string {
    if (!alignment) return '';
    return `<w:pPr><w:jc w:val="${this.mapAlignment(alignment)}"/></w:pPr>`;
  }

  private mapAlignment(alignment: TextAlignment): string {
    switch (alignment) {
      case 'left':
        return 'left';
      case 'center':
        return 'center';
      case 'right':
        return 'right';
      case 'justify':
        return 'both';
      default:
        return 'left';
    }
  }

  private substitutePlaceholders(text: string, data?: Record<string, string>): string {
    if (!data) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return data[key] ?? match;
    });
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ── DOCX package files ──

  private wrapBody(bodyXml: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;
  }

  private contentTypesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
  }

  private relsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  private documentRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;
  }

  private stylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
</w:styles>`;
  }

  private numberingXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="\u2022"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;
  }
}
