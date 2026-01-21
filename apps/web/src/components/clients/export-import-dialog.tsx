import { useState, useRef } from 'react';

import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils/cn';

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<ImportResult>;
  onDownloadTemplate: () => Promise<void>;
  isExporting?: boolean;
  isImporting?: boolean;
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: { row: number; field: string; message: string }[];
}

export function ExportImportDialog({
  open,
  onOpenChange,
  onExport,
  onImport,
  onDownloadTemplate,
  isExporting = false,
  isImporting = false,
}: ExportImportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: 'Nieprawidłowy format pliku',
        description: 'Proszę wybrać plik CSV',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await onImport(selectedFile);
      setImportResult(result);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setActiveTab('export');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Eksport / Import klientów</DialogTitle>
          <DialogDescription>
            Eksportuj listę klientów do pliku CSV lub zaimportuj klientów z pliku.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Eksport</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="text-center py-8">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Eksport do CSV</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pobierz listę wszystkich klientów w formacie CSV. Plik będzie zawierał wszystkie
                aktualnie przefiltrowane dane.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Anuluj
              </Button>
              <Button onClick={onExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Eksportowanie...' : 'Eksportuj CSV'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {!importResult ? (
              <>
                <div
                  role="presentation"
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                    selectedFile && 'border-green-500 bg-green-50'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    id="csv-file-upload"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    aria-label="Wybierz plik CSV do importu"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div>
                      <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                      <p className="mt-2 font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button variant="link" size="sm" onClick={() => setSelectedFile(null)}>
                        Wybierz inny plik
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Przeciągnij plik CSV tutaj lub{' '}
                        <button
                          type="button"
                          className="text-primary underline hover:no-underline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          wybierz z dysku
                        </button>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nie masz szablonu?</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onDownloadTemplate}
                    className="h-auto p-0"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Pobierz szablon CSV
                  </Button>
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <p className="text-sm text-center">Importowanie...</p>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>
                    Anuluj
                  </Button>
                  <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? 'Importowanie...' : 'Importuj'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <Alert variant={importResult.errors.length > 0 ? 'destructive' : 'default'}>
                  {importResult.errors.length > 0 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertTitle>Import zakończony</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      <li>Zaimportowano: {importResult.imported} klientów</li>
                      <li>Zaktualizowano: {importResult.updated} klientów</li>
                      {importResult.errors.length > 0 && (
                        <li className="text-destructive">Błędów: {importResult.errors.length}</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>

                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    <p className="text-sm font-medium mb-2">Szczegóły błędów:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>
                          Wiersz {error.row}, pole &quot;{error.field}&quot;: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={handleClose}>Zamknij</Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
