import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
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

import {
  CalculateZusContributionDto,
  CreateZusContributionDto,
  GenerateMonthlyContributionsDto,
  GenerateMonthlyResultDto,
  MarkPaidDto,
  MessageResponseDto,
  PaginatedZusContributionsResponseDto,
  UpdateZusContributionDto,
  ZusContributionFiltersDto,
  ZusContributionResponseDto,
} from '../dto';
import { ZusContributionsService } from '../services';

@ApiTags('ZUS Contributions')
@ApiBearerAuth()
@Controller('modules/zus/contributions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('zus')
export class ZusContributionsController {
  constructor(private readonly contributionsService: ZusContributionsService) {}

  @Get()
  @RequirePermission('zus', 'read')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get all ZUS contributions with filters' })
  @ApiResponse({ status: 200, type: PaginatedZusContributionsResponseDto })
  async findAll(
    @CurrentUser() user: User,
    @Query() filters: ZusContributionFiltersDto
  ): Promise<PaginatedZusContributionsResponseDto> {
    return this.contributionsService.findAll(user, filters);
  }

  @Get('client/:clientId')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get ZUS contributions for a specific client' })
  @ApiResponse({ status: 200, type: [ZusContributionResponseDto] })
  async findByClient(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto[]> {
    return this.contributionsService.findByClient(clientId, user);
  }

  @Get(':id')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get ZUS contribution by ID' })
  @ApiResponse({ status: 200, type: ZusContributionResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto> {
    return this.contributionsService.findOne(id, user);
  }

  @Post()
  @RequirePermission('zus', 'write')
  @ApiOperation({ summary: 'Create a new ZUS contribution' })
  @ApiResponse({ status: 201, type: ZusContributionResponseDto })
  async create(
    @Body() dto: CreateZusContributionDto,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto> {
    return this.contributionsService.create(dto, user);
  }

  @Post('calculate')
  @RequirePermission('zus', 'write')
  @ApiOperation({ summary: 'Calculate ZUS contributions for a client' })
  @ApiResponse({ status: 200, type: ZusContributionResponseDto })
  async calculate(
    @Body() dto: CalculateZusContributionDto,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto> {
    return this.contributionsService.calculate(dto, user);
  }

  @Post('generate-monthly')
  @RequirePermission('zus', 'write')
  @ApiOperation({
    summary: 'Generate monthly contributions for all clients with ZUS settings',
  })
  @ApiResponse({ status: 200, type: GenerateMonthlyResultDto })
  async generateMonthly(
    @Body() dto: GenerateMonthlyContributionsDto,
    @CurrentUser() user: User
  ): Promise<GenerateMonthlyResultDto> {
    return this.contributionsService.generateMonthly(dto.month, dto.year, user);
  }

  @Patch(':id')
  @RequirePermission('zus', 'write')
  @ApiOperation({ summary: 'Update ZUS contribution' })
  @ApiResponse({ status: 200, type: ZusContributionResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZusContributionDto,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto> {
    return this.contributionsService.update(id, dto, user);
  }

  @Patch(':id/mark-paid')
  @RequirePermission('zus', 'write')
  @ApiOperation({ summary: 'Mark ZUS contribution as paid' })
  @ApiResponse({ status: 200, type: ZusContributionResponseDto })
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidDto,
    @CurrentUser() user: User
  ): Promise<ZusContributionResponseDto> {
    return this.contributionsService.markAsPaid(id, new Date(dto.paidDate), user);
  }

  @Delete(':id')
  @RequirePermission('zus', 'delete')
  @ApiOperation({ summary: 'Delete ZUS contribution' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.contributionsService.remove(id, user);
    return { message: 'Rozliczenie ZUS zostało usunięte' };
  }

  @Get('export/csv')
  @RequirePermission('zus', 'read')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Export ZUS contributions to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file with ZUS contributions' })
  async exportCsv(
    @Query() filters: ZusContributionFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ): Promise<void> {
    const { data } = await this.contributionsService.findAll(user, {
      ...filters,
      limit: 10000, // Max export limit
    });

    // Build CSV content
    const headers = [
      'ID',
      'Klient',
      'NIP',
      'Miesiąc',
      'Rok',
      'Status',
      'Termin płatności',
      'Data płatności',
      'Emerytalna (PLN)',
      'Rentowa (PLN)',
      'Chorobowa (PLN)',
      'Wypadkowa (PLN)',
      'Fundusz Pracy (PLN)',
      'Zdrowotna (PLN)',
      'Składki społeczne (PLN)',
      'Razem (PLN)',
      'Typ ulgi',
    ];

    const rows = data.map((c) => [
      c.id,
      c.client?.name ?? '',
      c.client?.nip ?? '',
      c.periodMonth,
      c.periodYear,
      c.status,
      c.dueDate,
      c.paidDate ?? '',
      c.retirementAmountPln,
      c.disabilityAmountPln,
      c.sicknessAmountPln,
      c.accidentAmountPln,
      c.laborFundAmountPln,
      c.healthAmountPln,
      c.totalSocialAmountPln,
      c.totalAmountPln,
      c.discountType,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zus-contributions-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  }
}
