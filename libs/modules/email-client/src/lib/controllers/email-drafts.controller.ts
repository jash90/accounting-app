import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { ModuleAccessGuard, PermissionGuard, RequireModule, RequirePermission } from '@accounting/rbac';
import { User } from '@accounting/common';
import { EmailDraftService } from '../services/email-draft.service';
import { EmailClientService } from '../services/email-client.service';
import { EmailAiService } from '../services/email-ai.service';
import { CreateDraftDto, UpdateDraftDto } from '../dto/create-draft.dto';
import { EmailAiOptionsDto } from '../dto/email-ai-options.dto';

@ApiTags('Email Client - Drafts')
@ApiBearerAuth()
@Controller('modules/email-client/drafts')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('email-client')
export class EmailDraftsController {
  constructor(
    private readonly draftService: EmailDraftService,
    private readonly emailClientService: EmailClientService,
    private readonly aiService: EmailAiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all drafts for company' })
  @ApiResponse({ status: 200, description: 'List of email drafts' })
  @RequirePermission('email-client', 'read')
  async findAll(@CurrentUser() user: User) {
    return this.draftService.findAll(user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my drafts only' })
  @ApiResponse({ status: 200, description: 'List of user drafts' })
  @RequirePermission('email-client', 'read')
  async findMyDrafts(@CurrentUser() user: User) {
    return this.draftService.findMyDrafts(user);
  }

  @Get('ai')
  @ApiOperation({ summary: 'Get AI-generated drafts' })
  @ApiResponse({ status: 200, description: 'List of AI drafts' })
  @RequirePermission('email-client', 'read')
  async findAiDrafts(@CurrentUser() user: User) {
    return this.draftService.findAiDrafts(user);
  }

  @Post('ai/generate-reply')
  @ApiOperation({ summary: 'Generate AI reply draft for an email' })
  @ApiResponse({ status: 201, description: 'AI draft generated' })
  @RequirePermission('email-client', 'write')
  async generateAiReply(
    @CurrentUser() user: User,
    @Body() dto: EmailAiOptionsDto,
  ) {
    // Fetch the original email from IMAP
    const originalEmail = await this.emailClientService.getEmail(user, dto.messageUid);

    // Generate AI reply draft using AI Agent module
    return this.aiService.generateReplyDraft(user, originalEmail, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get draft by ID' })
  @ApiResponse({ status: 200, description: 'Draft details' })
  @RequirePermission('email-client', 'read')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.draftService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @RequirePermission('email-client', 'write')
  async create(@CurrentUser() user: User, @Body() dto: CreateDraftDto) {
    return this.draftService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  @RequirePermission('email-client', 'write')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.draftService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete draft' })
  @ApiResponse({ status: 200, description: 'Draft deleted' })
  @RequirePermission('email-client', 'write')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.draftService.remove(user, id);
    return { success: true };
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send draft as email' })
  @ApiResponse({ status: 200, description: 'Draft sent as email' })
  @RequirePermission('email-client', 'write')
  async sendDraft(@CurrentUser() user: User, @Param('id') id: string) {
    const draft = await this.draftService.findOne(user, id);

    await this.emailClientService.sendEmail(user, {
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject || '',
      text: draft.textContent,
      html: draft.htmlContent,
    });

    // Delete draft after sending
    await this.draftService.remove(user, id);

    return { success: true, message: 'Draft sent and removed' };
  }
}
