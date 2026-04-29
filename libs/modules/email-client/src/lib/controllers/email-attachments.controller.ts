import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { EmailAttachmentService } from '../services/email-attachment.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * MIME-type whitelist for email attachments.
 *
 * Anchored to start (^) so a malicious upload can't smuggle a payload type
 * inside a longer string, e.g. `text/html;boundary=application/pdf`.
 *
 * Covers the realistic email-attachment surface: documents, images, spreadsheets,
 * archives, plain/csv text. Explicitly excludes executables, HTML, SVG (script
 * payload), and arbitrary `application/octet-stream`.
 */
const ALLOWED_MIME_PATTERN =
  /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|zip|x-zip-compressed|json)|image\/(jpeg|png|gif|webp|heic|heif)|text\/(plain|csv|markdown))$/;

@ApiTags('Email Client - Attachments')
@ApiBearerAuth('JWT-auth')
@Controller('modules/email-client/attachments')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('email-client')
export class EmailAttachmentsController {
  constructor(private readonly attachmentService: EmailAttachmentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload email attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the uploaded file' },
        filename: { type: 'string', description: 'Original filename' },
        size: { type: 'number', description: 'File size in bytes' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @RequirePermission('email-client', 'write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          // SECURITY: reject executables, HTML, SVG (XSS via download), and
          // arbitrary octet-streams. Whitelist of legitimate email attachments.
          new FileTypeValidator({ fileType: ALLOWED_MIME_PATTERN }),
        ],
        fileIsRequired: true,
      })
    )
    file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const path = await this.attachmentService.uploadAttachment(user, file);

    return {
      path,
      filename: file.originalname,
      size: file.size,
    };
  }

  @Get('download/*filePath')
  @ApiOperation({ summary: 'Download email attachment' })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Access denied or file not found' })
  @RequirePermission('email-client', 'read')
  async downloadAttachment(
    @CurrentUser() user: User,
    @Param('filePath') filePath: string,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.attachmentService.downloadAttachment(user, filePath);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
