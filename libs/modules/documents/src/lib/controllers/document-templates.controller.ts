import {
  Body,
  Controller,
  Delete,
  Get,
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

import { UpdateDocumentContentBlocksDto } from '../dto/content-blocks.dto';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from '../dto/document-template.dto';
import { DocumentTemplatesService } from '../services/document-templates.service';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('modules/documents/templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('documents')
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

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
