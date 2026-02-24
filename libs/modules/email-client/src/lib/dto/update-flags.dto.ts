import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateFlagsDto {
  @ApiPropertyOptional({ type: [String], description: 'Flags to add (e.g. ["\\\\Flagged"])' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  add?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Flags to remove (e.g. ["\\\\Flagged"])' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  remove?: string[];

  @ApiPropertyOptional({ description: 'Mailbox name (default: INBOX)' })
  @IsOptional()
  @IsString()
  mailbox?: string;
}
