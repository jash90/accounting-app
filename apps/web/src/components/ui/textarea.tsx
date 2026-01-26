import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary/20 focus-visible:border-primary flex min-h-[120px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
