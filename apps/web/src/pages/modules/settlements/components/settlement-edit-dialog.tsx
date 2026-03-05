import { useEffect } from 'react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  type SettlementResponseDto,
  type UpdateSettlementDto,
} from '@/lib/api/endpoints/settlements';

const settlementEditSchema = z
  .object({
    invoiceCount: z.number().int().min(0).optional(),
    documentsDate: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    requiresAttention: z.boolean().optional(),
    attentionReason: z.string().max(500).optional().nullable(),
    priority: z.number().int().min(0).max(10).optional(),
    deadline: z.string().optional().nullable(),
    documentsComplete: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.requiresAttention && !data.attentionReason) return false;
      return true;
    },
    { message: 'Powód wymagający uwagi jest wymagany', path: ['attentionReason'] }
  );

type SettlementEditFormData = z.infer<typeof settlementEditSchema>;

interface SettlementEditDialogProps {
  settlement: SettlementResponseDto | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateSettlementDto) => void;
  isPending?: boolean;
}

export function SettlementEditDialog({
  settlement,
  open,
  onClose,
  onSave,
  isPending,
}: SettlementEditDialogProps) {
  const form = useForm<SettlementEditFormData>({
    resolver: zodResolver(settlementEditSchema),
    defaultValues: {
      invoiceCount: 0,
      documentsDate: null,
      notes: null,
      requiresAttention: false,
      attentionReason: null,
      priority: 0,
      deadline: null,
      documentsComplete: false,
    },
  });

  const requiresAttention = form.watch('requiresAttention');

  useEffect(() => {
    if (settlement) {
      form.reset({
        invoiceCount: settlement.invoiceCount ?? 0,
        documentsDate: settlement.documentsDate
          ? new Date(settlement.documentsDate).toISOString().split('T')[0]
          : null,
        notes: settlement.notes ?? null,
        requiresAttention: settlement.requiresAttention ?? false,
        attentionReason: settlement.attentionReason ?? null,
        priority: settlement.priority ?? 0,
        deadline: settlement.deadline
          ? new Date(settlement.deadline).toISOString().split('T')[0]
          : null,
        documentsComplete: settlement.documentsComplete ?? false,
      });
    }
  }, [settlement, form]);

  const onSubmit = (data: SettlementEditFormData) => {
    if (!settlement) return;
    const dto: UpdateSettlementDto = {
      invoiceCount: data.invoiceCount,
      documentsDate: data.documentsDate ?? null,
      notes: data.notes ?? null,
      requiresAttention: data.requiresAttention,
      attentionReason: data.requiresAttention ? (data.attentionReason ?? null) : null,
      priority: data.priority,
      deadline: data.deadline ?? null,
      documentsComplete: data.documentsComplete,
    };
    onSave(settlement.id, dto);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj rozliczenie</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liczba faktur</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorytet (0–10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentsDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data dostarczenia dokumentów</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termin realizacji</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodaj notatki..."
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentsComplete"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">Dokumenty kompletne</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiresAttention"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">Wymaga uwagi</FormLabel>
                </FormItem>
              )}
            />

            {requiresAttention && (
              <FormField
                control={form.control}
                name="attentionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Powód wymagający uwagi</FormLabel>
                    <FormControl>
                      <Input placeholder="Opisz powód..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Zapisywanie...' : 'Zapisz'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
