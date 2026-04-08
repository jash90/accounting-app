# Document Editing with .docx Import/Export — Design

**Date:** 2026-04-08
**Branch:** `feat/document-editing-tiptap`
**Status:** Draft — awaiting user review
**Author:** Claude (brainstormed with @zimny.)

## 1. Motivation

Today the app has a custom **block-based content editor** used in two places:

- `apps/web/src/pages/modules/documents/template-editor.tsx` — edits `DocumentTemplate.contentBlocks`
- `apps/web/src/pages/modules/offers/template-editor.tsx` — edits `OfferTemplate.contentBlocks`

Both use the same shared UI under `apps/web/src/components/template-editor/` (15 files) and the
same `ContentBlock[]` JSON shape. Users build documents by stacking typed blocks (heading,
paragraph, list, table, signature, client-data, attachment, separator).

The block model has three hard limits:

1. **No import.** A user cannot bring in an existing `.docx` file — they must rebuild it block
   by block.
2. **No faithful export.** Downloads go through `libs/modules/offers/src/lib/services/
docx-block-renderer.service.ts` (391 lines) which hand-maps blocks to `docx` primitives, with
   limited formatting fidelity.
3. **Unfamiliar UX.** End users (accountants) expect a Word-like canvas, not a stack of
   typed cards.

We want a real WYSIWYG editor that imports `.docx`, edits inline, saves, and exports back to
`.docx`, replacing the block editor in both documents and offer templates.

## 2. Scope

### In scope

- Replace the block-based editor in **both** documents and offer templates (scope "B" confirmed
  on Discord 2026-04-08).
- Support **.docx** (Office Open XML) only. Legacy **.doc** (binary Word 97-2003) is explicitly
  out of scope — it would force a server-side LibreOffice/OnlyOffice dependency that the
  ROI doesn't justify.
- Preserve the existing **placeholder** mechanism (`{{clientName}}`, `{{offerTotal}}` etc.) so
  "Generate document" and "Send offer" continue to work with real data.
- Preserve existing generated-document and send-offer flows end-to-end.
- Lazy, non-destructive migration of existing `contentBlocks` data (no destructive SQL).

### Out of scope

- Real-time collaborative editing.
- Tracked changes / comments.
- `.doc` (binary) support.
- Dropping the `contentBlocks` / `documentSourceType` columns (handled in a follow-up PR after
  stabilisation in production).
- Rich image asset management (v1 inlines images as base64; a later PR can wire uploads through
  the existing attachments pipeline).
- OnlyOffice / SuperDoc / CKEditor Premium — rejected in the approach comparison (see §3).

## 3. Library Choice — TipTap + mammoth + html-to-docx

Three approaches were evaluated:

| Option | Library                             | Pros                                                                                                                                                          | Cons                                                                                                                                                                     | Verdict                    |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| ①      | **TipTap + mammoth + html-to-docx** | Already have `@tiptap/react` installed (email composer uses it). MIT-licensed. ~250 KB added. No new infra. Full control over extensions & placeholder chips. | Fidelity loss on exotic docx features (SmartArt, tracked changes, nested merged tables) — but the current block editor doesn't support those either, so it's a net gain. | **Chosen**                 |
| ②      | **SuperDoc** (harbour-enterprises)  | Higher native `.docx` fidelity, drop-in React component.                                                                                                      | **AGPL-3.0** — incompatible with a proprietary SaaS without a paid commercial license. Newer, smaller community. Still needs placeholder + backend pipeline rework.      | Rejected                   |
| ③      | **OnlyOffice Document Server**      | Perfect fidelity, MS-Word-grade UX.                                                                                                                           | Requires a new Docker service on Railway (~500 MB RAM min, slow cold starts). AGPL community edition needs a commercial license for SaaS embedding. Heavy infra change.  | Rejected (over-engineered) |

**New runtime dependencies for option ①:**

- `mammoth` (~170 KB, MIT) — converts `.docx` → semantic HTML in the browser.
- `html-to-docx` (~60 KB, MIT) — converts HTML → `.docx` Buffer on the server.
- `@tiptap/html` (already in @tiptap ecosystem) — serialises ProseMirror JSON → HTML on the server.

No new server infrastructure required.

## 4. Architecture

```
┌─────────────── Browser ───────────────┐       ┌──────────── API (Nest) ───────────┐
│                                       │       │                                   │
│   Import:                             │       │   POST /document-templates/:id/   │
│   .docx File ──► mammoth ──► HTML     │       │        export-docx                │
│                 │                     │       │                                   │
│                 ▼                     │       │   body: { tiptapContent, context }│
│             TipTap editor             │       │                                   │
│             (JSON state)              │       │   TiptapDocxService               │
│                                       │       │   1. @tiptap/html: JSON → HTML    │
│   Save:                               │       │   2. Handlebars.compile(HTML)(ctx)│
│   POST /.../content { tiptapContent } │       │   3. html-to-docx(HTML) → Buffer  │
│                                       │       │                                   │
│   Download:                           │       │   Response: docx Buffer, 200      │
│   GET  /.../export-docx ──► .docx file│       │                                   │
└───────────────────────────────────────┘       └───────────────────────────────────┘
```

**Canonical state = TipTap JSON (ProseMirror doc).**

HTML is a derived format used only at export time. Storing JSON (not HTML) keeps round-trips
lossless, makes the placeholder node trivially walkable, and lets us extend the schema
without parser pain.

## 5. Data Model Changes

### Entities

Add one column each to `DocumentTemplate` and `OfferTemplate`:

```ts
@Column({ type: 'jsonb', nullable: true })
tiptapContent?: Record<string, unknown> | null;   // ProseMirror JSONContent
```

Keep — during the transition window only:

- `contentBlocks: jsonb` (read-only fallback, never written)
- `templateContent: text` (legacy Handlebars, documents only)
- `documentSourceType` (accepts new literal `'tiptap'`)
- `placeholders: string[]` (still powers the placeholder picker)

### Migration file

`apps/api/src/migrations/<timestamp>-AddTiptapContentToTemplates.ts`

- `ALTER TABLE document_templates ADD COLUMN tiptap_content JSONB NULL;`
- `ALTER TABLE offer_templates ADD COLUMN tiptap_content JSONB NULL;`
- **Non-destructive.** No backfill inside the migration.

### Lazy runtime migration

On editor load:

1. If `tiptapContent` is present → use it.
2. Else if `contentBlocks` is present → convert via
   `libs/common/src/lib/tiptap/content-blocks-to-tiptap.ts` (best-effort block → node mapping)
   and use that as the initial state.
3. Else if legacy `templateContent` (HTML/Handlebars string) is present → parse via TipTap
   `setContent(html)` and use that.
4. Else start empty.

The next **save** always writes `tiptapContent`. `contentBlocks` / `templateContent` are
never written again. A follow-up PR (out of scope) drops the old columns after a stability
window in production.

## 6. Placeholders

Placeholders are the key constraint — the existing "Generate document" and "Send offer"
flows rely on Handlebars-style `{{variable}}` substitution against the live client/offer
context.

### Editor side (TipTap)

New custom node `PlaceholderNode` based on `@tiptap/extension-mention`:

- Rendered as an inline chip: `[clientName]` with distinct background + remove button.
- Atomic (non-editable as text).
- Triggered by a `PlaceholderPicker` dropdown (reuses the current one almost verbatim, just
  re-targeted at TipTap).

### Serialisation

- TipTap JSON: `{ type: 'placeholder', attrs: { key: 'clientName' } }`
- `@tiptap/html` renders it to: `{{clientName}}` (plain text token in the HTML stream)
- Backend runs `Handlebars.compile(html)(context)` — existing render path, no change.

### Unknown placeholders

If a template references a variable that isn't in the context:

- Render as empty string.
- Log a warning (`logger.warn('Unknown placeholder', { key, templateId })`).
- Matches current behaviour — no user-facing regression.

## 7. Import Flow (.docx → Editor)

All client-side. No backend round-trip.

```
<ImportDocxButton>
  onChange(file):
    1. arrayBuffer = await file.arrayBuffer()
    2. { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer })
    3. editor.commands.setContent(html, true)  // parse → TipTap JSON
    4. if (messages.length) toast.info('Some formatting was simplified')
    5. On hard error → toast.error + keep existing content
```

Mammoth emits a curated HTML dialect: headings, paragraphs, lists, tables, bold/italic/
underline/strikethrough, links, images (as base64 data URIs). Exactly the subset TipTap's
default parser handles cleanly.

## 8. Export Flow (Editor → .docx)

Server-side — single source of truth.

### Endpoint

`POST /document-templates/:id/export-docx` (and `/offer-templates/:id/export-docx`)

```ts
// Request
{ tiptapContent: JSONContent, context?: Record<string, unknown> }

// Response
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="<template-name>.docx"
```

### Pipeline

```ts
// libs/modules/documents/src/lib/services/tiptap-docx.service.ts
export class TiptapDocxService {
  async render(json: JSONContent, context: Record<string, unknown> = {}): Promise<Buffer> {
    const html = generateHTML(json, tiptapExtensions); // @tiptap/html
    const filled = Handlebars.compile(html)(context); // existing util
    const buffer = await htmlToDocx(filled, null, {
      table: { row: { cantSplit: true } },
      footer: true,
    });
    return buffer as Buffer;
  }
}
```

`tiptapExtensions` is a shared array exported from
`libs/common/src/lib/tiptap/extensions.ts` and imported by both the frontend editor and
the backend serializer — **this is the only way the schemas stay in lockstep.**

### In-editor "Download" button

Calls the same export endpoint with the current (possibly unsaved) JSON. No duplicate
client-side docx generation path.

## 9. Component Structure

### Frontend (new)

```
apps/web/src/components/rich-doc-editor/
├── editor.tsx                    # <RichDocEditor value onChange placeholders onSave onExport />
├── toolbar.tsx                   # bold/italic/underline, headings, lists, alignment, tables, link, image
├── import-button.tsx             # FileInput → mammoth → editor.setContent
├── export-button.tsx             # POST /export-docx → blob download
└── extensions/
    ├── placeholder-node.ts       # TipTap Mention-based custom node
    └── index.ts                  # re-exports tiptapExtensions array
```

### Frontend (rewritten)

- `apps/web/src/pages/modules/documents/template-editor.tsx` — ~40 lines, thin wrapper.
- `apps/web/src/pages/modules/offers/template-editor.tsx` — same.

### Frontend (deleted, once both pages migrated and verified)

- `apps/web/src/components/template-editor/**` — 15 files
- `apps/web/src/types/content-blocks.ts`
- `apps/web/src/lib/hooks/use-document-template-content-blocks.ts`
- `apps/web/src/lib/hooks/use-document-template-content-blocks.test.tsx`
- `apps/web/src/lib/hooks/use-template-content-blocks.ts`
- `apps/web/src/lib/hooks/use-template-content-blocks.test.tsx`

### Shared (new)

```
libs/common/src/lib/tiptap/
├── extensions.ts                 # tiptapExtensions: Extension[] (used by FE + BE)
├── placeholder-node.ts           # shared custom node definition
└── content-blocks-to-tiptap.ts   # lazy migration helper
```

### Backend (new)

- `libs/modules/documents/src/lib/services/tiptap-docx.service.ts`
- Export endpoints added to `DocumentTemplatesController` and `OfferTemplatesController`.

### Backend (changed)

- `DocumentTemplate` + `OfferTemplate` entities: add `tiptapContent` column.
- `document-templates.service.ts` + `offer-templates.service.ts`: new `updateContent()` and
  `getContent()` methods; existing block-based methods kept for read-only fallback during
  transition.
- `GeneratedDocumentsService`: switch generation path to `TiptapDocxService` when
  `tiptapContent` is present; fall back to block renderer otherwise.
- `SendOfferService`: same.

### Backend (deleted, once generation path fully cut over)

- `libs/modules/offers/src/lib/services/docx-block-renderer.service.ts` (391 lines)
- `libs/modules/offers/src/lib/services/docx-generation.service.ts` shrinks from 619 → ~150
  lines (keeps only offer-specific orchestration; rendering delegates to `TiptapDocxService`).

**Net change: ~1000 lines of block-rendering code deleted; ~400 lines of new editor +
pipeline code added. Net negative LOC.**

## 10. Error Handling

| Failure                                                | Response                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Mammoth soft warnings during import                    | Toast `info`: "Some formatting was simplified during import."                                |
| Mammoth hard error (corrupt `.docx`)                   | Toast `error`: "Could not read that file." Existing editor content is preserved.             |
| Unknown placeholder at render time                     | Rendered as empty string + `logger.warn`.                                                    |
| `html-to-docx` throws on export                        | 500 to frontend → toast `error`: "Export failed. Try again." No silent fallback.             |
| Editor state lost due to navigation                    | `useBlocker` + AlertDialog on dirty state (pattern already used in the block editor).        |
| Migration helper fails on a legacy `contentBlocks` row | Log error, render empty editor. User can still edit / save, which overwrites the broken row. |

## 11. Testing

### Unit (Vitest)

- `TiptapDocxService.render()` — given a canned JSON + context, asserts:
  - HTML output contains expected text and structural tags.
  - Placeholder tokens are resolved.
  - Returned buffer starts with the `.docx` ZIP magic number (`PK\x03\x04`).
- `PlaceholderNode` — serialise + parse round-trip (`JSON → HTML → JSON` is identity).
- `content-blocks-to-tiptap.ts` — each `ContentBlock` subtype maps to the expected TipTap node.
- `ImportDocxButton` — mock mammoth, assert `editor.setContent` called with returned HTML
  and that warning messages produce a toast.

### Integration (API, Jest)

- `POST /document-templates/:id/export-docx` — authenticated request with valid JSON +
  context returns `200`, correct `Content-Type`, a buffer whose first bytes match the
  `.docx` signature.
- Same for `/offer-templates/:id/export-docx`.

### E2E (Playwright)

- `documents-editor.spec.ts` — full flow:
  1. Open template editor page.
  2. Click "Import .docx", upload fixture `tests/fixtures/sample-template.docx`.
  3. Assert editor shows expected heading + paragraph.
  4. Add a placeholder via the picker.
  5. Save.
  6. Reload — content + placeholder chip still present.
  7. Click "Download .docx" — file downloads, size > 0, filename matches.
- Keep existing `documents-generate.spec.ts` and offer send flow green (they exercise the
  real generation pipeline and will prove the switch to `TiptapDocxService`).

### Manual regression checklist

- "Generate document" from an existing block-based template (tests lazy migration).
- "Send offer" email attachment is still a valid `.docx`.
- PDF generation (`document-pdf.service.ts`) still works if it consumes the rendered HTML.

## 12. Rollout

Single branch `feat/document-editing-tiptap`, single PR. No feature flag: the editor is a
full swap and both old entry points go away at the same time. Lazy data migration makes
this safe — existing templates keep working until someone edits them.

Post-merge follow-up PR (tracked separately): drop `contentBlocks`, `documentSourceType`,
and `templateContent` columns after a 2-week stability window.

## 13. Risks & Open Questions

1. **`html-to-docx` image rendering.** Base64-inlined images from mammoth must round-trip.
   Mitigation: E2E test with an image-containing `.docx`.
2. **Complex tables.** Mammoth → HTML → TipTap can degrade merged cells. Mitigation:
   documented limitation; table fixtures in the test suite; toast warning surfaces mammoth
   messages.
3. **Backend bundle size.** `@tiptap/html` pulls in jsdom-like DOM. Acceptable (Node server,
   not browser). Verify API docker image size doesn't balloon > 50 MB.
4. **Shared TipTap config drift.** If the frontend adds an extension the backend doesn't
   load, serialisation becomes lossy. Mitigation: **single exported array** from
   `libs/common/src/lib/tiptap/extensions.ts`, imported by both sides. CI test asserts
   identity of extension name arrays.
5. **Placeholder chip accessibility.** Keyboard users must be able to delete chips. TipTap
   Mention handles this natively — verify in E2E.
6. **`.doc` (legacy) requests from users.** If users try to upload `.doc`, we show a clear
   error: "Only .docx files are supported. Save as .docx in Word and try again." File type
   check on accept attribute + runtime mime check.

## 14. Acceptance Criteria

- [ ] Both template-editor pages render the new `<RichDocEditor>`.
- [ ] `.docx` import works end-to-end in the editor.
- [ ] `.docx` export works end-to-end and produces a file that opens in Word/LibreOffice.
- [ ] Placeholders insert as chips, serialise as `{{key}}`, and resolve during
      "Generate document" / "Send offer".
- [ ] Existing templates with `contentBlocks` open correctly via lazy migration.
- [ ] Existing documents/offers flows (generate, send) remain green in E2E.
- [ ] Backend `docx-block-renderer.service.ts` deleted. `docx-generation.service.ts`
      shrunk to < 200 lines.
- [ ] Frontend `components/template-editor/**` deleted.
- [ ] New migration `AddTiptapContentToTemplates` runs cleanly against a production-like
      snapshot.
