import { useCallback, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { type Editor } from '@tiptap/react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { RichDocEditor } from '@/components/rich-doc-editor/editor';
import { ExportDocxButton } from '@/components/rich-doc-editor/export-docx-button';
import { ImportDocxButton } from '@/components/rich-doc-editor/import-docx-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { documentsApi } from '@/lib/api/endpoints/documents';
import {
  useDocumentTemplateTiptapContent,
  useUpdateDocumentTemplateTiptapContent,
} from '@/lib/hooks/use-document-template-content-blocks';
import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';

export default function DocumentTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useModuleBasePath('documents');

  const { data, isPending } = useDocumentTemplateTiptapContent(id!);
  const updateMutation = useUpdateDocumentTemplateTiptapContent();

  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const value = draft ?? (data?.tiptapContent as Record<string, unknown> | null) ?? null;

  const handleChange = useCallback((json: Record<string, unknown>) => {
    setDraft(json);
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;
    const json = draft ?? (data?.tiptapContent as Record<string, unknown> | null);
    if (!json) return;
    await updateMutation.mutateAsync({ id, tiptapContent: json });
  }, [id, draft, data, updateMutation]);

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
          onReady={setEditorInstance}
          toolbarSlot={
            <>
              <ImportDocxButton editor={editorInstance} />
              <ExportDocxButton
                filename={data?.name ?? 'dokument'}
                fetchBlob={async () => {
                  if (!id) throw new Error('Brak identyfikatora szablonu');
                  const json = draft ?? (data?.tiptapContent as Record<string, unknown> | null);
                  if (!json) throw new Error('Brak treści do pobrania');
                  return documentsApi.exportTiptapDocx(id, json);
                }}
              />
            </>
          }
        />
      )}
    </div>
  );
}
