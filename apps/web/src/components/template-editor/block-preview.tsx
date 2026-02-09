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

interface Props {
  blocks: ContentBlock[];
}

// ── Helpers ──────────────────────────────────────────────────────

const PLACEHOLDER_RE = /(\{\{[^}]+\}\})/g;

function renderTextSegment(text: string, key: number) {
  const parts = text.split(PLACEHOLDER_RE);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        PLACEHOLDER_RE.test(part) ? (
          <span key={i} className="text-blue-600 underline decoration-blue-400 decoration-dotted">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function renderTextRuns(runs: TextRun[]) {
  return runs.map((run, i) => {
    let el = renderTextSegment(run.text, i);
    if (run.bold) el = <strong key={i}>{el}</strong>;
    if (run.italic) el = <em key={i}>{el}</em>;
    if (run.underline) el = <u key={i}>{el}</u>;
    return el;
  });
}

function alignClass(alignment?: string) {
  switch (alignment) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'justify':
      return 'text-justify';
    default:
      return 'text-left';
  }
}

// ── Block renderers ──────────────────────────────────────────────

function ParagraphPreview({ block }: { block: ParagraphBlock }) {
  return (
    <p className={`mb-3 leading-relaxed ${alignClass(block.alignment)}`}>
      {renderTextRuns(block.content)}
    </p>
  );
}

function HeadingPreview({ block }: { block: HeadingBlock }) {
  const cls = `${alignClass(block.alignment)} font-bold mb-3`;
  const content = renderTextRuns(block.content);

  switch (block.level) {
    case 1:
      return <h1 className={`text-2xl ${cls}`}>{content}</h1>;
    case 2:
      return <h2 className={`text-xl ${cls}`}>{content}</h2>;
    case 3:
      return <h3 className={`text-lg ${cls}`}>{content}</h3>;
    default:
      return <h3 className={`text-lg ${cls}`}>{content}</h3>;
  }
}

function TablePreview({ block }: { block: TableBlock }) {
  return (
    <table className="mb-4 w-full border-collapse border border-gray-400 text-sm">
      {block.headers && (
        <thead>
          <tr className="bg-gray-100">
            {block.headers.cells.map((cell, ci) => (
              <th key={ci} className="border border-gray-400 px-3 py-2 text-left font-semibold">
                {renderTextRuns(cell.content)}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {block.rows.map((row, ri) => (
          <tr key={ri}>
            {row.cells.map((cell, ci) => (
              <td key={ci} className="border border-gray-400 px-3 py-2">
                {renderTextRuns(cell.content)}
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
  const listCls =
    block.style === 'numbered'
      ? 'list-decimal pl-6 mb-4 space-y-1'
      : 'list-disc pl-6 mb-4 space-y-1';

  return (
    <Tag className={listCls}>
      {block.items.map((item, i) => (
        <li key={i}>{renderTextRuns(item.content)}</li>
      ))}
    </Tag>
  );
}

function SeparatorPreview() {
  return <hr className="my-4 border-gray-400" />;
}

function SignaturePreview({ block }: { block: SignatureBlock }) {
  return (
    <div className="my-6 grid grid-cols-2 gap-12">
      <div className="space-y-8">
        <p className="text-sm font-semibold">{block.leftLabel}</p>
        <div className="border-b border-gray-400 pt-8" />
        {block.leftPlaceholder && <p className="text-xs text-gray-500">{block.leftPlaceholder}</p>}
      </div>
      <div className="space-y-8">
        <p className="text-sm font-semibold">{block.rightLabel}</p>
        <div className="border-b border-gray-400 pt-8" />
        {block.rightPlaceholder && (
          <p className="text-xs text-gray-500">{block.rightPlaceholder}</p>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ block }: { block: AttachmentSectionBlock }) {
  return (
    <div className="mb-4">
      <p className="mb-1 font-bold">
        Załącznik nr {block.sectionNumber}: {block.title}
      </p>
      <div className="leading-relaxed">{renderTextRuns(block.content)}</div>
    </div>
  );
}

function ClientDataPreview({ block }: { block: ClientDataBlock }) {
  return (
    <div className="mb-4">
      {block.title && <p className="mb-2 font-bold">{block.title}</p>}
      <table className="w-full border-collapse text-sm">
        <tbody>
          {block.fields.map((field, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="w-1/3 py-1.5 pr-4 font-medium text-gray-700">{field.label}</td>
              <td className="py-1.5">
                <span className="text-blue-600 underline decoration-blue-400 decoration-dotted">
                  {field.placeholder}
                </span>
              </td>
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
      <div className="font-serif text-base leading-relaxed text-gray-900">
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id}>
            <BlockPreviewItem block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
