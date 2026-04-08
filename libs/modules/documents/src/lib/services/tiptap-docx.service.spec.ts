import { TiptapDocxService, type TiptapJSONContent } from './tiptap-docx.service';

describe('TiptapDocxService', () => {
  const service = new TiptapDocxService();

  const helloDoc: TiptapJSONContent = {
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
    expect(filled).toContain('Hello,');
    expect(filled).toContain('Ada');
    expect(filled).not.toContain('{{name}}');
  });

  it('produces a .docx buffer (PK magic bytes)', async () => {
    const buffer = await service.render(helloDoc, { name: 'Ada' });
    expect(buffer.slice(0, 4).toString('hex')).toBe('504b0304');
  });
});
