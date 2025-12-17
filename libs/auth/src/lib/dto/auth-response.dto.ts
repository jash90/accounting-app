import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ required: false, nullable: true })
  companyId: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'ID aktywnej firmy (dla administratorów przełączonych na Firmę Testową)',
  })
  activeCompanyId: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Efektywne ID firmy używane do filtrowania danych (activeCompanyId lub companyId)',
  })
  effectiveCompanyId: string | null;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}

