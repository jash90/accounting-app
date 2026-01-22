import { useState } from 'react';

import {
  Upload,
  Trash2,
  FileText,
  File as FileIcon,
  FolderOpen,
  Sparkles,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useContextFiles,
  useUploadContextFile,
  useDeleteContextFile,
  useContextFile,
} from '@/lib/hooks/use-ai-agent';

export default function ContextFilesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const { data: files, isLoading } = useContextFiles();
  const { data: previewFile, isLoading: isLoadingPreview } = useContextFile(previewFileId);
  const uploadFile = useUploadContextFile();
  const deleteFile = useDeleteContextFile();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, TXT, and MD files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadFile.mutateAsync(selectedFile);
    setSelectedFile(null);
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this file? This will affect all AI responses.')) {
      await deleteFile.mutateAsync(id);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileIcon className="text-apptax-navy h-4 w-4" />;
    return <FileText className="text-apptax-blue h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-apptax-navy flex items-center gap-3">
          <div className="bg-apptax-teal ai-glow h-3 w-3 animate-pulse rounded-full" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-8">
      <div>
        <h1 className="text-apptax-navy flex items-center gap-3 text-3xl font-bold">
          Knowledge Base Files
          <div className="bg-apptax-teal ai-glow h-3 w-3 rounded-full" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload PDF, TXT, or MD files for the AI to use as context
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-apptax-soft-teal/30 hover:shadow-apptax-md transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-apptax-ai-gradient ai-glow flex h-10 w-10 items-center justify-center rounded-lg">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-apptax-navy">Upload New File</CardTitle>
              <CardDescription>
                Files are processed and used to enhance AI responses (Max 10MB, PDF/TXT/MD only)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                id="file-input"
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileSelect}
                disabled={uploadFile.isPending}
                className="border-apptax-soft-teal focus:border-apptax-blue"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadFile.isPending}
              className="bg-apptax-blue hover:bg-apptax-blue/90 shadow-apptax-sm hover:shadow-apptax-md transition-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {uploadFile.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          {selectedFile && (
            <p className="text-apptax-navy/70 mt-3 flex items-center gap-2 text-sm">
              <FileText className="text-apptax-teal h-4 w-4" />
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <FolderOpen className="text-apptax-teal h-5 w-5" />
            Uploaded Files
          </CardTitle>
          <CardDescription>{files?.length || 0} file(s) in knowledge base</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-apptax-navy/5 hover:bg-apptax-navy/5">
                <TableHead className="text-apptax-navy font-semibold">File</TableHead>
                <TableHead className="text-apptax-navy font-semibold">Type</TableHead>
                <TableHead className="text-apptax-navy font-semibold">Size</TableHead>
                <TableHead className="text-apptax-navy font-semibold">Uploaded By</TableHead>
                <TableHead className="text-apptax-navy font-semibold">Date</TableHead>
                <TableHead className="text-apptax-navy text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files?.map((file) => (
                <TableRow key={file.id} className="hover:bg-apptax-soft-teal/30 transition-colors">
                  <TableCell className="text-apptax-navy font-medium">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      {file.filename}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-apptax-soft-teal text-apptax-navy rounded-md px-2 py-1 text-xs font-medium">
                      {file.mimeType.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                  <TableCell>
                    {file.uploadedBy.firstName} {file.uploadedBy.lastName}
                  </TableCell>
                  <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewFileId(file.id)}
                        className="hover:bg-apptax-soft-teal"
                        title="Preview content"
                      >
                        <Eye className="text-apptax-blue h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteFile.isPending}
                        className="hover:bg-destructive/10"
                        title="Delete file"
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {files?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-apptax-soft-teal flex h-12 w-12 items-center justify-center rounded-full">
                        <FolderOpen className="text-apptax-teal h-6 w-6" />
                      </div>
                      <p>No files uploaded yet. Upload your first file to get started!</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewFileId} onOpenChange={(open) => !open && setPreviewFileId(null)}>
        <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle className="text-apptax-navy flex items-center gap-2">
              {previewFile && getFileIcon(previewFile.mimeType)}
              {previewFile?.filename || 'Loading...'}
            </DialogTitle>
            {previewFile && (
              <DialogDescription className="flex flex-wrap gap-4 text-sm">
                <span>
                  Type:{' '}
                  <span className="font-medium">
                    {previewFile.mimeType.split('/')[1]?.toUpperCase()}
                  </span>
                </span>
                <span>
                  Size: <span className="font-medium">{formatFileSize(previewFile.fileSize)}</span>
                </span>
                <span>
                  Uploaded:{' '}
                  <span className="font-medium">
                    {new Date(previewFile.createdAt).toLocaleDateString()} by{' '}
                    {previewFile.uploadedBy.firstName} {previewFile.uploadedBy.lastName}
                  </span>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-4 min-h-0 flex-1">
            <div className="text-apptax-navy mb-2 text-sm font-medium">Extracted Content:</div>
            {isLoadingPreview ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-apptax-teal h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="border-apptax-soft-teal bg-apptax-navy/5 h-[400px] w-full rounded-md border p-4">
                <pre className="text-apptax-navy/80 font-mono text-sm whitespace-pre-wrap">
                  {previewFile?.extractedText || 'No content extracted'}
                </pre>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
