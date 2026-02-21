import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { Sanitize } from '@accounting/common';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content', minLength: 1, maxLength: 2000 })
  @Sanitize() // XSS protection: strips HTML tags and trims whitespace
  @IsString({ message: 'Komentarz musi być tekstem' })
  @IsNotEmpty({ message: 'Komentarz nie może być pusty' })
  @MinLength(1, { message: 'Komentarz nie może być pusty' })
  @MaxLength(2000, { message: 'Komentarz nie może przekraczać 2000 znaków' })
  @Matches(/\S/, { message: 'Komentarz nie może zawierać tylko białych znaków' }) // Prevents whitespace-only input after trim
  content!: string;
}
