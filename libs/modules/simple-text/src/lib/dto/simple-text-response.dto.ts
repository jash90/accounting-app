import { ApiProperty } from '@nestjs/swagger';

export class SimpleTextResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
