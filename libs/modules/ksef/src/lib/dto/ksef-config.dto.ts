import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { KsefAuthMethod, KsefEnvironment } from '@accounting/common';

export class UpsertKsefConfigDto {
  @ApiProperty({ enum: KsefEnvironment, description: 'Środowisko KSeF' })
  @IsEnum(KsefEnvironment)
  environment!: KsefEnvironment;

  @ApiProperty({ enum: KsefAuthMethod, description: 'Metoda uwierzytelniania' })
  @IsEnum(KsefAuthMethod)
  authMethod!: KsefAuthMethod;

  @ApiPropertyOptional({ description: 'Token autoryzacyjny KSeF' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ description: 'Certyfikat w formacie base64 (PFX/PEM)' })
  @IsOptional()
  @IsString()
  certificate?: string;

  @ApiPropertyOptional({ description: 'Hasło do certyfikatu' })
  @IsOptional()
  @IsString()
  certificatePassword?: string;

  @ApiPropertyOptional({ description: 'NIP firmy dla kontekstu KSeF' })
  @IsOptional()
  @IsString()
  @Length(10, 10)
  nip?: string;

  @ApiPropertyOptional({ description: 'Automatyczne wysyłanie faktur' })
  @IsOptional()
  @IsBoolean()
  autoSendEnabled?: boolean;
}

export class KsefConfigResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ enum: KsefEnvironment })
  environment!: KsefEnvironment;

  @ApiProperty({ enum: KsefAuthMethod })
  authMethod!: KsefAuthMethod;

  @ApiProperty()
  hasToken!: boolean;

  @ApiProperty()
  hasCertificate!: boolean;

  @ApiPropertyOptional()
  nip?: string;

  @ApiProperty()
  autoSendEnabled!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  lastConnectionTestAt?: string;

  @ApiPropertyOptional()
  lastConnectionTestResult?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class KsefConnectionTestResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ enum: KsefEnvironment })
  environment!: KsefEnvironment;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  responseTimeMs!: number;

  @ApiProperty()
  testedAt!: string;
}
