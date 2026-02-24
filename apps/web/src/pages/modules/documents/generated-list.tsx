import { FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeneratedDocuments } from '@/lib/hooks/use-documents';

export default function GeneratedDocumentsListPage() {
  const { data: documents, isLoading } = useGeneratedDocuments();

  if (isLoading) return <div className="p-6">Ładowanie...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Wygenerowane dokumenty</h1>

      {documents?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Brak wygenerowanych dokumentów.
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
              <span className="text-sm text-muted-foreground">
                {new Date(doc.createdAt).toLocaleDateString('pl-PL')}
              </span>
            </CardHeader>
            {doc.sourceModule && (
              <CardContent>
                <p className="text-sm text-muted-foreground">Moduł: {doc.sourceModule}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
