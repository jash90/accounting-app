import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { EmailAttachmentService } from '../services/email-attachment.service';
import { EmailClientService } from '../services/email-client.service';

/**
 * Email Messages Controller
 *
 * Handles email operations: fetch inbox, send emails, manage messages
 */
@ApiTags('Email Client - Messages')
@ApiBearerAuth()
@Controller('modules/email-client/messages')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('email-client')
export class EmailMessagesController {
  constructor(
    private readonly emailClientService: EmailClientService,
    private readonly attachmentService: EmailAttachmentService
  ) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Fetch inbox emails (real-time from IMAP)' })
  @ApiResponse({ status: 200, description: 'List of inbox emails' })
  @RequirePermission('email-client', 'read')
  async getInbox(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('unseenOnly') unseenOnly?: boolean
  ) {
    return this.emailClientService.getInbox(user, {
      limit: limit ? parseInt(limit.toString()) : 50,
      unseenOnly: unseenOnly === true,
    });
  }

  @Get('folders')
  @ApiOperation({ summary: 'List available email folders' })
  @ApiResponse({ status: 200, description: 'List of folder names' })
  @RequirePermission('email-client', 'read')
  async listFolders(@CurrentUser() user: User) {
    return this.emailClientService.listFolders(user);
  }

  @Get('folder/:folderName')
  @ApiOperation({ summary: 'Fetch emails from specific folder' })
  @ApiResponse({ status: 200, description: 'List of emails from folder' })
  @RequirePermission('email-client', 'read')
  async getFolder(
    @CurrentUser() user: User,
    @Param('folderName') folderName: string,
    @Query('limit') limit?: number
  ) {
    return this.emailClientService.getFolder(user, folderName, {
      limit: limit ? parseInt(limit.toString()) : 50,
    });
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Fetch single email by UID' })
  @ApiResponse({ status: 200, description: 'Email details with content' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  @RequirePermission('email-client', 'read')
  async getEmail(@CurrentUser() user: User, @Param('uid', ParseIntPipe) uid: number) {
    return this.emailClientService.getEmail(user, uid);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send email and save to Sent folder' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @RequirePermission('email-client', 'write')
  async sendEmail(
    @CurrentUser() user: User,
    @Body()
    dto: {
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: string[];
    }
  ) {
    // Transform attachment paths to EmailAttachment objects with absolute paths
    const attachments = dto.attachments?.map((relativePath) => ({
      path: this.attachmentService.getAbsolutePath(relativePath),
      filename: relativePath.split('/').pop() || 'attachment',
    }));

    await this.emailClientService.sendEmail(user, {
      ...dto,
      attachments,
    });
    return { success: true, message: 'Email sent and saved to Sent folder' };
  }

  @Patch('mark-read')
  @ApiOperation({ summary: 'Mark emails as read' })
  @ApiResponse({ status: 200, description: 'Emails marked as read' })
  @RequirePermission('email-client', 'write')
  async markAsRead(@CurrentUser() user: User, @Body() dto: { messageUids: number[] }) {
    await this.emailClientService.markAsRead(user, dto.messageUids);
    return { success: true };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete emails (move to trash)' })
  @ApiResponse({ status: 200, description: 'Emails deleted' })
  @RequirePermission('email-client', 'delete')
  async deleteEmails(@CurrentUser() user: User, @Body() dto: { messageUids: number[] }) {
    await this.emailClientService.deleteEmail(user, dto.messageUids);
    return { success: true };
  }
}
