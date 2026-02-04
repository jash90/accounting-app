import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO for fetching emails from IMAP
 */
export class FetchEmailsDto {
  @IsString()
  @IsOptional()
  mailbox?: string = 'INBOX';

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @IsBoolean()
  @IsOptional()
  unseenOnly?: boolean = false;

  @IsBoolean()
  @IsOptional()
  markAsSeen?: boolean = false;
}
