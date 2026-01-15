import { FileIcon, X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Attachment {
  path: string;
  filename: string;
  size: number;
}

interface AttachmentListProps {
  attachments: Attachment[];
  mode: 'compose' | 'view';
  onRemove?: (index: number) => void;
  getDownloadUrl?: (path: string) => string;
  isDownloading?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  mode,
  onRemove,
  getDownloadUrl,
  isDownloading,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <div
          key={`${attachment.path}-${index}`}
          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{attachment.filename}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
              </p>
            </div>
          </div>

          {mode === 'compose' && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {mode === 'view' && getDownloadUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <a
                href={getDownloadUrl(attachment.path)}
                download={attachment.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default AttachmentList;
