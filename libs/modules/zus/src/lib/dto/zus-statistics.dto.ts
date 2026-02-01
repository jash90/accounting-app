import { ApiProperty } from '@nestjs/swagger';

import { ZusContributionStatus, ZusDiscountType } from '@accounting/common';

export class ZusStatisticsDto {
  @ApiProperty({ description: 'Total number of contributions' })
  totalContributions!: number;

  @ApiProperty({ description: 'Number of paid contributions' })
  paidContributions!: number;

  @ApiProperty({ description: 'Number of overdue contributions' })
  overdueContributions!: number;

  @ApiProperty({ description: 'Number of pending contributions' })
  pendingContributions!: number;

  @ApiProperty({ description: 'Total paid amount (grosze)' })
  totalPaidAmount!: number;

  @ApiProperty({ description: 'Total pending amount (grosze)' })
  totalPendingAmount!: number;

  @ApiProperty({ description: 'Total overdue amount (grosze)' })
  totalOverdueAmount!: number;

  @ApiProperty({ description: 'Total paid amount (PLN)' })
  totalPaidAmountPln!: string;

  @ApiProperty({ description: 'Total pending amount (PLN)' })
  totalPendingAmountPln!: string;

  @ApiProperty({ description: 'Total overdue amount (PLN)' })
  totalOverdueAmountPln!: string;

  @ApiProperty({ description: 'Number of clients with ZUS settings' })
  clientsWithSettings!: number;

  @ApiProperty({ description: 'Breakdown by discount type' })
  byDiscountType!: Record<ZusDiscountType, number>;

  @ApiProperty({ description: 'Breakdown by status' })
  byStatus!: Record<ZusContributionStatus, number>;
}

export class ZusUpcomingPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty()
  periodMonth!: number;

  @ApiProperty()
  periodYear!: number;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty({ description: 'Total amount (grosze)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Total amount (PLN)' })
  totalAmountPln!: string;

  @ApiProperty({ description: 'Days until due date (negative if overdue)' })
  daysUntilDue!: number;

  @ApiProperty({ description: 'Whether the payment is overdue' })
  isOverdue!: boolean;
}

export class ZusMonthlyComparisonDto {
  @ApiProperty()
  month!: number;

  @ApiProperty()
  year!: number;

  @ApiProperty({ description: 'Period label (e.g., "Styczeń 2025")' })
  periodLabel!: string;

  @ApiProperty({ description: 'Total social contributions (grosze)' })
  totalSocialAmount!: number;

  @ApiProperty({ description: 'Total health contributions (grosze)' })
  totalHealthAmount!: number;

  @ApiProperty({ description: 'Grand total (grosze)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Total social contributions (PLN)' })
  totalSocialAmountPln!: string;

  @ApiProperty({ description: 'Total health contributions (PLN)' })
  totalHealthAmountPln!: string;

  @ApiProperty({ description: 'Grand total (PLN)' })
  totalAmountPln!: string;

  @ApiProperty({ description: 'Number of contributions' })
  contributionsCount!: number;
}

export class GenerateMonthlyResultDto {
  @ApiProperty({ description: 'Number of contributions generated' })
  generated!: number;

  @ApiProperty({ description: 'Number of contributions skipped (already exist)' })
  skipped!: number;

  @ApiProperty({ description: 'Number of clients without ZUS settings' })
  noSettings!: number;
}
