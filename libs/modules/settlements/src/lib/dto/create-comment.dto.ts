import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { Sanitize } from '@accounting/common';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content', minLength: 1, maxLength: 2000 })
  @Sanitize() // XSS protection: strips HTML tags and trims whitespace
  @IsString()
  @IsNotEmpty({ message: 'Comment cannot be empty' })
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(2000, { message: 'Comment cannot exceed 2000 characters' })
  @Matches(/\S/, { message: 'Comment cannot contain only whitespace' }) // Prevents whitespace-only input after trim
  content!: string;
}
