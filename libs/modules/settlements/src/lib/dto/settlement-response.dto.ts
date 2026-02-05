import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SettlementStatus, TaxScheme } from '@accounting/common';

export class ClientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nip?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: TaxScheme })
  taxScheme?: TaxScheme;

  @ApiProperty()
  isActive!: boolean;
}

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class SettlementStatusHistoryDto {
  @ApiProperty({ enum: SettlementStatus })
  status!: SettlementStatus;

  @ApiProperty()
  changedAt!: string;

  @ApiProperty()
  changedById!: string;

  @ApiPropertyOptional()
  changedByEmail?: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class SettlementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional({ type: ClientSummaryDto })
  client?: ClientSummaryDto;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiPropertyOptional({ type: UserSummaryDto })
  assignedUser?: UserSummaryDto | null;

  @ApiPropertyOptional()
  assignedById?: string | null;

  @ApiPropertyOptional({ type: UserSummaryDto })
  assignedBy?: UserSummaryDto | null;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  year!: number;

  @ApiProperty({ enum: SettlementStatus })
  status!: SettlementStatus;

  @ApiPropertyOptional()
  documentsDate?: string | null;

  @ApiProperty()
  invoiceCount!: number;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  settledAt?: string | null;

  @ApiPropertyOptional()
  settledById?: string | null;

  @ApiPropertyOptional({ type: UserSummaryDto })
  settledBy?: UserSummaryDto | null;

  @ApiProperty()
  priority!: number;

  @ApiPropertyOptional()
  deadline?: string | null;

  @ApiProperty()
  documentsComplete!: boolean;

  @ApiProperty()
  requiresAttention!: boolean;

  @ApiPropertyOptional()
  attentionReason?: string | null;

  @ApiPropertyOptional({ type: [SettlementStatusHistoryDto] })
  statusHistory?: SettlementStatusHistoryDto[];

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SettlementCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  settlementId!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ type: UserSummaryDto })
  user?: UserSummaryDto;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: string;
}

export class InitializeMonthResultDto {
  @ApiProperty({ description: 'Number of settlements created' })
  created!: number;

  @ApiProperty({ description: 'Number of settlements skipped (already exist)' })
  skipped!: number;
}

export class BulkAssignResultDto {
  @ApiProperty({ description: 'Number of settlements assigned' })
  assigned!: number;

  @ApiProperty({ description: 'Number of settlements requested' })
  requested!: number;

  @ApiProperty({
    description: 'Settlement IDs that were not found or skipped',
    type: [String],
  })
  skippedIds!: string[];
}
