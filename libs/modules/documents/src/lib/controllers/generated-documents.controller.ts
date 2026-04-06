import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { GenerateDocumentDto } from '../dto/generated-document.dto';
import { GeneratedDocumentsService } from '../services/generated-documents.service';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('modules/documents/generated')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('documents')
export class GeneratedDocumentsController {
  constructor(private readonly service: GeneratedDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all generated documents' })
  @RequirePermission('documents', 'read')
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download generated document as PDF' })
  @RequirePermission('documents', 'read')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const { buffer, filename } = await this.service.generatePdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get generated document by ID' })
  @RequirePermission('documents', 'read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get rendered HTML content of a generated document' })
  @RequirePermission('documents', 'read')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async getContent(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.getRenderedContent(id, user);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a document from template' })
  @RequirePermission('documents', 'write')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  generate(@Body() dto: GenerateDocumentDto, @CurrentUser() user: User) {
    return this.service.generate(dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete generated document' })
  @RequirePermission('documents', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.service.remove(id, user);
    return { message: 'Dokument usunięty' };
  }
}
