import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSimpleTextDto {
  @ApiPropertyOptional({
    description: 'Text content',
    example: 'Updated text content',
    minLength: 1,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;
}

