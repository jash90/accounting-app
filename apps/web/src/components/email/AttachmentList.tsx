import { AttachmentItem } from './AttachmentItem';

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
        <AttachmentItem
          key={`${attachment.path}-${index}`}
          attachment={attachment}
          mode={mode}
          index={index}
          onRemove={onRemove}
          getDownloadUrl={getDownloadUrl}
          isDownloading={isDownloading}
        />
      ))}
    </div>
  );
}

export default AttachmentList;
