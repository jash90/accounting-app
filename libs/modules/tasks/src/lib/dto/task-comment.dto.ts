import { ApiProperty } from '@nestjs/swagger';

import { IsString, MaxLength, MinLength } from 'class-validator';

import { SanitizeWithFormatting } from '@accounting/common';

export class CreateTaskCommentDto {
  @ApiProperty({ description: 'Comment content', minLength: 1, maxLength: 5000 })
  @SanitizeWithFormatting()
  @IsString()
  @MinLength(1, { message: 'Treść komentarza jest wymagana' })
  @MaxLength(5000)
  content!: string;
}

export class UpdateTaskCommentDto {
  @ApiProperty({ description: 'Updated comment content', minLength: 1, maxLength: 5000 })
  @SanitizeWithFormatting()
  @IsString()
  @MinLength(1, { message: 'Treść komentarza jest wymagana' })
  @MaxLength(5000)
  content!: string;
}
