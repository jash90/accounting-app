import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KsefDashboardStatsDto {
  @ApiProperty({ description: 'Łączna liczba faktur' })
  totalInvoices!: number;

  @ApiProperty({ description: 'Liczba szkiców' })
  draftCount!: number;

  @ApiProperty({ description: 'Liczba oczekujących' })
  pendingCount!: number;

  @ApiProperty({ description: 'Liczba zaakceptowanych' })
  acceptedCount!: number;

  @ApiProperty({ description: 'Liczba odrzuconych' })
  rejectedCount!: number;

  @ApiProperty({ description: 'Liczba z błędami' })
  errorCount!: number;

  @ApiProperty({ description: 'Czy istnieje aktywna sesja' })
  activeSessionExists!: boolean;

  @ApiPropertyOptional({ description: 'Data ostatniej synchronizacji' })
  lastSyncAt?: string;

  @ApiProperty({ description: 'Łączna kwota netto' })
  totalNetAmount!: number;

  @ApiProperty({ description: 'Łączna kwota brutto' })
  totalGrossAmount!: number;
}
