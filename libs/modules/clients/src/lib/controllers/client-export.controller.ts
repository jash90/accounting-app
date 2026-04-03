import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { ApiCsvResponse, User } from '@accounting/common';
import { sendCsvResponse } from '@accounting/common/backend';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { ClientErrorResponseDto } from '../dto/client-response.dto';
import { ClientFiltersDto } from '../dto/client.dto';
import { ClientExportService } from '../services/export.service';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientExportController {
  constructor(private readonly exportService: ClientExportService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Export clients to CSV',
    description: 'Exports all clients matching the current filters to a CSV file.',
  })
  @ApiCsvResponse()
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async exportToCsv(
    @Query() filters: ClientFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const csvBuffer = await this.exportService.exportToCsv(filters, user);
    sendCsvResponse(res, csvBuffer, 'clients-export');
  }

  @Get('import/template')
  @ApiOperation({
    summary: 'Get CSV import template',
    description: 'Downloads a CSV template with headers and an example row.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV template file download',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  @RequirePermission('clients', 'read')
  async getImportTemplate(@Res() res: Response) {
    const template = this.exportService.generateCsvImportTemplate();
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients-import-template.csv"',
    });
    res.send(template);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import clients from CSV',
    description:
      'Imports clients from a CSV file. Clients with matching NIP will be updated, ' +
      'new clients will be created. Maximum file size: 5MB.',
  })
  @ApiResponse({ status: 200, description: 'Import result with counts' })
  @ApiResponse({ status: 400, description: 'Bad Request', type: ClientErrorResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('clients', 'write')
  async importFromCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(text\/csv|application\/vnd\.ms-excel|text\/plain)$/,
          }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new BadRequestException('Plik jest wymagany');
    }
    const content = file.buffer.toString('utf-8');
    return this.exportService.importFromCsv(content, user);
  }
}
