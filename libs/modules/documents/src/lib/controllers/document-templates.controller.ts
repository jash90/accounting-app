import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { UpdateDocumentContentBlocksDto } from '../dto/content-blocks.dto';
import {
  CreateDocumentTemplateDto,
  ExportTiptapDocxDto,
  GenerateDocumentAiDto,
  UpdateDocumentTemplateDto,
  UpdateTiptapContentDto,
} from '../dto/document-template.dto';
import { DocumentAiService } from '../services/document-ai.service';
import { DocumentTemplatesService } from '../services/document-templates.service';
import { TiptapDocxService, type TiptapJSONContent } from '../services/tiptap-docx.service';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('modules/documents/templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('documents')
export class DocumentTemplatesController {
  constructor(
    private readonly service: DocumentTemplatesService,
    private readonly tiptapDocx: TiptapDocxService,
    private readonly documentAi: DocumentAiService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all document templates' })
  @RequirePermission('documents', 'read')
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user);
  }

  @Get(':id/content-blocks')
  @ApiOperation({ summary: 'Get content blocks for a document template' })
  @RequirePermission('documents', 'read')
  getContentBlocks(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getContentBlocks(id, user);
  }

  @Patch(':id/content-blocks')
  @ApiOperation({ summary: 'Update content blocks for a document template' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateContentBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentContentBlocksDto,
    @CurrentUser() user: User
  ) {
    return this.service.updateContentBlocks(id, dto, user);
  }

  @Get(':id/tiptap-content')
  @ApiOperation({ summary: 'Get TipTap JSON content for a document template' })
  @RequirePermission('documents', 'read')
  getTiptapContent(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getTiptapContent(id, user);
  }

  @Patch(':id/tiptap-content')
  @ApiOperation({ summary: 'Update TipTap JSON content for a document template' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateTiptapContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTiptapContentDto,
    @CurrentUser() user: User
  ) {
    return this.service.updateTiptapContent(id, dto, user);
  }

  @Post(':id/ai-generate')
  @ApiOperation({ summary: 'Generate document HTML content from a free-form prompt via AI' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async aiGenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDocumentAiDto,
    @CurrentUser() user: User
  ) {
    const template = await this.service.findOne(id, user);
    return this.documentAi.generate(user, {
      prompt: dto.prompt,
      templateName: template.name,
      placeholders: template.placeholders ?? [],
      category: template.category,
      currentHtml: dto.currentHtml,
    });
  }

  @Post(':id/export-docx')
  @ApiOperation({ summary: 'Render TipTap content to a downloadable .docx' })
  @RequirePermission('documents', 'read')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async exportDocx(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportTiptapDocxDto,
    @CurrentUser() user: User,
    @Res({ passthrough: false }) res: Response
  ) {
    const template = await this.service.findOne(id, user);
    const buffer = await this.tiptapDocx.render(
      dto.tiptapContent as unknown as TiptapJSONContent,
      dto.context ?? {}
    );
    const safeName = (template.name || 'document').replace(/[^\w\-. ]+/g, '_');
    res
      .status(200)
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      .setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`)
      .send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document template by ID' })
  @RequirePermission('documents', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create document template' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateDocumentTemplateDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document template' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document template' })
  @RequirePermission('documents', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.service.remove(id, user);
    return { message: 'Szablon dokumentu usunięty' };
  }
}
