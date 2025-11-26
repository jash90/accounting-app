import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useContextFiles, useUploadContextFile, useDeleteContextFile } from '@/lib/hooks/use-ai-agent';
import { Upload, Trash2, FileText, File as FileIcon, FolderOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ContextFilesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { data: files, isLoading } = useContextFiles();
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
    if (mimeType === 'application/pdf') return <FileIcon className="h-4 w-4 text-apptax-navy" />;
    return <FileText className="h-4 w-4 text-apptax-blue" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-apptax-navy">
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-apptax-navy flex items-center gap-3">
          Knowledge Base Files
          <div className="w-3 h-3 rounded-full bg-apptax-teal ai-glow" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload PDF, TXT, or MD files for the AI to use as context
        </p>
      </div>

      {/* Upload Section */}
      <Card className="border-apptax-soft-teal/30 hover:shadow-apptax-md transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-apptax-ai-gradient rounded-lg flex items-center justify-center ai-glow">
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
          <div className="flex gap-4 items-end">
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
              <Sparkles className="h-4 w-4 mr-2" />
              {uploadFile.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          {selectedFile && (
            <p className="text-sm text-apptax-navy/70 mt-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-apptax-teal" />
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card className="border-apptax-soft-teal/30">
        <CardHeader>
          <CardTitle className="text-apptax-navy flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-apptax-teal" />
            Uploaded Files
          </CardTitle>
          <CardDescription>
            {files?.length || 0} file(s) in knowledge base
          </CardDescription>
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
                <TableHead className="text-right text-apptax-navy font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files?.map((file) => (
                <TableRow key={file.id} className="hover:bg-apptax-soft-teal/30 transition-colors">
                  <TableCell className="font-medium text-apptax-navy">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      {file.filename}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md bg-apptax-soft-teal text-apptax-navy text-xs font-medium">
                      {file.mimeType.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                  <TableCell>
                    {file.uploadedBy.firstName} {file.uploadedBy.lastName}
                  </TableCell>
                  <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      disabled={deleteFile.isPending}
                      className="hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {files?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-apptax-soft-teal flex items-center justify-center">
                        <FolderOpen className="h-6 w-6 text-apptax-teal" />
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
    </div>
  );
}
