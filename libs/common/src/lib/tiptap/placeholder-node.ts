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
