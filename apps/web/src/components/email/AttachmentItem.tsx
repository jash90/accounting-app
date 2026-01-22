import { FileIcon, X, Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { type Attachment, formatFileSize } from './AttachmentList';

interface AttachmentItemProps {
  attachment: Attachment;
  mode: 'compose' | 'view';
  index: number;
  onRemove?: (index: number) => void;
  getDownloadUrl?: (path: string) => string;
  isDownloading?: boolean;
}

export function AttachmentItem({
  attachment,
  mode,
  index,
  onRemove,
  getDownloadUrl,
  isDownloading,
}: AttachmentItemProps) {
  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon className="text-muted-foreground h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attachment.filename}</p>
          <p className="text-muted-foreground text-xs">{formatFileSize(attachment.size)}</p>
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
  );
}

export default AttachmentItem;
