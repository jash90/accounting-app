import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EmploymentType, VatStatus, TaxScheme, ZusStatus } from '@accounting/common';

export class ClientStatisticsDto {
  @ApiProperty({ description: 'Total number of clients' })
  total!: number;

  @ApiProperty({ description: 'Number of active clients' })
  active!: number;

  @ApiProperty({ description: 'Number of inactive (deleted) clients' })
  inactive!: number;

  @ApiProperty({
    description: 'Clients count by employment type',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byEmploymentType!: Record<EmploymentType, number>;

  @ApiProperty({
    description: 'Clients count by VAT status',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byVatStatus!: Record<VatStatus, number>;

  @ApiProperty({
    description: 'Clients count by tax scheme',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byTaxScheme!: Record<TaxScheme, number>;

  @ApiProperty({
    description: 'Clients count by ZUS status',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byZusStatus!: Record<ZusStatus, number>;

  @ApiProperty({ description: 'Clients added this month' })
  addedThisMonth!: number;

  @ApiProperty({ description: 'Clients added last 30 days' })
  addedLast30Days!: number;
}

export class RecentClientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nip?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  employmentType?: EmploymentType;

  @ApiProperty()
  createdAt!: Date;
}

export class RecentActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityName!: string;

  @ApiPropertyOptional()
  changedByName?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class ClientStatisticsWithRecentDto extends ClientStatisticsDto {
  @ApiProperty({ type: [RecentClientDto], description: 'Recently added clients' })
  recentlyAdded!: RecentClientDto[];

  @ApiProperty({ type: [RecentActivityDto], description: 'Recent activity on clients' })
  recentActivity!: RecentActivityDto[];
}
