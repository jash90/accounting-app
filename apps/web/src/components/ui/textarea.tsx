import type * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: React.Ref<HTMLTextAreaElement>;
}

function Textarea({ className, ref, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary/20 focus-visible:border-primary flex min-h-[120px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Textarea };
