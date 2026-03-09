import { useCallback, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { ArrowLeft, Columns2, Eye, Loader2, Pencil, Save } from 'lucide-react';

import { AddBlockMenu } from '@/components/template-editor/add-block-menu';
import { BlockList } from '@/components/template-editor/block-list';
import { BlockPreview } from '@/components/template-editor/block-preview';
import { createBlock } from '@/components/template-editor/block-types';
import { PlaceholderPicker } from '@/components/template-editor/placeholder-picker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDocumentTemplateContentBlocks,
  useUpdateDocumentTemplateContentBlocks,
} from '@/lib/hooks/use-document-template-content-blocks';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';
import { type ContentBlock, type ContentBlockType } from '@/types/content-blocks';

export default function DocumentTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('documents');

  const { data: contentData, isPending: isLoading } = useDocumentTemplateContentBlocks(id!);
  const updateMutation = useUpdateDocumentTemplateContentBlocks();

  // Local edits take priority over server data. When null, fall back to
  // server-loaded content so there's no async initialization effect needed.
  const [editedBlocks, setBlocks] = useState<ContentBlock[] | null>(null);
  const blocks = editedBlocks ?? contentData?.contentBlocks ?? null;

  const templatePlaceholders = contentData?.placeholders?.map((key) => ({
    key,
    label: key,
  }));

  const handleAddBlock = useCallback(
    (type: ContentBlockType) => {
      const currentBlocks = blocks || [];
      const newBlock = createBlock(type, currentBlocks.length);
      setBlocks([...currentBlocks, newBlock]);
    },
    [blocks]
  );

  const handleSave = useCallback(async () => {
    if (!id || !blocks) return;
    await updateMutation.mutateAsync({
      id,
      data: {
        contentBlocks: blocks,
        documentSourceType: 'blocks',
      },
    });
  }, [id, blocks, updateMutation]);

  const goBack = () => navigate(`${basePath}/templates`);

  const previewRef = useRef<HTMLDivElement>(null);

  const scrollToPreviewBlock = useCallback((blockId: string) => {
    const el = previewRef.current?.querySelector(`[data-block-id="${blockId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Wróć">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Edytor treści</h1>
            <p className="text-muted-foreground">
              {isLoading ? (
                <span className="inline-block h-4 w-48 animate-pulse rounded-md bg-muted" />
              ) : (
                contentData?.name || 'Szablon'
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack}>
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !blocks}
            className="bg-primary hover:bg-primary/90"
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Zapisz zmiany
          </Button>
        </div>
      </div>

      {/* Tabs: Edit / Preview */}
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">
            <Pencil className="mr-1.5 h-4 w-4" />
            Edycja
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-1.5 h-4 w-4" />
            Podgląd
          </TabsTrigger>
          <TabsTrigger value="split">
            <Columns2 className="mr-1.5 h-4 w-4" />
            Edycja + Podgląd
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <div className="mb-4 flex items-center gap-2">
            <AddBlockMenu onAdd={handleAddBlock} />
            <PlaceholderPicker placeholders={templatePlaceholders} />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <BlockList blocks={blocks || []} onChange={setBlocks} />
          )}
        </TabsContent>

        <TabsContent value="preview">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <BlockPreview blocks={blocks || []} />
          )}
        </TabsContent>

        <TabsContent value="split">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <AddBlockMenu onAdd={handleAddBlock} />
                <PlaceholderPicker placeholders={templatePlaceholders} />
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : (
                <BlockList
                  blocks={blocks || []}
                  onChange={setBlocks}
                  onBlockClick={scrollToPreviewBlock}
                />
              )}
            </div>
            <div ref={previewRef} className="overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : (
                <BlockPreview blocks={blocks || []} />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={goBack}>
          Anuluj
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !blocks}
          className="bg-primary hover:bg-primary/90"
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Zapisz zmiany
        </Button>
      </div>
    </div>
  );
}
