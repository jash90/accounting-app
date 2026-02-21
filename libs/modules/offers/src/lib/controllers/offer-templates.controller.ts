import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
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

import { UpdateContentBlocksDto } from '../dto/content-blocks.dto';
import {
  OfferErrorResponseDto,
  OfferSuccessResponseDto,
  OfferTemplateResponseDto,
  PaginatedOfferTemplatesResponseDto,
  StandardPlaceholdersResponseDto,
} from '../dto/offer-response.dto';
import {
  CreateOfferTemplateDto,
  OfferTemplateFiltersDto,
  UpdateOfferTemplateDto,
} from '../dto/offer-template.dto';
import { OfferTemplatesService } from '../services/offer-templates.service';

@ApiTags('Offers - Templates')
@ApiBearerAuth()
@ApiExtraModels(
  OfferTemplateResponseDto,
  PaginatedOfferTemplatesResponseDto,
  StandardPlaceholdersResponseDto,
  OfferErrorResponseDto,
  OfferSuccessResponseDto
)
@Controller('modules/offers/templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('offers')
export class OfferTemplatesController {
  constructor(private readonly templatesService: OfferTemplatesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all offer templates',
    description: 'Retrieves a paginated list of offer templates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of templates',
    type: PaginatedOfferTemplatesResponseDto,
  })
  @RequirePermission('offers', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@CurrentUser() user: User, @Query() filters: OfferTemplateFiltersDto) {
    return this.templatesService.findAll(user, filters);
  }

  @Get('placeholders')
  @ApiOperation({
    summary: 'Get standard placeholders',
    description: 'Returns the list of standard placeholders available for mail merge.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of standard placeholders',
    type: StandardPlaceholdersResponseDto,
  })
  @RequirePermission('offers', 'read')
  getStandardPlaceholders() {
    return this.templatesService.getStandardPlaceholders();
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default template',
    description: 'Returns the default template for the company, if set.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default template or null',
    type: OfferTemplateResponseDto,
  })
  @RequirePermission('offers', 'read')
  async findDefault(@CurrentUser() user: User) {
    return this.templatesService.findDefault(user);
  }

  @Get(':id/content-blocks')
  @ApiOperation({
    summary: 'Get content blocks for a template',
    description: 'Returns the content blocks and document source type for a template.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Content blocks data',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async getContentBlocks(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.templatesService.getContentBlocks(id, user);
  }

  @Patch(':id/content-blocks')
  @ApiOperation({
    summary: 'Update content blocks for a template',
    description: 'Updates the content blocks and/or document source type for a template.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: OfferTemplateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async updateContentBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentBlocksDto,
    @CurrentUser() user: User
  ) {
    return this.templatesService.updateContentBlocks(id, dto, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a template by ID',
    description: 'Retrieves detailed information about a specific template.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Template details',
    type: OfferTemplateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.templatesService.findOne(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new template',
    description: 'Creates a new offer template.',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: OfferTemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async create(@Body() dto: CreateOfferTemplateDto, @CurrentUser() user: User) {
    return this.templatesService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a template',
    description: 'Updates an existing template with partial data.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: OfferTemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.templatesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a template',
    description: 'Permanently deletes a template and its associated file.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
    type: OfferSuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.templatesService.remove(id, user);
    return { message: 'Szablon usunięty pomyślnie' };
  }

  @Post(':id/upload')
  @ApiOperation({
    summary: 'Upload template file',
    description: 'Uploads a DOCX file as the template for mail merge.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: OfferTemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
    type: OfferErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
    type: OfferErrorResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('offers', 'write')
  async uploadTemplateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
          }),
        ],
        fileIsRequired: true,
      })
    )
    file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    return this.templatesService.uploadTemplateFile(id, file, user);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download template file',
    description: 'Downloads the DOCX template file.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'File download',
    content: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Template or file not found',
    type: OfferErrorResponseDto,
  })
  @RequirePermission('offers', 'read')
  async downloadTemplateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const { buffer, fileName } = await this.templatesService.downloadTemplateFile(id, user);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
    res.send(buffer);
  }
}
