import type * as React from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

interface DialogOverlayProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Overlay
> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Overlay>>;
}

function DialogOverlay({ className, ref, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Content>>;
}

function DialogContent({ className, children, ref, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-border bg-background p-6 duration-200',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background hover:bg-accent/10 focus:ring-ring/20 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-lg p-1 opacity-70 transition-all hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
          <X className="text-foreground h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse pt-4 sm:flex-row sm:justify-end sm:space-x-3',
        className
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Title>>;
}

function DialogTitle({ className, ref, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-foreground text-xl leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Description
> {
  ref?: React.Ref<React.ElementRef<typeof DialogPrimitive.Description>>;
}

function DialogDescription({ className, ref, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
