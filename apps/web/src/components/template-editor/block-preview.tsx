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
  type TextRun,
} from '@/types/content-blocks';

import * as S from './block-styles';

interface Props {
  blocks: ContentBlock[];
}

// ── Helpers ──────────────────────────────────────────────────────

const PLACEHOLDER_RE = /(\{\{[^}]+\}\})/;

function renderTextSegment(text: string, key: number) {
  const parts = text.split(PLACEHOLDER_RE);
  return (
    <span key={key}>
      {parts.map((part, partIndex) =>
        PLACEHOLDER_RE.test(part) ? (
          <span key={`${partIndex}-${part}`} style={S.placeholder}>
            {part}
          </span>
        ) : (
          <span key={`${partIndex}-text`}>{part}</span>
        )
      )}
    </span>
  );
}

function TextRuns({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, i) => {
        const runKey = `run-${i}-${run.text.slice(0, 20)}`;
        let el = renderTextSegment(run.text, i);
        if (run.bold) el = <strong key={`bold-${runKey}`}>{el}</strong>;
        if (run.italic) el = <em key={`italic-${runKey}`}>{el}</em>;
        if (run.underline) el = <u key={`underline-${runKey}`}>{el}</u>;
        return el;
      })}
    </>
  );
}

// ── Block renderers ──────────────────────────────────────────────

function ParagraphPreview({ block }: { block: ParagraphBlock }) {
  return (
    <p style={{ ...S.paragraph, ...S.alignStyle(block.alignment) }}>
      <TextRuns runs={block.content} />
    </p>
  );
}

function HeadingPreview({ block }: { block: HeadingBlock }) {
  const align = S.alignStyle(block.alignment);
  const content = <TextRuns runs={block.content} />;

  switch (block.level) {
    case 1:
      return <h1 style={{ ...S.headingH1, ...align }}>{content}</h1>;
    case 2:
      return <h2 style={{ ...S.headingH2, ...align }}>{content}</h2>;
    case 3:
      return <h3 style={{ ...S.headingH3, ...align }}>{content}</h3>;
    default:
      return <h3 style={{ ...S.headingH3, ...align }}>{content}</h3>;
  }
}

function TablePreview({ block }: { block: TableBlock }) {
  return (
    <table style={S.table}>
      {block.headers && (
        <thead>
          <tr style={S.tableHeaderRow}>
            {block.headers.cells.map((cell, ci) => (
              <th key={ci} style={S.tableTh}>
                <TextRuns runs={cell.content} />
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {block.rows.map((row, ri) => (
          <tr key={ri}>
            {row.cells.map((cell, ci) => (
              <td key={ci} style={S.tableTd}>
                <TextRuns runs={cell.content} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListPreview({ block }: { block: ListBlock }) {
  const Tag = block.style === 'numbered' ? 'ol' : 'ul';
  const listStyle = block.style === 'numbered' ? S.listNumbered : S.listBulleted;

  return (
    <Tag style={listStyle}>
      {block.items.map((item) => (
        <li key={item.id} style={S.listItem}>
          <TextRuns runs={item.content} />
        </li>
      ))}
    </Tag>
  );
}

function SeparatorPreview() {
  return <hr style={S.separator} />;
}

function SignaturePreview({ block }: { block: SignatureBlock }) {
  return (
    <div style={S.signatureGrid}>
      <div style={S.signatureCol}>
        <p style={S.signatureLabel}>{block.leftLabel}</p>
        <div style={S.signatureLine} />
        {block.leftPlaceholder && <p style={S.signaturePlaceholder}>{block.leftPlaceholder}</p>}
      </div>
      <div style={S.signatureCol}>
        <p style={S.signatureLabel}>{block.rightLabel}</p>
        <div style={S.signatureLine} />
        {block.rightPlaceholder && <p style={S.signaturePlaceholder}>{block.rightPlaceholder}</p>}
      </div>
    </div>
  );
}

function AttachmentPreview({ block }: { block: AttachmentSectionBlock }) {
  return (
    <div style={S.attachmentContainer}>
      <p style={S.attachmentTitle}>
        Załącznik nr {block.sectionNumber}: {block.title}
      </p>
      <div style={S.attachmentBody}>
        <TextRuns runs={block.content} />
      </div>
    </div>
  );
}

function ClientDataPreview({ block }: { block: ClientDataBlock }) {
  return (
    <div style={S.clientDataContainer}>
      {block.title && <p style={S.clientDataTitle}>{block.title}</p>}
      <table style={S.clientDataTable}>
        <tbody>
          {block.fields.map((field, i) => (
            <tr key={field.label || `field-${i}`} style={S.clientDataRow}>
              <td style={S.clientDataLabel}>{field.label}</td>
              <td style={S.clientDataValue}>{field.placeholder}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Block dispatcher ─────────────────────────────────────────────

function BlockPreviewItem({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case ContentBlockType.PARAGRAPH:
      return <ParagraphPreview block={block} />;
    case ContentBlockType.HEADING:
      return <HeadingPreview block={block} />;
    case ContentBlockType.TABLE:
      return <TablePreview block={block} />;
    case ContentBlockType.LIST:
      return <ListPreview block={block} />;
    case ContentBlockType.SEPARATOR:
      return <SeparatorPreview />;
    case ContentBlockType.SIGNATURE:
      return <SignaturePreview block={block} />;
    case ContentBlockType.ATTACHMENT_SECTION:
      return <AttachmentPreview block={block} />;
    case ContentBlockType.CLIENT_DATA:
      return <ClientDataPreview block={block} />;
    default:
      return null;
  }
}

// ── Main component ───────────────────────────────────────────────

export function BlockPreview({ blocks }: Props) {
  if (blocks.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Brak bloków do wyświetlenia. Przełącz na tryb edycji i dodaj bloki.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[210mm] rounded border bg-white p-12 shadow-md">
      <div className="font-sans text-base leading-relaxed text-gray-900">
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id}>
            <BlockPreviewItem block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
