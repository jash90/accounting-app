import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentTemplates, useGeneratedDocuments } from '@/lib/hooks/use-documents';

export default function DocumentsDashboardPage() {
  const { data: templates } = useDocumentTemplates();
  const { data: generated } = useGeneratedDocuments();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dokumenty</h1>
          <p className="text-muted-foreground">Zarządzaj szablonami i generowanymi dokumentami</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Szablony dokumentów</CardTitle>
            <CardDescription>Zdefiniowane szablony do generowania dokumentów</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{templates?.length ?? 0}</div>
            <Button asChild className="mt-4" size="sm">
              <Link to="templates">Zarządzaj szablonami</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wygenerowane dokumenty</CardTitle>
            <CardDescription>Historia wygenerowanych dokumentów</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{generated?.length ?? 0}</div>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link to="generated">Zobacz historię</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
