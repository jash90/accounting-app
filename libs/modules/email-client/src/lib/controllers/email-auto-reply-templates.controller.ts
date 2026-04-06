import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  CreateEmailAutoReplyTemplateDto,
  UpdateEmailAutoReplyTemplateDto,
} from '../dto/email-auto-reply-template.dto';
import { EmailAutoReplyTemplateService } from '../services/email-auto-reply-template.service';

@ApiTags('Email Auto-Reply Templates')
@ApiBearerAuth('JWT-auth')
@Controller('modules/email-client/auto-reply-templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('email-client')
export class EmailAutoReplyTemplatesController {
  constructor(private readonly service: EmailAutoReplyTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all auto-reply templates' })
  @RequirePermission('email-client', 'read')
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auto-reply template by ID' })
  @RequirePermission('email-client', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create auto-reply template' })
  @RequirePermission('email-client', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateEmailAutoReplyTemplateDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update auto-reply template' })
  @RequirePermission('email-client', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailAutoReplyTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete auto-reply template' })
  @RequirePermission('email-client', 'write')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.service.remove(id, user);
    return { message: 'Szablon auto-odpowiedzi usunięty' };
  }

  @Post(':id/test')
  @ApiOperation({
    summary: 'Test auto-reply template matching',
    description: "Simulates whether a given subject and body match this template's keywords.",
  })
  @HttpCode(HttpStatus.OK)
  @RequirePermission('email-client', 'read')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async testTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { subject: string; body?: string },
    @CurrentUser() user: User
  ) {
    const template = await this.service.findOne(id, user);
    const matches = this.service.matchesEmail(template, body.subject, body.body ?? '');
    return {
      matches,
      template: {
        id: template.id,
        name: template.name,
        triggerKeywords: template.triggerKeywords,
        keywordMatchMode: template.keywordMatchMode,
      },
    };
  }
}
