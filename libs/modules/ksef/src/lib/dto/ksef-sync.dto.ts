import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class KsefSyncRequestDto {
  @ApiProperty({ description: 'Data od (ISO date string)' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'Data do (ISO date string)' })
  @IsDateString()
  dateTo!: string;
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
}
