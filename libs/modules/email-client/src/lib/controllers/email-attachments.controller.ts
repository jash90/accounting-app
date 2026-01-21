import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { EmailAttachmentService } from '../services/email-attachment.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Email Client - Attachments')
@ApiBearerAuth()
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
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
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

  @Get('download/*')
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
    @Param('0') filePath: string,
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
