/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md',
        outline:
          'border-2 border-primary bg-background text-primary hover:bg-accent/10 shadow-sm hover:shadow-md',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md',
        ghost: 'text-foreground hover:bg-accent/10 transition-all',
        link: 'text-primary underline-offset-4 hover:underline',
        teal: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md ai-glow',
      },
      size: {
        default: 'h-10 px-5 py-2 min-w-[80px]',
        sm: 'h-9 rounded-lg px-4 min-w-[70px]',
        lg: 'h-11 rounded-lg px-8 min-w-[100px]',
        icon: 'h-10 w-10 min-w-[40px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
