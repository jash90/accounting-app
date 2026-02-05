import { type ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SettlementStatus, type SettlementResponseDto } from '@/lib/api/endpoints/settlements';
import { TaxSchemeLabels, type TaxScheme } from '@/types/enums';

import { ActionsCell, StatusCell } from './cell-components';

/**
 * Creates column definitions for the settlements list table.
 *
 * IMPORTANT: This function no longer takes isPending as a parameter.
 * The StatusCell component reads the pending state from context,
 * which means columns don't need to be recreated when isPending changes.
 * This prevents re-rendering all table cells on every status update.
 */
export function createSettlementsListColumns(): ColumnDef<SettlementResponseDto>[] {
  return [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const settlement = row.original;
        // StatusCell reads isPending from context - no inline callback needed
        return <StatusCell settlementId={settlement.id} currentStatus={settlement.status} />;
      },
    },
    {
      accessorKey: 'client.name',
      header: 'Klient',
      cell: ({ row }) => {
        const client = row.original.client;
        return (
          <div className="flex flex-col">
            <span className="text-apptax-navy font-medium">{client?.name || '-'}</span>
            {client?.email ? (
              <span className="text-muted-foreground text-xs">{client.email}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'client.nip',
      header: 'NIP',
      cell: ({ row }) => (
        <span className="text-apptax-navy/80 font-mono text-sm">
          {row.original.client?.nip || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'client.taxScheme',
      header: 'Forma opodatkowania',
      cell: ({ row }) => {
        const taxScheme = row.original.client?.taxScheme;
        // Validate that taxScheme is a valid TaxScheme key before using it
        const isValidTaxScheme = taxScheme && taxScheme in TaxSchemeLabels;
        return isValidTaxScheme ? (
          <Badge variant="secondary" className="text-xs">
            {TaxSchemeLabels[taxScheme as TaxScheme]}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'invoiceCount',
      header: 'Faktury',
      cell: ({ row }) => (
        <span className="text-apptax-navy font-medium">{row.original.invoiceCount}</span>
      ),
    },
    {
      accessorKey: 'documentsDate',
      header: 'Data dokumentów',
      cell: ({ row }) => {
        const date = row.original.documentsDate;
        return date ? (
          <span className="text-sm">{format(new Date(date), 'dd.MM.yyyy', { locale: pl })}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'assignedUser',
      header: 'Przypisany',
      cell: ({ row }) => {
        const assignedUser = row.original.assignedUser;
        if (!assignedUser) {
          return <span className="text-muted-foreground italic text-sm">Nieprzypisany</span>;
        }
        return (
          <span className="text-sm">
            {assignedUser.firstName && assignedUser.lastName
              ? `${assignedUser.firstName} ${assignedUser.lastName}`
              : assignedUser.email}
          </span>
        );
      },
    },
    {
      accessorKey: 'requiresAttention',
      header: 'Uwagi',
      cell: ({ row }) => {
        if (row.original.requiresAttention) {
          return (
            <div
              className="flex items-center gap-1 text-orange-600"
              title={row.original.attentionReason || 'Wymaga uwagi'}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Wymaga uwagi</span>
            </div>
          );
        }
        return null;
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notatki',
      cell: ({ row }) => {
        const notes = row.original.notes;
        return notes ? (
          <span
            className="block max-w-[150px] truncate text-sm text-muted-foreground"
            title={notes}
          >
            {notes}
          </span>
        ) : null;
      },
    },
    {
      accessorKey: 'settledBy',
      header: 'Rozliczył',
      cell: ({ row }) => {
        const settledBy = row.original.settledBy;
        if (!settledBy || row.original.status !== SettlementStatus.COMPLETED) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm">
            {settledBy.firstName && settledBy.lastName
              ? `${settledBy.firstName} ${settledBy.lastName}`
              : settledBy.email}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Akcje',
      cell: ({ row }) => {
        // ActionsCell uses context for callbacks - no inline functions needed
        return <ActionsCell settlementId={row.original.id} />;
      },
    },
  ];
}
