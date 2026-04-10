import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { KsefSyncRequestDto, KsefSyncResultDto } from '../dto';
import { KsefDownloadService } from '../services/ksef-download.service';

@ApiTags('KSeF - Download')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/download')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
export class KsefDownloadController {
  constructor(
    private readonly downloadService: KsefDownloadService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Sync incoming invoices from KSeF',
    description:
      'Queries KSeF for incoming invoices in the specified date range and downloads new ones.',
  })
  @ApiResponse({ status: 200, type: KsefSyncResultDto })
  @RequirePermission('ksef', 'write')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sync(
    @Body() dto: KsefSyncRequestDto,
    @CurrentUser() user: User,
  ): Promise<KsefSyncResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.downloadService.syncIncoming(
      companyId,
      user.id,
      dto.dateFrom,
      dto.dateTo,
    );
  }

  @Get(':ksefNumber')
  @ApiOperation({
    summary: 'Download a single invoice from KSeF',
    description: 'Downloads and saves a specific invoice by its KSeF number.',
  })
  @ApiParam({
    name: 'ksefNumber',
    type: 'string',
    description: 'KSeF invoice number',
  })
  @ApiResponse({ status: 200, description: 'Downloaded invoice data' })
  @RequirePermission('ksef', 'read')
  async downloadSingle(
    @Param('ksefNumber') ksefNumber: string,
    @CurrentUser() user: User,
  ) {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.downloadService.downloadSingle(ksefNumber, companyId, user.id);
  }

  @Post('query')
  @ApiOperation({
    summary: 'Query invoice metadata from KSeF',
    description:
      'Queries KSeF for invoice metadata (headers) matching the specified criteria.',
  })
  @ApiResponse({ status: 200, description: 'List of invoice metadata' })
  @RequirePermission('ksef', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async queryMetadata(
    @Body() dto: KsefSyncRequestDto,
    @CurrentUser() user: User,
  ) {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.downloadService.queryInvoiceMetadata(
      { dateFrom: dto.dateFrom, dateTo: dto.dateTo },
      companyId,
      user.id,
    );
  }
}
