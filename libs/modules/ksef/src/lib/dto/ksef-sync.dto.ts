import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

/**
 * Which side of KSeF the sync should pull from.
 *
 * - `incoming` — invoices where the configured NIP is the buyer (Subject2).
 *   Use this to import counterparty-issued purchase invoices.
 * - `outgoing` — invoices where the configured NIP is the seller (Subject1).
 *   Useful when we need to reconcile our own sales (e.g. recovering from a
 *   data loss or pulling invoices issued from a different system on the
 *   same NIP).
 * - `both` — runs both queries and dedupes by KSeF number.
 *
 * Default is `incoming` for backwards compatibility — the sync flow shipped
 * incoming-only.
 */
export enum KsefSyncDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  BOTH = 'both',
}

export class KsefSyncRequestDto {
  @ApiProperty({ description: 'Data od (ISO date string)' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Data do (ISO date string)' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({
    enum: KsefSyncDirection,
    default: KsefSyncDirection.INCOMING,
    description:
      'Kierunek synchronizacji. `incoming` (domyślne) pobiera faktury, gdzie firma jest nabywcą; `outgoing` — gdzie jest sprzedawcą; `both` — oba kierunki.',
  })
  @IsOptional()
  @IsEnum(KsefSyncDirection)
  direction?: KsefSyncDirection;
}

export class KsefSyncFailedInvoiceDto {
  @ApiProperty({ description: 'Numer KSeF faktury' })
  ksefNumber!: string;

  @ApiProperty({ description: 'Treść błędu' })
  error!: string;
}

export class KsefSyncResultDto {
  @ApiProperty({ description: 'Łączna liczba znalezionych faktur' })
  totalFound!: number;

  @ApiProperty({ description: 'Liczba nowych faktur' })
  newInvoices!: number;

  @ApiProperty({ description: 'Liczba zaktualizowanych faktur' })
  updatedInvoices!: number;

  @ApiProperty({ description: 'Liczba błędów' })
  errors!: number;

  @ApiProperty({ description: 'Data synchronizacji' })
  syncedAt!: string;

  @ApiProperty({ description: 'Szczegóły nieudanych faktur', type: [KsefSyncFailedInvoiceDto], required: false })
  failedInvoices?: KsefSyncFailedInvoiceDto[];
}
