import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-apptax-blue text-white hover:bg-apptax-blue/80',
        secondary: 'border-transparent bg-apptax-navy text-white hover:bg-apptax-navy/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'border-apptax-blue text-apptax-blue bg-transparent',
        success: 'border-transparent bg-emerald-500 text-white hover:bg-emerald-500/80',
        warning: 'border-transparent bg-amber-500 text-white hover:bg-amber-500/80',
        teal: 'border-transparent bg-apptax-teal text-white hover:bg-apptax-teal/80',
        muted: 'border-apptax-soft-teal bg-apptax-soft-teal text-apptax-navy/70 hover:bg-apptax-soft-teal/80',
        'soft-blue': 'border-apptax-light-blue/30 bg-apptax-light-blue/10 text-apptax-blue hover:bg-apptax-light-blue/20',
        'soft-teal': 'border-apptax-teal/30 bg-apptax-teal/10 text-apptax-teal hover:bg-apptax-teal/20',
        ai: 'border-transparent bg-gradient-to-r from-apptax-teal to-apptax-blue text-white ai-glow',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
