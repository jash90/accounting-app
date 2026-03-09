import { useState } from 'react';

import DOMPurify from 'dompurify';
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { BlockPreview } from '@/components/template-editor/block-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { documentsApi } from '@/lib/api/endpoints/documents';
import {
  useDeleteGeneratedDocument,
  useDownloadDocumentPdf,
  useGeneratedDocuments,
} from '@/lib/hooks/use-documents';
import { downloadBlob } from '@/lib/utils/download';
import { formatDate } from '@/lib/utils/format-date';
import type { ContentBlock } from '@/types/content-blocks';

export default function GeneratedDocumentsListPage() {
  const { data: documents, isLoading } = useGeneratedDocuments();
  const deleteDoc = useDeleteGeneratedDocument();
  const downloadPdf = useDownloadDocumentPdf();
  const [viewContent, setViewContent] = useState<{
    name: string;
    content: string;
    resolvedBlocks?: ContentBlock[];
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleView = async (id: string, name: string) => {
    setLoadingId(id);
    try {
      const doc = await documentsApi.getGeneratedDocument(id);
      const resolvedBlocks = doc.metadata?.resolvedBlocks;
      const content = doc.metadata?.renderedContent ?? '';
      setViewContent({ name, content, resolvedBlocks });
      setLoadingId(null);
    } catch {
      toast.error('Nie udało się załadować treści dokumentu');
      setLoadingId(null);
    }
  };

  const handleDownloadPdf = async (id: string, name: string) => {
    let blob: Blob | undefined;
    try {
      blob = await downloadPdf.mutateAsync(id);
    } catch {
      toast.error('Błąd podczas pobierania PDF');
      return;
    }
    if (!blob) return;
    const safeName = name.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, '');
    const result = downloadBlob(blob, `${safeName}.pdf`);
    const dlErrorMsg = result.error ?? 'Pobieranie nie powiodło się';
    if (!result.success) {
      toast.error(dlErrorMsg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc.mutateAsync(id);
      toast.success('Dokument usunięty');
    } catch {
      toast.error('Błąd podczas usuwania dokumentu');
    }
  };

  if (isLoading) return <div className="p-6">Ładowanie...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Wygenerowane dokumenty</h1>

      {documents?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak wygenerowanych dokumentów. Przejdź do zakładki Szablony i kliknij przycisk{' '}
            <strong>Generuj</strong>.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {documents?.map((doc) => (
          <Card key={doc.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {doc.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatDate(doc.createdAt)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Podgląd treści"
                  onClick={() => handleView(doc.id, doc.name)}
                  disabled={loadingId === doc.id}
                >
                  {loadingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Pobierz PDF"
                  onClick={() => handleDownloadPdf(doc.id, doc.name)}
                  disabled={downloadPdf.isPending && downloadPdf.variables === doc.id}
                >
                  {downloadPdf.isPending && downloadPdf.variables === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Usuń dokument"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {doc.sourceModule && (
              <CardContent>
                <p className="text-sm text-muted-foreground">Moduł: {doc.sourceModule}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!viewContent} onOpenChange={() => setViewContent(null)}>
        <DialogContent className="sm:max-w-[750px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewContent?.name}</DialogTitle>
          </DialogHeader>
          {viewContent?.resolvedBlocks?.length ? (
            <div className="overflow-y-auto flex-1 p-4">
              <BlockPreview blocks={viewContent.resolvedBlocks} />
            </div>
          ) : viewContent?.content && /<[a-z][\s\S]*>/i.test(viewContent.content) ? (
            <div className="overflow-y-auto flex-1 px-4 py-2">
              <div
                className="document-html-content mx-auto max-w-[210mm] rounded border bg-white p-12 shadow-md"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(viewContent.content),
                }}
              />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted rounded-md p-4 overflow-y-auto flex-1">
              {viewContent?.content}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
