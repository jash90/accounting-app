import { ApiProperty } from '@nestjs/swagger';

export class UploadContextDto {
  @ApiProperty({
    description: 'File to upload (PDF, MD, or TXT)',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;
}
