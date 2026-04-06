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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { MoveMessagesDto } from '../dto/move-messages.dto';
import { UpdateFlagsDto } from '../dto/update-flags.dto';
import { EmailAttachmentService } from '../services/email-attachment.service';
import { EmailClientService } from '../services/email-client.service';

/**
 * Email Messages Controller
 *
 * Handles email operations: fetch inbox, send emails, manage messages
 */
@ApiTags('Email Client - Messages')
@ApiBearerAuth('JWT-auth')
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
    @Query('limit') limit?: string,
    @Query('unseenOnly') unseenOnly?: string,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: 'before' | 'after'
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;

    if (cursor) {
      return this.emailClientService.getInboxPaginated(user, {
        limit: limitNum,
        cursor: parseInt(cursor, 10),
        direction: direction || 'before',
      });
    }

    return this.emailClientService.getInbox(user, {
      limit: limitNum,
      unseenOnly: unseenOnly === 'true',
    });
  }

  @Get('folders')
  @ApiOperation({ summary: 'List available email folders' })
  @ApiResponse({ status: 200, description: 'List of folder names' })
  @RequirePermission('email-client', 'read')
  async listFolders(@CurrentUser() user: User) {
    return this.emailClientService.listFolders(user);
  }

  // IMPORTANT: 'search' must be before ':uid' to avoid being matched as a UID
  @Get('search')
  @ApiOperation({ summary: 'Search emails' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @RequirePermission('email-client', 'read')
  async searchEmails(
    @CurrentUser() user: User,
    @Query('q') query: string,
    @Query('field') field?: 'all' | 'subject' | 'from' | 'body',
    @Query('mailbox') mailbox?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: 'before' | 'after'
  ) {
    return this.emailClientService.searchEmails(user, {
      query: query || '',
      field: field || 'all',
      mailbox: mailbox || 'INBOX',
      limit: limit ? parseInt(limit, 10) : 50,
      cursor: cursor ? parseInt(cursor, 10) : undefined,
      direction: direction || 'before',
    });
  }

  // IMPORTANT: 'move' must be before ':uid' to avoid being matched as a UID
  @Post('move')
  @ApiOperation({ summary: 'Move messages between folders' })
  @ApiResponse({ status: 200, description: 'Messages moved' })
  @RequirePermission('email-client', 'write')
  async moveMessages(@CurrentUser() user: User, @Body() dto: MoveMessagesDto) {
    await this.emailClientService.moveMessages(
      user,
      dto.uids,
      dto.sourceMailbox,
      dto.destinationMailbox
    );
    return { success: true };
  }

  @Get('folder/:folderName')
  @ApiOperation({ summary: 'Fetch emails from specific folder' })
  @ApiResponse({ status: 200, description: 'List of emails from folder' })
  @RequirePermission('email-client', 'read')
  async getFolder(
    @CurrentUser() user: User,
    @Param('folderName') folderName: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: 'before' | 'after'
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;

    if (cursor) {
      return this.emailClientService.getFolderPaginated(user, folderName, {
        limit: limitNum,
        cursor: parseInt(cursor, 10),
        direction: direction || 'before',
      });
    }

    return this.emailClientService.getFolder(user, folderName, {
      limit: limitNum,
    });
  }

  // IMPORTANT: ':uid/flags' must be before ':uid' to avoid conflict
  @Patch(':uid/flags')
  @ApiOperation({ summary: 'Update email flags' })
  @ApiResponse({ status: 200, description: 'Updated flags' })
  @RequirePermission('email-client', 'write')
  async updateFlags(
    @CurrentUser() user: User,
    @Param('uid', ParseIntPipe) uid: number,
    @Body() dto: UpdateFlagsDto
  ) {
    return this.emailClientService.updateFlags(user, uid, dto);
  }

  // IMPORTANT: ':uid/attachments/:filename' must be before ':uid'
  @Get(':uid/attachments/:filename')
  @ApiOperation({ summary: 'Download email attachment' })
  @ApiResponse({ status: 200, description: 'Attachment file' })
  @RequirePermission('email-client', 'read')
  async downloadAttachment(
    @CurrentUser() user: User,
    @Param('uid', ParseIntPipe) uid: number,
    @Param('filename') filename: string,
    @Query('mailbox') mailbox: string | undefined,
    @Res() res: Response
  ) {
    const attachment = await this.emailClientService.getEmailAttachment(
      user,
      uid,
      decodeURIComponent(filename),
      mailbox
    );

    res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`
    );
    res.send(attachment.buffer);
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
  @ApiOperation({ summary: 'Delete emails (move to trash or permanent delete)' })
  @ApiResponse({ status: 200, description: 'Emails deleted' })
  @RequirePermission('email-client', 'delete')
  async deleteEmails(
    @CurrentUser() user: User,
    @Body() dto: { messageUids: number[]; mailbox?: string; permanent?: boolean }
  ) {
    await this.emailClientService.deleteEmail(
      user,
      dto.messageUids,
      dto.mailbox || 'INBOX',
      dto.permanent || false
    );
    return { success: true };
  }
}
