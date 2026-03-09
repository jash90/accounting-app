import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LeadSource, LeadStatus, OfferActivityType, OfferStatus } from '@accounting/common';

// Lead Response DTOs
export class LeadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nip?: string;
  @ApiPropertyOptional() regon?: string;
  @ApiPropertyOptional() street?: string;
  @ApiPropertyOptional() postalCode?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() contactPerson?: string;
  @ApiPropertyOptional() contactPosition?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiProperty({ enum: LeadStatus }) status!: LeadStatus;
  @ApiPropertyOptional({ enum: LeadSource }) source?: LeadSource;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() estimatedValue?: number;
  @ApiPropertyOptional() assignedToId?: string;
  @ApiPropertyOptional() assignedTo?: { id: string; firstName: string; lastName: string };
  @ApiPropertyOptional() convertedToClientId?: string;
  @ApiPropertyOptional() convertedAt?: Date;
  @ApiProperty() companyId!: string;
  @ApiProperty() createdById!: string;
  @ApiPropertyOptional() createdBy?: { id: string; firstName: string; lastName: string };
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedLeadsResponseDto {
  @ApiProperty({ type: [LeadResponseDto] }) data!: LeadResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

// Offer Template Response DTOs
export class OfferTemplateResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() templateFilePath?: string;
  @ApiPropertyOptional() templateFileName?: string;
  @ApiPropertyOptional() availablePlaceholders?: Array<{
    key: string;
    label: string;
    description?: string;
    defaultValue?: string;
  }>;
  @ApiPropertyOptional() defaultServiceItems?: Array<{
    name: string;
    description?: string;
    unitPrice: number;
    quantity: number;
    unit?: string;
  }>;
  @ApiProperty() defaultValidityDays!: number;
  @ApiProperty() defaultVatRate!: number;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() companyId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedOfferTemplatesResponseDto {
  @ApiProperty({ type: [OfferTemplateResponseDto] }) data!: OfferTemplateResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

// Offer Response DTOs
export class RecipientSnapshotDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nip?: string;
  @ApiPropertyOptional() regon?: string;
  @ApiPropertyOptional() street?: string;
  @ApiPropertyOptional() postalCode?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() contactPerson?: string;
  @ApiPropertyOptional() contactPosition?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
}

export class OfferServiceItemResponseDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() unit?: string;
  @ApiProperty() netAmount!: number;
}

export class ServiceTermsResponseDto {
  @ApiProperty({ type: [OfferServiceItemResponseDto] }) items!: OfferServiceItemResponseDto[];
  @ApiPropertyOptional() paymentTermDays?: number;
  @ApiPropertyOptional() paymentMethod?: string;
  @ApiPropertyOptional() additionalTerms?: string;
}

export class OfferResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() offerNumber!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: OfferStatus }) status!: OfferStatus;
  @ApiPropertyOptional() clientId?: string;
  @ApiPropertyOptional() client?: { id: string; name: string; nip?: string };
  @ApiPropertyOptional() leadId?: string;
  @ApiPropertyOptional() lead?: LeadResponseDto;
  @ApiProperty({ type: RecipientSnapshotDto }) recipientSnapshot!: RecipientSnapshotDto;
  @ApiPropertyOptional() templateId?: string;
  @ApiPropertyOptional() template?: { id: string; name: string };
  @ApiProperty() totalNetAmount!: number;
  @ApiProperty() vatRate!: number;
  @ApiProperty() totalGrossAmount!: number;
  @ApiPropertyOptional({ type: ServiceTermsResponseDto }) serviceTerms?: ServiceTermsResponseDto;
  @ApiPropertyOptional() customPlaceholders?: Record<string, string>;
  @ApiProperty() offerDate!: Date;
  @ApiProperty() validUntil!: Date;
  @ApiPropertyOptional() generatedDocumentPath?: string;
  @ApiPropertyOptional() generatedDocumentName?: string;
  @ApiPropertyOptional() sentAt?: Date;
  @ApiPropertyOptional() sentToEmail?: string;
  @ApiPropertyOptional() sentById?: string;
  @ApiPropertyOptional() sentBy?: { id: string; firstName: string; lastName: string };
  @ApiPropertyOptional() emailSubject?: string;
  @ApiPropertyOptional() emailBody?: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() createdById!: string;
  @ApiPropertyOptional() createdBy?: { id: string; firstName: string; lastName: string };
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedOffersResponseDto {
  @ApiProperty({ type: [OfferResponseDto] }) data!: OfferResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

// Offer Activity Response DTOs
export class OfferActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() offerId!: string;
  @ApiProperty({ enum: OfferActivityType }) activityType!: OfferActivityType;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() metadata?: Record<string, unknown>;
  @ApiProperty() performedById!: string;
  @ApiPropertyOptional() performedBy?: { id: string; firstName: string; lastName: string };
  @ApiProperty() createdAt!: Date;
}

// Statistics DTOs
export class OfferStatisticsDto {
  @ApiProperty() totalOffers!: number;
  @ApiProperty() draftCount!: number;
  @ApiProperty() readyCount!: number;
  @ApiProperty() sentCount!: number;
  @ApiProperty() acceptedCount!: number;
  @ApiProperty() rejectedCount!: number;
  @ApiProperty() expiredCount!: number;
  @ApiProperty() totalValue!: number;
  @ApiProperty() acceptedValue!: number;
  @ApiProperty() conversionRate!: number;
}

export class LeadStatisticsDto {
  @ApiProperty() totalLeads!: number;
  @ApiProperty() newCount!: number;
  @ApiProperty() contactedCount!: number;
  @ApiProperty() qualifiedCount!: number;
  @ApiProperty() proposalSentCount!: number;
  @ApiProperty() negotiationCount!: number;
  @ApiProperty() convertedCount!: number;
  @ApiProperty() lostCount!: number;
  @ApiProperty() conversionRate!: number;
}

// Error Response DTO
export class OfferErrorResponseDto {
  @ApiProperty() statusCode!: number;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() error?: string;
}

// Success Response DTO
export class OfferSuccessResponseDto {
  @ApiProperty() message!: string;
}

// Standard placeholders response
export class StandardPlaceholdersResponseDto {
  @ApiProperty({ type: [Object] }) placeholders!: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}
