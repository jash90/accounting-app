import type * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-border shadow-sm hover:shadow-md',
        branded: 'border-accent/50 shadow-sm hover:shadow-md hover:border-accent',
        outline: 'border-accent bg-transparent shadow-none hover:bg-accent/20',
        ai: 'border-accent/30 shadow-sm hover:shadow-md ai-glow',
        interactive:
          'border-accent/30 shadow-sm hover:shadow-md hover:border-primary hover:-translate-y-1 cursor-pointer',
        elevated: 'border-transparent shadow-md hover:shadow-lg',
        flat: 'border-accent/30 shadow-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  ref?: React.Ref<HTMLDivElement>;
}

function Card({ className, variant, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

function CardHeader({ className, ref, ...props }: CardHeaderProps) {
  return <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

function CardTitle({ className, ref, ...props }: CardTitleProps) {
  return (
    <h3
      ref={ref}
      className={cn('text-foreground text-xl leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

function CardDescription({ className, ref, ...props }: CardDescriptionProps) {
  return <p ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

function CardContent({ className, ref, ...props }: CardContentProps) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

function CardFooter({ className, ref, ...props }: CardFooterProps) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
