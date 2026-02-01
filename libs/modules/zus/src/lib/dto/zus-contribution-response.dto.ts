import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ZusContribution, ZusContributionStatus, ZusDiscountType } from '@accounting/common';

export class ClientBasicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  nip?: string;
}

export class UserBasicResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class ZusContributionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional({ type: () => ClientBasicResponseDto })
  client?: ClientBasicResponseDto;

  @ApiProperty()
  periodMonth!: number;

  @ApiProperty()
  periodYear!: number;

  @ApiProperty({ enum: ZusContributionStatus })
  status!: ZusContributionStatus;

  @ApiProperty()
  dueDate!: string;

  @ApiPropertyOptional()
  paidDate?: string;

  // Amounts in grosze
  @ApiProperty({ description: 'Składka emerytalna (grosze)' })
  retirementAmount!: number;

  @ApiProperty({ description: 'Składka rentowa (grosze)' })
  disabilityAmount!: number;

  @ApiProperty({ description: 'Składka chorobowa (grosze)' })
  sicknessAmount!: number;

  @ApiProperty({ description: 'Składka wypadkowa (grosze)' })
  accidentAmount!: number;

  @ApiProperty({ description: 'Fundusz Pracy (grosze)' })
  laborFundAmount!: number;

  @ApiProperty({ description: 'Składka zdrowotna (grosze)' })
  healthAmount!: number;

  @ApiProperty({ description: 'Suma składek społecznych (grosze)' })
  totalSocialAmount!: number;

  @ApiProperty({ description: 'Suma wszystkich składek (grosze)' })
  totalAmount!: number;

  // Formatted amounts in PLN (for display)
  @ApiProperty({ description: 'Składka emerytalna (PLN)' })
  retirementAmountPln!: string;

  @ApiProperty({ description: 'Składka rentowa (PLN)' })
  disabilityAmountPln!: string;

  @ApiProperty({ description: 'Składka chorobowa (PLN)' })
  sicknessAmountPln!: string;

  @ApiProperty({ description: 'Składka wypadkowa (PLN)' })
  accidentAmountPln!: string;

  @ApiProperty({ description: 'Fundusz Pracy (PLN)' })
  laborFundAmountPln!: string;

  @ApiProperty({ description: 'Składka zdrowotna (PLN)' })
  healthAmountPln!: string;

  @ApiProperty({ description: 'Suma składek społecznych (PLN)' })
  totalSocialAmountPln!: string;

  @ApiProperty({ description: 'Suma wszystkich składek (PLN)' })
  totalAmountPln!: string;

  // Basis
  @ApiProperty({ description: 'Podstawa składek społecznych (grosze)' })
  socialBasis!: number;

  @ApiProperty({ description: 'Podstawa składki zdrowotnej (grosze)' })
  healthBasis!: number;

  @ApiProperty({ description: 'Podstawa składek społecznych (PLN)' })
  socialBasisPln!: string;

  @ApiProperty({ description: 'Podstawa składki zdrowotnej (PLN)' })
  healthBasisPln!: string;

  @ApiProperty({ enum: ZusDiscountType })
  discountType!: ZusDiscountType;

  @ApiProperty()
  sicknessOptedIn!: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ type: () => UserBasicResponseDto })
  createdBy?: UserBasicResponseDto;

  @ApiPropertyOptional({ type: () => UserBasicResponseDto })
  updatedBy?: UserBasicResponseDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  /**
   * Maps entity to response DTO
   */
  static fromEntity(entity: ZusContribution): ZusContributionResponseDto {
    const dto = new ZusContributionResponseDto();

    dto.id = entity.id;
    dto.companyId = entity.companyId;
    dto.clientId = entity.clientId;
    dto.periodMonth = entity.periodMonth;
    dto.periodYear = entity.periodYear;
    dto.status = entity.status;
    dto.dueDate = entity.dueDate?.toISOString?.() ?? String(entity.dueDate);
    dto.paidDate = entity.paidDate
      ? (entity.paidDate?.toISOString?.() ?? String(entity.paidDate))
      : undefined;

    // Amounts in grosze
    dto.retirementAmount = entity.retirementAmount;
    dto.disabilityAmount = entity.disabilityAmount;
    dto.sicknessAmount = entity.sicknessAmount;
    dto.accidentAmount = entity.accidentAmount;
    dto.laborFundAmount = entity.laborFundAmount;
    dto.healthAmount = entity.healthAmount;
    dto.totalSocialAmount = entity.totalSocialAmount;
    dto.totalAmount = entity.totalAmount;

    // Formatted amounts in PLN
    dto.retirementAmountPln = formatGroszeToPln(entity.retirementAmount);
    dto.disabilityAmountPln = formatGroszeToPln(entity.disabilityAmount);
    dto.sicknessAmountPln = formatGroszeToPln(entity.sicknessAmount);
    dto.accidentAmountPln = formatGroszeToPln(entity.accidentAmount);
    dto.laborFundAmountPln = formatGroszeToPln(entity.laborFundAmount);
    dto.healthAmountPln = formatGroszeToPln(entity.healthAmount);
    dto.totalSocialAmountPln = formatGroszeToPln(entity.totalSocialAmount);
    dto.totalAmountPln = formatGroszeToPln(entity.totalAmount);

    // Basis
    dto.socialBasis = entity.socialBasis;
    dto.healthBasis = entity.healthBasis;
    dto.socialBasisPln = formatGroszeToPln(entity.socialBasis);
    dto.healthBasisPln = formatGroszeToPln(entity.healthBasis);

    dto.discountType = entity.discountType;
    dto.sicknessOptedIn = entity.sicknessOptedIn;
    dto.notes = entity.notes;

    dto.createdAt = entity.createdAt?.toISOString?.() ?? String(entity.createdAt);
    dto.updatedAt = entity.updatedAt?.toISOString?.() ?? String(entity.updatedAt);

    // Map relations if loaded
    if (entity.client) {
      dto.client = {
        id: entity.client.id,
        name: entity.client.name,
        nip: entity.client.nip,
      };
    }

    if (entity.createdBy) {
      dto.createdBy = {
        id: entity.createdBy.id,
        firstName: entity.createdBy.firstName,
        lastName: entity.createdBy.lastName,
      };
    }

    if (entity.updatedBy) {
      dto.updatedBy = {
        id: entity.updatedBy.id,
        firstName: entity.updatedBy.firstName,
        lastName: entity.updatedBy.lastName,
      };
    }

    return dto;
  }
}

export class PaginatedZusContributionsResponseDto {
  @ApiProperty({ type: () => [ZusContributionResponseDto] })
  data!: ZusContributionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Success message' })
  message!: string;
}

/**
 * Helper function to format grosze to PLN string
 */
function formatGroszeToPln(grosze: number): string {
  return (grosze / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
