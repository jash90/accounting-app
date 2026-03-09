import type { ReactNode } from 'react';

interface InfoItemProps {
  label: string;
  value: ReactNode;
}

/**
 * A reusable component for displaying label-value pairs.
 * Commonly used in detail pages to show entity information.
 */
export function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="text-foreground font-medium">{value || '-'}</div>
    </div>
  );
}
