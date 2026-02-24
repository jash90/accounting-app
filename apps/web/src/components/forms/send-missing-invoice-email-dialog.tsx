import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SendMissingInvoiceEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  statusType: 'MISSING_INVOICE_VERIFICATION' | 'MISSING_INVOICE';
  isPending?: boolean;
}

export function SendMissingInvoiceEmailDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  statusType,
  isPending,
}: SendMissingInvoiceEmailDialogProps) {
  const isVerification = statusType === 'MISSING_INVOICE_VERIFICATION';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isVerification
              ? 'Wysłać email o weryfikację faktury?'
              : 'Wysłać email o brakującą fakturę?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isVerification
              ? 'Czy chcesz wysłać do klienta email z prośbą o weryfikację faktury?'
              : 'Czy chcesz wysłać do klienta email z prośbą o dosłanie brakującej faktury?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Nie, pomiń</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Wysyłanie...' : 'Tak, wyślij'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
