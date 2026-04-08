
import { Injectable, Logger } from '@nestjs/common';

import Handlebars from 'handlebars';
// html-to-docx ships no types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import HTMLtoDOCX from 'html-to-docx';
import { createRequire } from 'node:module';

import { tiptapExtensions } from '@accounting/common';

// @tiptap/html v3.22 splits its entry into browser and server bundles. The
// "@tiptap/html/server" subpath export isn't picked up by webpack's
// moduleResolution=node, and the package's exports map blocks deep imports.
// We resolve the package, rewrite the path to the server bundle, and load
// it via createRequire so webpack treats it as a runtime require.
const requireFromNode = createRequire(__filename);
const mainCjsPath = requireFromNode.resolve('@tiptap/html');
const serverCjsPath = mainCjsPath.replace(/\/dist\/index\.cjs$/, '/dist/server/index.cjs');
const { generateHTML } = requireFromNode(serverCjsPath) as {
  generateHTML: (doc: unknown, extensions: unknown[]) => string;
};

export interface TiptapJSONContent {
  type: string;
  content?: TiptapJSONContent[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<Record<string, unknown>>;
}

/**
 * Pipeline for turning TipTap JSON into a downloadable .docx buffer.
 *
 * Flow: JSON → @tiptap/html → Handlebars.compile (placeholder substitution) → html-to-docx.
 * Used by both the documents and offers modules; lives here because documents owns the
 * generation surface area historically.
 */
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

    const fullDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${filled}</body></html>`;

    const result = (await HTMLtoDOCX(fullDoc, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    })) as unknown;

    if (Buffer.isBuffer(result)) return result;
    if (result instanceof ArrayBuffer) return Buffer.from(result);
    if (
      result &&
      typeof (result as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function'
    ) {
      return Buffer.from(await (result as Blob).arrayBuffer());
    }
    throw new Error('html-to-docx returned unexpected type');
  }
}
