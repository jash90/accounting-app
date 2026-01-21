import { useState, useCallback } from 'react';

import { Upload, Loader2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

import { AttachmentList, type Attachment, formatFileSize } from './AttachmentList';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface AttachmentUploadProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onUpload: (file: File) => Promise<Attachment>;
  isUploading?: boolean;
  maxFileSize?: number;
}

export function AttachmentUpload({
  attachments,
  onAttachmentsChange,
  onUpload,
  isUploading = false,
  maxFileSize = MAX_FILE_SIZE,
}: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        if (file.size > maxFileSize) {
          toast({
            title: 'Błąd',
            description: `Plik "${file.name}" przekracza limit ${formatFileSize(maxFileSize)}`,
            variant: 'destructive',
          });
          continue;
        }

        try {
          const result = await onUpload(file);
          onAttachmentsChange([...attachments, result]);
          toast({
            title: 'Sukces',
            description: `Przesłano "${file.name}"`,
          });
        } catch {
          toast({
            title: 'Błąd',
            description: `Nie udało się przesłać "${file.name}"`,
            variant: 'destructive',
          });
        }
      }
    },
    [attachments, maxFileSize, onAttachmentsChange, onUpload, toast]
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      onAttachmentsChange(attachments.filter((_, i) => i !== index));
    },
    [attachments, onAttachmentsChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  return (
    <div className="space-y-3">
      <Label>Załączniki</Label>

      {/* Drag & Drop Zone - keyboard accessible via the file input inside */}
      <div
        role="presentation"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isUploading
              ? 'Przesyłanie...'
              : 'Przeciągnij i upuść pliki tutaj lub kliknij, aby przeglądać'}
          </span>
          <span className="text-xs text-muted-foreground">
            Maksymalny rozmiar pliku: {formatFileSize(maxFileSize)}
          </span>
        </label>
      </div>

      {/* Uploaded Attachments List */}
      <AttachmentList attachments={attachments} mode="compose" onRemove={handleRemoveAttachment} />
    </div>
  );
}

export default AttachmentUpload;
