import { useState } from 'react';

import type { Editor } from '@tiptap/react';
import { Bold, Image, Italic, Link2, List, ListOrdered, Underline } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface EmailEditorToolbarProps {
  editor: Editor;
  disabled?: boolean;
}

export function EmailEditorToolbar({ editor, disabled = false }: EmailEditorToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleInsertLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl('');
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageDialogOpen(false);
    setImageUrl('');
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Pogrubienie"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursywa"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Podkreślenie"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista punktowana"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerowana"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant={editor.isActive('link') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => setLinkDialogOpen(true)}
          title="Wstaw link"
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled}
          onClick={() => setImageDialogOpen(true)}
          title="Wstaw obraz"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wstaw link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleInsertLink}>Wstaw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wstaw obraz</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="image-url">URL obrazu</Label>
            <Input
              id="image-url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsertImage()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleInsertImage}>Wstaw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
