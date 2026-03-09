import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ description: 'NIP number', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  nip?: string;

  @ApiPropertyOptional({ description: 'REGON number', maxLength: 14 })
  @IsOptional()
  @IsString()
  @MaxLength(14)
  regon?: string;

  @ApiPropertyOptional({ description: 'Street address', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ description: 'City', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Bank account number', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Owner name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerName?: string;

  @ApiPropertyOptional({ description: 'KRS number', maxLength: 17 })
  @IsOptional()
  @IsString()
  @MaxLength(17)
  krs?: string;

  @ApiPropertyOptional({ description: 'Building number', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  buildingNumber?: string;

  @ApiPropertyOptional({ description: 'Apartment number', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  apartmentNumber?: string;

  @ApiPropertyOptional({ description: 'Owner first name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerFirstName?: string;

  @ApiPropertyOptional({ description: 'Owner last name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerLastName?: string;

  @ApiPropertyOptional({ description: 'Owner email', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerEmail?: string;

  @ApiPropertyOptional({ description: 'Owner phone', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ownerPhone?: string;

  @ApiPropertyOptional({ description: 'Bank name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Default email signature' })
  @IsOptional()
  @IsString()
  defaultEmailSignature?: string;

  @ApiPropertyOptional({ description: 'Default document footer' })
  @IsOptional()
  @IsString()
  defaultDocumentFooter?: string;
}

export class CompanyProfileResponseDto {
  id!: string;
  name!: string;
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
  apartmentNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  ownerName?: string | null;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  defaultEmailSignature?: string | null;
  defaultDocumentFooter?: string | null;
}
