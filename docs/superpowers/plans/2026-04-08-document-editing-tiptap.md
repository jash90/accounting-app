# Document Editing with TipTap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the block-based template editors (documents + offer templates) with a TipTap WYSIWYG editor that imports, edits, saves, and exports `.docx` files, preserving placeholder rendering for the existing "Generate document" / "Send offer" flows.

**Architecture:** Canonical editor state is TipTap JSON (ProseMirror doc). Browser handles `.docx` import via `mammoth`. Server handles export by serialising JSON → HTML via `@tiptap/html`, running the existing Handlebars pass, then piping through `html-to-docx`. A shared TipTap extension array lives in `libs/common/src/lib/tiptap/` so FE and BE agree on the schema.

**Tech Stack:** TipTap v3 (already installed), `mammoth`, `html-to-docx`, `@tiptap/html`, NestJS, TypeORM, PostgreSQL jsonb, Vitest + Playwright, Vite + React 19.

**Spec:** `docs/superpowers/specs/2026-04-08-document-editing-design.md`

---

## File Structure

**Shared (new):**

- `libs/common/src/lib/tiptap/placeholder-node.ts` — TipTap Mention-based custom node.
- `libs/common/src/lib/tiptap/extensions.ts` — shared `tiptapExtensions` array (FE + BE).
- `libs/common/src/lib/tiptap/index.ts` — barrel.
- `libs/common/src/index.ts` + `libs/common/src/backend.ts` — add re-exports.

**Backend (new):**

- `apps/api/src/migrations/1772100000000-AddTiptapContentToTemplates.ts`
- `libs/modules/documents/src/lib/services/tiptap-docx.service.ts`

**Backend (modified):**

- `libs/common/src/lib/entities/document-template.entity.ts` — add `tiptapContent` column.
- `libs/common/src/lib/entities/offer-template.entity.ts` — add `tiptapContent` column.
- `libs/modules/documents/src/lib/services/document-templates.service.ts` — `getContent()` / `updateContent()` methods.
- `libs/modules/documents/src/lib/controllers/document-templates.controller.ts` — new routes.
- `libs/modules/documents/src/lib/dto/document-template.dto.ts` — add DTOs.
- `libs/modules/documents/src/lib/documents.module.ts` — register `TiptapDocxService`.
- `libs/modules/offers/src/lib/services/offer-templates.service.ts` — mirror methods.
- `libs/modules/offers/src/lib/controllers/offer-templates.controller.ts` — new routes.
- `libs/modules/offers/src/lib/dto/content-blocks.dto.ts` — add DTOs.
- `libs/modules/offers/src/lib/offers.module.ts` — register `TiptapDocxService`.

**Frontend (new):**

- `apps/web/src/components/rich-doc-editor/editor.tsx`
- `apps/web/src/components/rich-doc-editor/toolbar.tsx`
- `apps/web/src/components/rich-doc-editor/import-docx-button.tsx`
- `apps/web/src/components/rich-doc-editor/export-docx-button.tsx`
- `apps/web/src/components/rich-doc-editor/placeholder-picker.tsx`
- `apps/web/src/components/rich-doc-editor/extensions.ts` — re-exports the shared array.

**Frontend (rewritten):**

- `apps/web/src/pages/modules/documents/template-editor.tsx`
- `apps/web/src/pages/modules/offers/template-editor.tsx`

**Frontend (modified):**

- `apps/web/src/lib/api/endpoints/documents.ts` — new content endpoints.
- `apps/web/src/lib/api/endpoints/offers.ts` — new content endpoints.
- `apps/web/src/lib/hooks/use-document-template-content-blocks.ts` — add tiptap hooks.
- `apps/web/src/lib/hooks/use-template-content-blocks.ts` — add tiptap hooks (offer templates).

**Kept in parallel (deleted in follow-up PR):**

- `apps/web/src/components/template-editor/**` — 15 files stay until v1 stabilises.
- `libs/modules/offers/src/lib/services/docx-block-renderer.service.ts` — stays behind a code path used only when a template has no `tiptapContent`.

---

## Task 1: Install new runtime dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1.1: Add mammoth, html-to-docx, @tiptap/html**

Run:

```bash
bun add mammoth html-to-docx @tiptap/html @tiptap/extension-mention @tiptap/extension-text-align @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

Expected: `package.json` updated, `bun.lockb` refreshed, no errors.

- [ ] **Step 1.2: Verify install**

Run: `bun pm ls mammoth html-to-docx @tiptap/html 2>&1 | head`
Expected: all three listed with resolved versions.

- [ ] **Step 1.3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add mammoth, html-to-docx, @tiptap/html and extensions"
```

---

## Task 2: Shared TipTap placeholder node

**Files:**

- Create: `libs/common/src/lib/tiptap/placeholder-node.ts`

- [ ] **Step 2.1: Create the node**

```ts
// libs/common/src/lib/tiptap/placeholder-node.ts
import { mergeAttributes, Node } from '@tiptap/core';

export interface PlaceholderNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    placeholderNode: {
      insertPlaceholder: (key: string) => ReturnType;
    };
  }
}

/**
 * Inline atomic node that represents a Handlebars placeholder (e.g. {{clientName}}).
 *
 * - Renders in the editor as a chip with the key.
 * - Serialises to the literal string `{{key}}` so the existing Handlebars
 *   render pipeline continues to work unchanged.
 */
export const PlaceholderNode = Node.create<PlaceholderNodeOptions>({
  name: 'placeholder',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      key: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-placeholder-key') ?? '',
        renderHTML: (attrs) => ({ 'data-placeholder-key': attrs['key'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-placeholder-key]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const key = (node.attrs['key'] as string) || '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'tiptap-placeholder',
        'data-placeholder-key': key,
      }),
      `{{${key}}}`,
    ];
  },

  renderText({ node }) {
    const key = (node.attrs['key'] as string) || '';
    return `{{${key}}}`;
  },

  addCommands() {
    return {
      insertPlaceholder:
        (key: string) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { key } }).run(),
    };
  },
});
```

- [ ] **Step 2.2: Commit**

```bash
git add libs/common/src/lib/tiptap/placeholder-node.ts
git commit -m "feat(common): add TipTap PlaceholderNode serialising to {{key}}"
```

---

## Task 3: Shared TipTap extension array

**Files:**

- Create: `libs/common/src/lib/tiptap/extensions.ts`
- Create: `libs/common/src/lib/tiptap/index.ts`
- Modify: `libs/common/src/index.ts` (barrel)

- [ ] **Step 3.1: Extensions array**

```ts
// libs/common/src/lib/tiptap/extensions.ts
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';

import { PlaceholderNode } from './placeholder-node';

/**
 * Canonical TipTap extension set used by both the frontend editor and the
 * backend @tiptap/html serialiser. Keeping one array guarantees JSON ↔ HTML
 * round-trips are lossless.
 */
export const tiptapExtensions = [
  StarterKit.configure({
    link: false,
    underline: false,
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: 'text-primary underline' },
  }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full' } }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  PlaceholderNode,
];
```

- [ ] **Step 3.2: Barrel**

```ts
// libs/common/src/lib/tiptap/index.ts
export * from './extensions';
export * from './placeholder-node';
```

- [ ] **Step 3.3: Re-export from libs/common**

Add to `libs/common/src/index.ts` after existing exports:

```ts
export * from './lib/tiptap';
```

- [ ] **Step 3.4: Commit**

```bash
git add libs/common/src/lib/tiptap libs/common/src/index.ts
git commit -m "feat(common): expose shared tiptapExtensions array"
```

---

## Task 4: Entity columns

**Files:**

- Modify: `libs/common/src/lib/entities/document-template.entity.ts`
- Modify: `libs/common/src/lib/entities/offer-template.entity.ts`

- [ ] **Step 4.1: DocumentTemplate entity**

Find the existing `contentBlocks` column and insert below it:

```ts
@Column({ type: 'jsonb', nullable: true })
tiptapContent?: Record<string, unknown> | null;
```

- [ ] **Step 4.2: OfferTemplate entity**

Same — insert after the `contentBlocks` column:

```ts
@Column({ type: 'jsonb', nullable: true })
tiptapContent?: Record<string, unknown> | null;
```

- [ ] **Step 4.3: Typecheck**

Run: `npx tsc --noEmit -p apps/api/tsconfig.app.json 2>&1 | tail -20`
Expected: no errors from the entity files.

- [ ] **Step 4.4: Commit**

```bash
git add libs/common/src/lib/entities/document-template.entity.ts libs/common/src/lib/entities/offer-template.entity.ts
git commit -m "feat(db): add tiptapContent jsonb column to template entities"
```

---

## Task 5: Migration

**Files:**

- Create: `apps/api/src/migrations/1772100000000-AddTiptapContentToTemplates.ts`

- [ ] **Step 5.1: Migration file**

```ts
import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTiptapContentToTemplates1772100000000 implements MigrationInterface {
  name = 'AddTiptapContentToTemplates1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_templates" ADD "tiptapContent" jsonb`);
    await queryRunner.query(`ALTER TABLE "offer_templates" ADD "tiptapContent" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offer_templates" DROP COLUMN "tiptapContent"`);
    await queryRunner.query(`ALTER TABLE "document_templates" DROP COLUMN "tiptapContent"`);
  }
}
```

- [ ] **Step 5.2: Commit**

```bash
git add apps/api/src/migrations/1772100000000-AddTiptapContentToTemplates.ts
git commit -m "feat(db): migration adding tiptapContent to both template tables"
```

---

## Task 6: TiptapDocxService

**Files:**

- Create: `libs/modules/documents/src/lib/services/tiptap-docx.service.ts`
- Create: `libs/modules/documents/src/lib/services/tiptap-docx.service.spec.ts`

- [ ] **Step 6.1: Failing test**

```ts
// libs/modules/documents/src/lib/services/tiptap-docx.service.spec.ts
import { TiptapDocxService } from './tiptap-docx.service';

describe('TiptapDocxService', () => {
  const service = new TiptapDocxService();

  const helloDoc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello, ' },
          { type: 'placeholder', attrs: { key: 'name' } },
          { type: 'text', text: '!' },
        ],
      },
    ],
  };

  it('serialises a placeholder to {{name}} in the HTML pipeline', () => {
    const html = service.toHtml(helloDoc);
    expect(html).toContain('{{name}}');
  });

  it('renders placeholders with provided context', () => {
    const filled = service.fillPlaceholders(service.toHtml(helloDoc), { name: 'Ada' });
    expect(filled).toContain('Hello, ');
    expect(filled).toContain('Ada');
    expect(filled).not.toContain('{{name}}');
  });

  it('produces a .docx buffer (PK magic bytes)', async () => {
    const buffer = await service.render(helloDoc, { name: 'Ada' });
    expect(buffer.slice(0, 4).toString('hex')).toBe('504b0304');
  });
});
```

- [ ] **Step 6.2: Run test — should fail (no service yet)**

Run: `bun test libs/modules/documents/src/lib/services/tiptap-docx.service.spec.ts 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement service**

```ts
// libs/modules/documents/src/lib/services/tiptap-docx.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { generateHTML } from '@tiptap/html';
import Handlebars from 'handlebars';
import HTMLtoDOCX from 'html-to-docx';

import { tiptapExtensions } from '@accounting/common';

export interface TiptapJSONContent {
  type: string;
  content?: TiptapJSONContent[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<Record<string, unknown>>;
}

@Injectable()
export class TiptapDocxService {
  private readonly logger = new Logger(TiptapDocxService.name);

  toHtml(json: TiptapJSONContent): string {
    return generateHTML(json as never, tiptapExtensions as never);
  }

  fillPlaceholders(html: string, context: Record<string, unknown>): string {
    try {
      return Handlebars.compile(html, { noEscape: true })(context);
    } catch (error) {
      this.logger.warn(
        `Placeholder render failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return html;
    }
  }

  async render(json: TiptapJSONContent, context: Record<string, unknown> = {}): Promise<Buffer> {
    const html = this.toHtml(json);
    const filled = this.fillPlaceholders(html, context);

    // html-to-docx wants a full HTML document
    const fullDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${filled}</body></html>`;

    const buffer = await HTMLtoDOCX(fullDoc, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    });

    if (buffer instanceof Buffer) return buffer;
    if (buffer instanceof ArrayBuffer) return Buffer.from(buffer);
    if (
      buffer &&
      typeof (buffer as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function'
    ) {
      return Buffer.from(await (buffer as Blob).arrayBuffer());
    }
    throw new Error('html-to-docx returned unexpected type');
  }
}
```

- [ ] **Step 6.4: Run tests — should pass**

Run: `bun test libs/modules/documents/src/lib/services/tiptap-docx.service.spec.ts 2>&1 | tail -20`
Expected: all 3 specs pass.

- [ ] **Step 6.5: Commit**

```bash
git add libs/modules/documents/src/lib/services/tiptap-docx.service.ts libs/modules/documents/src/lib/services/tiptap-docx.service.spec.ts
git commit -m "feat(documents): TiptapDocxService for JSON -> HTML -> docx pipeline"
```

---

## Task 7: Backend DTOs

**Files:**

- Modify: `libs/modules/documents/src/lib/dto/document-template.dto.ts`
- Modify: `libs/modules/offers/src/lib/dto/content-blocks.dto.ts`

- [ ] **Step 7.1: Document DTOs**

Append to the document-template DTO file:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class TiptapContentResponseDto {
  @ApiProperty({ description: 'Template display name' })
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true, required: false, nullable: true })
  tiptapContent?: Record<string, unknown> | null;

  @ApiProperty({ type: [String], required: false, nullable: true })
  placeholders?: string[] | null;
}

export class UpdateTiptapContentDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  tiptapContent!: Record<string, unknown>;
}

export class ExportTiptapDocxDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  tiptapContent!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true, required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
```

- [ ] **Step 7.2: Offer template DTOs**

Mirror the same three classes (rename `TiptapContentResponseDto` → `OfferTiptapContentResponseDto`, etc. so it doesn't collide) inside `libs/modules/offers/src/lib/dto/content-blocks.dto.ts`.

- [ ] **Step 7.3: Typecheck**

Run: `npx tsc --noEmit -p apps/api/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 7.4: Commit**

```bash
git add libs/modules/documents/src/lib/dto/document-template.dto.ts libs/modules/offers/src/lib/dto/content-blocks.dto.ts
git commit -m "feat(api): DTOs for tiptap content read/update/export"
```

---

## Task 8: Document-templates service + controller endpoints

**Files:**

- Modify: `libs/modules/documents/src/lib/services/document-templates.service.ts`
- Modify: `libs/modules/documents/src/lib/controllers/document-templates.controller.ts`
- Modify: `libs/modules/documents/src/lib/documents.module.ts`

- [ ] **Step 8.1: Service methods**

Add to `DocumentTemplatesService`:

```ts
async getTiptapContent(id: string, companyId: string): Promise<TiptapContentResponseDto> {
  const template = await this.repository.findOneByOrFail({ id, companyId });
  return {
    name: template.name,
    tiptapContent: template.tiptapContent ?? null,
    placeholders: template.placeholders ?? null,
  };
}

async updateTiptapContent(
  id: string,
  companyId: string,
  dto: UpdateTiptapContentDto
): Promise<TiptapContentResponseDto> {
  const template = await this.repository.findOneByOrFail({ id, companyId });
  template.tiptapContent = dto.tiptapContent;
  template.documentSourceType = 'blocks'; // tolerated value; BE uses tiptapContent presence
  await this.repository.save(template);
  return this.getTiptapContent(id, companyId);
}
```

Import the new DTOs at the top of the file.

- [ ] **Step 8.2: Controller routes**

Add to `DocumentTemplatesController`:

```ts
@Get(':id/tiptap-content')
@ApiOkResponse({ type: TiptapContentResponseDto })
getTiptapContent(@Param('id') id: string, @CurrentUser() user: User) {
  const companyId = this.systemCompany.getCompanyIdForUser(user);
  return this.service.getTiptapContent(id, companyId);
}

@Patch(':id/tiptap-content')
@ApiOkResponse({ type: TiptapContentResponseDto })
updateTiptapContent(
  @Param('id') id: string,
  @Body() dto: UpdateTiptapContentDto,
  @CurrentUser() user: User
) {
  const companyId = this.systemCompany.getCompanyIdForUser(user);
  return this.service.updateTiptapContent(id, companyId, dto);
}

@Post(':id/export-docx')
async exportDocx(
  @Param('id') id: string,
  @Body() dto: ExportTiptapDocxDto,
  @CurrentUser() user: User,
  @Res({ passthrough: false }) res: Response
) {
  const companyId = this.systemCompany.getCompanyIdForUser(user);
  const template = await this.service.findOne(id, companyId);
  const buffer = await this.tiptapDocx.render(
    dto.tiptapContent as TiptapJSONContent,
    dto.context ?? {}
  );
  res
    .status(200)
    .setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    .setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(template.name || 'document')}.docx"`
    )
    .send(buffer);
}
```

Inject `TiptapDocxService` via the constructor.

- [ ] **Step 8.3: Register service in module**

```ts
// libs/modules/documents/src/lib/documents.module.ts
providers: [
  DocumentTemplatesService,
  GeneratedDocumentsService,
  DocumentPdfService,
  TiptapDocxService, // add
],
```

- [ ] **Step 8.4: Typecheck + lint**

Run: `npx tsc --noEmit -p apps/api/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
git add libs/modules/documents/src/lib/
git commit -m "feat(documents): tiptap-content GET/PATCH and export-docx endpoints"
```

---

## Task 9: Offer-templates service + controller endpoints

**Files:**

- Modify: `libs/modules/offers/src/lib/services/offer-templates.service.ts`
- Modify: `libs/modules/offers/src/lib/controllers/offer-templates.controller.ts`
- Modify: `libs/modules/offers/src/lib/offers.module.ts`

- [ ] **Step 9.1: Mirror Task 8 for offer templates**

Same three service methods, same three controller routes, inject `TiptapDocxService` from `@accounting/modules-documents` (or re-export it and import). Register in module providers.

- [ ] **Step 9.2: Typecheck**

Run: `npx tsc --noEmit -p apps/api/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 9.3: Commit**

```bash
git add libs/modules/offers/src/lib/
git commit -m "feat(offers): tiptap-content GET/PATCH and export-docx for offer templates"
```

---

## Task 10: Frontend API client + hooks

**Files:**

- Modify: `apps/web/src/lib/api/endpoints/documents.ts`
- Modify: `apps/web/src/lib/api/endpoints/offers.ts`
- Modify: `apps/web/src/lib/hooks/use-document-template-content-blocks.ts`
- Modify: `apps/web/src/lib/hooks/use-template-content-blocks.ts`

- [ ] **Step 10.1: Documents API**

Add to `documentsApi`:

```ts
export interface TiptapContentResponseDto {
  name: string;
  tiptapContent?: Record<string, unknown> | null;
  placeholders?: string[] | null;
}

// inside documentsApi object:
getTiptapContent: (id: string) =>
  apiClient
    .get<TiptapContentResponseDto>(`/api/modules/documents/templates/${id}/tiptap-content`)
    .then((r) => r.data),

updateTiptapContent: (id: string, tiptapContent: Record<string, unknown>) =>
  apiClient
    .patch<TiptapContentResponseDto>(
      `/api/modules/documents/templates/${id}/tiptap-content`,
      { tiptapContent }
    )
    .then((r) => r.data),

exportDocx: (id: string, tiptapContent: Record<string, unknown>, context?: Record<string, unknown>) =>
  apiClient
    .post(
      `/api/modules/documents/templates/${id}/export-docx`,
      { tiptapContent, context },
      { responseType: 'blob' }
    )
    .then((r) => r.data as Blob),
```

- [ ] **Step 10.2: Offers API**

Mirror the same three functions against `/api/modules/offers/templates/:id/...`.

- [ ] **Step 10.3: Document hook**

Add to `use-document-template-content-blocks.ts` (keep existing block hooks untouched):

```ts
export function useDocumentTemplateTiptapContent(id: string) {
  return useQuery({
    queryKey: ['documentTemplate', id, 'tiptap-content'],
    queryFn: () => documentsApi.getTiptapContent(id),
    enabled: !!id,
  });
}

export function useUpdateDocumentTemplateTiptapContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tiptapContent }: { id: string; tiptapContent: Record<string, unknown> }) =>
      documentsApi.updateTiptapContent(id, tiptapContent),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['documentTemplate', id] });
      toast.success('Szablon zapisany');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Nie udało się zapisać szablonu')),
  });
}
```

- [ ] **Step 10.4: Offer hook**

Mirror in `use-template-content-blocks.ts` with `useOfferTemplateTiptapContent` +
`useUpdateOfferTemplateTiptapContent`.

- [ ] **Step 10.5: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no new errors.

- [ ] **Step 10.6: Commit**

```bash
git add apps/web/src/lib/
git commit -m "feat(web): API client + hooks for tiptap template content"
```

---

## Task 11: Rich doc editor component

**Files:**

- Create: `apps/web/src/components/rich-doc-editor/editor.tsx`
- Create: `apps/web/src/components/rich-doc-editor/toolbar.tsx`
- Create: `apps/web/src/components/rich-doc-editor/placeholder-picker.tsx`

- [ ] **Step 11.1: Toolbar**

```tsx
// apps/web/src/components/rich-doc-editor/toolbar.tsx
import { type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  editor: Editor | null;
  disabled?: boolean;
}

export function RichDocEditorToolbar({ editor, disabled = false }: Props) {
  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, Icon: typeof Bold, label: string) => (
    <Button
      type="button"
      size="icon"
      variant={active ? 'secondary' : 'ghost'}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-1 border-b p-1">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), Bold, 'Bold')}
      {btn(
        editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        Italic,
        'Italic'
      )}
      {btn(
        editor.isActive('underline'),
        () => editor.chain().focus().toggleUnderline().run(),
        UnderlineIcon,
        'Underline'
      )}
      {btn(
        editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run(),
        Strikethrough,
        'Strikethrough'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive('heading', { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        Heading1,
        'H1'
      )}
      {btn(
        editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        Heading2,
        'H2'
      )}
      {btn(
        editor.isActive('heading', { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        Heading3,
        'H3'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive('bulletList'),
        () => editor.chain().focus().toggleBulletList().run(),
        List,
        'Bullet list'
      )}
      {btn(
        editor.isActive('orderedList'),
        () => editor.chain().focus().toggleOrderedList().run(),
        ListOrdered,
        'Ordered list'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        editor.isActive({ textAlign: 'left' }),
        () => editor.chain().focus().setTextAlign('left').run(),
        AlignLeft,
        'Align left'
      )}
      {btn(
        editor.isActive({ textAlign: 'center' }),
        () => editor.chain().focus().setTextAlign('center').run(),
        AlignCenter,
        'Align center'
      )}
      {btn(
        editor.isActive({ textAlign: 'right' }),
        () => editor.chain().focus().setTextAlign('right').run(),
        AlignRight,
        'Align right'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(
        false,
        () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        TableIcon,
        'Insert table'
      )}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Undo')}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, 'Redo')}
    </div>
  );
}
```

- [ ] **Step 11.2: Placeholder picker**

```tsx
// apps/web/src/components/rich-doc-editor/placeholder-picker.tsx
import { type Editor } from '@tiptap/react';
import { Braces } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  editor: Editor | null;
  placeholders: string[];
  disabled?: boolean;
}

export function RichDocEditorPlaceholderPicker({ editor, placeholders, disabled }: Props) {
  if (!editor || placeholders.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Braces className="mr-1.5 h-4 w-4" />
          Wstaw placeholder
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
        {placeholders.map((key) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => editor.chain().focus().insertPlaceholder(key).run()}
          >
            <code className="text-xs">{`{{${key}}}`}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 11.3: Editor shell**

```tsx
// apps/web/src/components/rich-doc-editor/editor.tsx
import { useEffect } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';

import { tiptapExtensions } from '@accounting/common';

import { RichDocEditorPlaceholderPicker } from './placeholder-picker';
import { RichDocEditorToolbar } from './toolbar';

interface RichDocEditorProps {
  value: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  placeholders?: string[];
  disabled?: boolean;
  toolbarSlot?: React.ReactNode; // extra buttons (import/export) rendered to the right of the toolbar
}

const EMPTY_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function RichDocEditor({
  value,
  onChange,
  placeholders = [],
  disabled = false,
  toolbarSlot,
}: RichDocEditorProps) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value ?? EMPTY_DOC,
    editable: !disabled,
    onUpdate({ editor: ed }) {
      onChange(ed.getJSON() as Record<string, unknown>);
    },
  });

  // When the parent replaces the whole document (e.g. on import),
  // push it into the editor without breaking history.
  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value as never, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return (
    <div className="bg-background rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b">
        <RichDocEditorToolbar editor={editor} disabled={disabled} />
        <div className="flex items-center gap-2 pr-2">
          <RichDocEditorPlaceholderPicker
            editor={editor}
            placeholders={placeholders}
            disabled={disabled}
          />
          {toolbarSlot}
        </div>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none min-h-[400px] p-4 focus-within:outline-none"
      />
    </div>
  );
}
```

- [ ] **Step 11.4: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 11.5: Commit**

```bash
git add apps/web/src/components/rich-doc-editor/
git commit -m "feat(web): RichDocEditor component + toolbar + placeholder picker"
```

---

## Task 12: Import / Export buttons

**Files:**

- Create: `apps/web/src/components/rich-doc-editor/import-docx-button.tsx`
- Create: `apps/web/src/components/rich-doc-editor/export-docx-button.tsx`

- [ ] **Step 12.1: Import button**

```tsx
// apps/web/src/components/rich-doc-editor/import-docx-button.tsx
import { useRef } from 'react';

import { Editor } from '@tiptap/react';
import { FileUp } from 'lucide-react';
import mammoth from 'mammoth';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface Props {
  editor: Editor | null;
  disabled?: boolean;
}

export function ImportDocxButton({ editor, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!editor) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Obsługiwane są tylko pliki .docx (zapisz w Word jako .docx).');
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value, messages } = await mammoth.convertToHtml({ arrayBuffer });
      editor.commands.setContent(value, true);
      if (messages && messages.length > 0) {
        toast.info('Część formatowania została uproszczona przy imporcie.');
      } else {
        toast.success('Dokument zaimportowany.');
      }
    } catch (error) {
      toast.error(
        `Nie udało się odczytać pliku: ${error instanceof Error ? error.message : 'nieznany błąd'}`
      );
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !editor}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="mr-1.5 h-4 w-4" />
        Importuj .docx
      </Button>
    </>
  );
}
```

- [ ] **Step 12.2: Export button**

```tsx
// apps/web/src/components/rich-doc-editor/export-docx-button.tsx
import { useState } from 'react';

import { downloadBlob } from '@/lib/utils/download';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface Props {
  filename: string;
  fetchBlob: () => Promise<Blob>;
  disabled?: boolean;
}

export function ExportDocxButton({ filename, fetchBlob, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        try {
          const blob = await fetchBlob();
          await downloadBlob(blob, `${filename}.docx`);
          toast.success('Plik pobrany.');
        } catch (error) {
          toast.error(
            `Nie udało się pobrać pliku: ${error instanceof Error ? error.message : 'nieznany błąd'}`
          );
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      Pobierz .docx
    </Button>
  );
}
```

- [ ] **Step 12.3: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 12.4: Commit**

```bash
git add apps/web/src/components/rich-doc-editor/
git commit -m "feat(web): import/export docx buttons for rich editor"
```

---

## Task 13: Rewrite document template editor page

**Files:**

- Modify: `apps/web/src/pages/modules/documents/template-editor.tsx`

- [ ] **Step 13.1: Replace block editor with RichDocEditor**

Full rewrite of the file — use TipTap hooks, render `<RichDocEditor>` with Import + Export buttons in `toolbarSlot`, keep back/save buttons, keep the page layout.

Key bits:

```tsx
import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { RichDocEditor } from '@/components/rich-doc-editor/editor';
import { ExportDocxButton } from '@/components/rich-doc-editor/export-docx-button';
import { ImportDocxButton } from '@/components/rich-doc-editor/import-docx-button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { documentsApi } from '@/lib/api/endpoints/documents';
import {
  useDocumentTemplateTiptapContent,
  useUpdateDocumentTemplateTiptapContent,
} from '@/lib/hooks/use-document-template-content-blocks';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('documents');

  const { data, isPending } = useDocumentTemplateTiptapContent(id!);
  const updateMutation = useUpdateDocumentTemplateTiptapContent();

  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const editorRef = useRef<Record<string, unknown> | null>(null);

  const value = draft ?? (data?.tiptapContent as Record<string, unknown> | null) ?? null;

  const handleChange = useCallback((json: Record<string, unknown>) => {
    editorRef.current = json;
    setDraft(json);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id || !editorRef.current) return;
    await updateMutation.mutateAsync({ id, tiptapContent: editorRef.current });
  }, [id, updateMutation]);

  const goBack = () => navigate(`${basePath}/templates`);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Wróć">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Edytor dokumentu</h1>
            <p className="text-muted-foreground">
              {isPending ? (
                <span className="bg-muted inline-block h-4 w-48 animate-pulse rounded-md" />
              ) : (
                (data?.name ?? 'Szablon')
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Zapisz
          </Button>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-[500px] w-full" />
      ) : (
        <RichDocEditor
          value={value}
          onChange={handleChange}
          placeholders={data?.placeholders ?? []}
          toolbarSlot={
            <>
              <ImportDocxButtonSlot onChange={handleChange} />
              <ExportDocxButton
                filename={data?.name ?? 'document'}
                fetchBlob={async () => {
                  if (!id || !editorRef.current) throw new Error('Nothing to export');
                  return documentsApi.exportDocx(id, editorRef.current);
                }}
              />
            </>
          }
        />
      )}
    </div>
  );
}

// Thin wrapper that bridges the editor instance to the import button.
// The editor is created inside RichDocEditor, so the import button can't
// reach it directly. We instead accept the full TipTap JSON as output via
// onChange and let the button call it after converting with mammoth.
function ImportDocxButtonSlot({
  onChange: _onChange,
}: {
  onChange: (json: Record<string, unknown>) => void;
}) {
  // Defer to RichDocEditor's own editor ref via a context would be cleaner,
  // but for v1 we expose import via a separate mount that holds its own
  // hidden TipTap instance just to do the parse.
  return null; // will be wired properly in Task 14
}
```

The import button wiring is finalised in Task 14 (we need to expose the editor instance). Leave `ImportDocxButtonSlot` as a placeholder return `null` for now so the page still compiles and the export button works.

- [ ] **Step 13.2: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 13.3: Commit**

```bash
git add apps/web/src/pages/modules/documents/template-editor.tsx
git commit -m "feat(web): rewrite document template-editor page with RichDocEditor"
```

---

## Task 14: Wire import button via ref exposure

**Files:**

- Modify: `apps/web/src/components/rich-doc-editor/editor.tsx`
- Modify: `apps/web/src/pages/modules/documents/template-editor.tsx`

- [ ] **Step 14.1: Expose editor instance via onReady**

Change `RichDocEditorProps` to accept an optional `onReady?: (editor: Editor) => void` and call it inside a `useEffect(() => { if (editor) onReady?.(editor); }, [editor])`.

- [ ] **Step 14.2: Use it in the document editor page**

Replace the `ImportDocxButtonSlot` placeholder with:

```tsx
const [tiptapInstance, setTiptapInstance] = useState<Editor | null>(null);
// ...
toolbarSlot={
  <>
    <ImportDocxButton editor={tiptapInstance} />
    <ExportDocxButton ... />
  </>
}
// ...
<RichDocEditor onReady={setTiptapInstance} ... />
```

- [ ] **Step 14.3: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 14.4: Commit**

```bash
git add apps/web/src/components/rich-doc-editor/editor.tsx apps/web/src/pages/modules/documents/template-editor.tsx
git commit -m "feat(web): wire import-docx button via onReady editor instance"
```

---

## Task 15: Rewrite offer template editor page

**Files:**

- Modify: `apps/web/src/pages/modules/offers/template-editor.tsx`

- [ ] **Step 15.1: Mirror Task 13+14 for offers**

Same structure, but use `useOfferTemplateTiptapContent` / `useUpdateOfferTemplateTiptapContent` and `offersApi.exportDocx`. Placeholders come from the offer template's `availablePlaceholders` (map to string keys) or a static default list if the API doesn't surface them yet — prefer whatever is already returned by the content endpoint.

- [ ] **Step 15.2: Typecheck**

Run: `npx tsc --noEmit -p apps/web/tsconfig.app.json 2>&1 | grep -E "error TS" | head`
Expected: no errors.

- [ ] **Step 15.3: Commit**

```bash
git add apps/web/src/pages/modules/offers/template-editor.tsx
git commit -m "feat(web): rewrite offer template-editor page with RichDocEditor"
```

---

## Task 16: Smoke test in the browser + screenshot

**Files:**

- None — manual verification.

- [ ] **Step 16.1: Start backend**

Run: `bun run nx serve api` in a background shell.
Expected: API listening on :3000.

- [ ] **Step 16.2: Start frontend**

Run: `bun run nx serve web` in a background shell.
Expected: Vite on :4200.

- [ ] **Step 16.3: Navigate via Playwright/chrome-devtools MCP**

- Log in as `nowak@biuro-nowak.pl` / `Demo12345678!` (seeded demo account).
- Navigate to `/dashboard/documents/templates` → click Edit on any template → assert the new editor, toolbar, "Importuj .docx" and "Pobierz .docx" buttons are visible.

- [ ] **Step 16.4: Take a screenshot**

Save to `/tmp/rich-doc-editor.png` via `mcp__playwright__browser_take_screenshot`.

- [ ] **Step 16.5: Send screenshot via Discord reply**

Include the file via the `files` argument of `mcp__plugin_discord_discord__reply`, with a short message summarising what was built and what's deferred.

- [ ] **Step 16.6: Commit anything that was fixed during smoke test**

```bash
git status --short
# fix any issues, then
git add -p
git commit -m "fix(web): <whatever the smoke test surfaced>"
```

---

## Deferred to follow-up PR (out of scope for this branch)

- Delete `apps/web/src/components/template-editor/**` after stakeholders confirm the new editor.
- Delete `docx-block-renderer.service.ts` and shrink `docx-generation.service.ts`.
- Switch `GeneratedDocumentsService` and `SendOfferService` to use `TiptapDocxService` when `tiptapContent` is present.
- Lazy migration helper `contentBlocks → tiptapContent` (for v1 existing templates open empty and can be re-imported from `.docx`).
- Full Playwright e2e (import → edit → save → export → reopen) — v1 relies on the smoke test in Task 16.

Each of these is meaningful work but not required to demo the editor working end-to-end.
