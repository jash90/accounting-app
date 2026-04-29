import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Certyfikat X.509 w formacie PEM' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.certificate && o.certificate.length > 0)
  @Matches(/^-----BEGIN CERTIFICATE-----/, {
    message: 'Certyfikat musi być w formacie PEM',
  })
  certificate?: string;

  @ApiPropertyOptional({ description: 'Klucz prywatny w formacie PEM' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.privateKey && o.privateKey.length > 0)
  @Matches(/^-----BEGIN (RSA |ENCRYPTED )?PRIVATE KEY-----/, {
    message: 'Klucz prywatny musi być w formacie PEM',
  })
  privateKey?: string;

  @ApiPropertyOptional({ description: 'Hasło do klucza prywatnego' })
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

  @ApiProperty()
  hasPrivateKey!: boolean;

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

export class KsefPublicKeyCertificateInfoDto {
  @ApiProperty({ description: 'Subject DN of the MoF-issued certificate' })
  subject!: string;

  @ApiProperty({ description: 'Issuer DN of the MoF-issued certificate' })
  issuer!: string;

  @ApiProperty({ description: 'Certificate valid-from (ISO timestamp)' })
  validFrom!: string;

  @ApiProperty({ description: 'Certificate valid-to (ISO timestamp)' })
  validTo!: string;

  @ApiProperty({ description: 'Usage tag — KsefTokenEncryption or SymmetricKeyEncryption' })
  usage!: string;
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

  @ApiPropertyOptional({
    type: [KsefPublicKeyCertificateInfoDto],
    description: 'MoF public certificates the API returned (one per usage). Useful for diagnosing env mismatches.',
  })
  publicKeyCertificates?: KsefPublicKeyCertificateInfoDto[];
}
