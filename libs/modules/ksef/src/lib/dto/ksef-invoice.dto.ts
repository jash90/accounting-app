import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  KsefInvoiceDirection,
  KsefInvoiceStatus,
  KsefInvoiceType,
} from '@accounting/common';

// ── Nested DTOs ──────────────────────────────────────────────────────────

export class KsefInvoiceLineItemDto {
  @ApiProperty({ description: 'Opis pozycji' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ description: 'Ilość' })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Jednostka miary' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Cena jednostkowa netto' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitNetPrice!: number;

  @ApiProperty({ description: 'Kwota netto' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  netAmount!: number;

  @ApiProperty({ description: 'Stawka VAT (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  vatRate!: number;

  @ApiProperty({ description: 'Kwota VAT' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  vatAmount!: number;

  @ApiProperty({ description: 'Kwota brutto' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  grossAmount!: number;

  @ApiPropertyOptional({
    description: 'Kody GTU (np. GTU_01, GTU_12)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gtuCodes?: string[];
}

export class InvoiceBuyerDataDto {
  @ApiProperty({ description: 'Nazwa nabywcy' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'NIP nabywcy' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nip?: string;

  @ApiPropertyOptional({ description: 'Ulica' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ description: 'Miasto' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Kod pocztowy' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Kraj' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

// ── Create / Update ──────────────────────────────────────────────────────

export class CreateKsefInvoiceDto {
  @ApiProperty({ enum: KsefInvoiceType, description: 'Typ faktury' })
  @IsEnum(KsefInvoiceType)
  invoiceType!: KsefInvoiceType;

  @ApiProperty({ description: 'Data wystawienia (ISO date string)' })
  @IsDateString()
  issueDate!: string;

  @ApiPropertyOptional({ description: 'Termin płatności (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'ID klienta (istniejący)' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID klienta' })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Dane nabywcy (ręczne, jeśli brak clientId)',
    type: InvoiceBuyerDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceBuyerDataDto)
  buyerData?: InvoiceBuyerDataDto;

  @ApiProperty({
    description: 'Pozycje faktury',
    type: [KsefInvoiceLineItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Faktura musi zawierać co najmniej jedną pozycję' })
  @ValidateNested({ each: true })
  @Type(() => KsefInvoiceLineItemDto)
  lineItems!: KsefInvoiceLineItemDto[];

  @ApiPropertyOptional({ description: 'Metoda płatności' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Numer rachunku bankowego' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Uwagi do faktury' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'ID faktury korygowanej' })
  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy format ID faktury korygowanej' })
  correctedInvoiceId?: string;

  @ApiPropertyOptional({ description: 'Waluta (domyślnie PLN)', default: 'PLN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateKsefInvoiceDto extends PartialType(CreateKsefInvoiceDto) {}

// ── Query / Filters ──────────────────────────────────────────────────────

export class GetKsefInvoicesQueryDto {
  @ApiPropertyOptional({ enum: KsefInvoiceStatus, description: 'Filtruj po statusie' })
  @IsOptional()
  @IsEnum(KsefInvoiceStatus)
  status?: KsefInvoiceStatus;

  @ApiPropertyOptional({ enum: KsefInvoiceType, description: 'Filtruj po typie faktury' })
  @IsOptional()
  @IsEnum(KsefInvoiceType)
  invoiceType?: KsefInvoiceType;

  @ApiPropertyOptional({ enum: KsefInvoiceDirection, description: 'Filtruj po kierunku' })
  @IsOptional()
  @IsEnum(KsefInvoiceDirection)
  direction?: KsefInvoiceDirection;

  @ApiPropertyOptional({ description: 'Filtruj po ID klienta' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ description: 'Data od (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Data do (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Wyszukiwanie (numer faktury, nazwa nabywcy)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Numer strony',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Liczba wyników na stronę',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sortuj po polu',
    enum: ['issueDate', 'invoiceNumber', 'grossAmount', 'status', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['issueDate', 'invoiceNumber', 'grossAmount', 'status', 'createdAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Kierunek sortowania',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ── Response DTOs ────────────────────────────────────────────────────────

export class KsefInvoiceClientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nip?: string;
}

export class KsefInvoiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  clientId?: string | null;

  @ApiPropertyOptional({ type: KsefInvoiceClientSummaryDto })
  client?: KsefInvoiceClientSummaryDto | null;

  @ApiPropertyOptional()
  sessionId?: string | null;

  @ApiProperty({ enum: KsefInvoiceType })
  invoiceType!: KsefInvoiceType;

  @ApiProperty({ enum: KsefInvoiceDirection })
  direction!: KsefInvoiceDirection;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiPropertyOptional()
  ksefNumber?: string | null;

  @ApiPropertyOptional()
  ksefReferenceNumber?: string | null;

  @ApiProperty({ enum: KsefInvoiceStatus })
  status!: KsefInvoiceStatus;

  @ApiProperty()
  issueDate!: string;

  @ApiPropertyOptional()
  dueDate?: string | null;

  @ApiProperty()
  sellerNip!: string;

  @ApiProperty()
  sellerName!: string;

  @ApiPropertyOptional()
  buyerNip?: string | null;

  @ApiProperty()
  buyerName!: string;

  @ApiProperty()
  netAmount!: number;

  @ApiProperty()
  vatAmount!: number;

  @ApiProperty()
  grossAmount!: number;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional({ type: [Object] })
  lineItems?: Record<string, unknown>[] | null;

  @ApiPropertyOptional({ type: [Object] })
  validationErrors?: Record<string, unknown>[] | null;

  @ApiPropertyOptional()
  submittedAt?: string | null;

  @ApiPropertyOptional()
  acceptedAt?: string | null;

  @ApiPropertyOptional()
  rejectedAt?: string | null;

  @ApiPropertyOptional()
  correctedInvoiceId?: string | null;

  @ApiProperty()
  createdById!: string;

  @ApiPropertyOptional()
  updatedById?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

// ── Batch submit result ──────────────────────────────────────────────────

export class KsefBatchSubmitItemResultDto {
  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  ksefNumber?: string;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class KsefBatchSubmitResultDto {
  @ApiProperty({ description: 'Łączna liczba faktur' })
  totalCount!: number;

  @ApiProperty({ description: 'Liczba wysłanych pomyślnie' })
  successCount!: number;

  @ApiProperty({ description: 'Liczba z błędami' })
  failedCount!: number;

  @ApiProperty({ type: [KsefBatchSubmitItemResultDto] })
  results!: KsefBatchSubmitItemResultDto[];
}

// ── Invoice status ───────────────────────────────────────────────────────

export class KsefInvoiceStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: KsefInvoiceStatus })
  status!: KsefInvoiceStatus;

  @ApiPropertyOptional()
  ksefNumber?: string | null;

  @ApiPropertyOptional()
  submittedAt?: string | null;

  @ApiPropertyOptional()
  acceptedAt?: string | null;

  @ApiPropertyOptional()
  rejectedAt?: string | null;

  @ApiPropertyOptional({ type: [Object] })
  validationErrors?: Record<string, unknown>[] | null;
}
