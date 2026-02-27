import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
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

import {
  DailyTimesheetDto,
  ExportFiltersDto,
  ExportFormat,
  ReportFiltersDto,
  WeeklyTimesheetDto,
} from '../dto/timesheet.dto';
import { TimeTrackingExportService } from '../services/time-tracking-export.service';
import { TimeTrackingExtendedStatsService } from '../services/time-tracking-extended-stats.service';
import { TimeTrackingPdfService } from '../services/time-tracking-pdf.service';
import { TimesheetService } from '../services/timesheet.service';

@ApiTags('Time Tracking - Reports')
@ApiBearerAuth()
@Controller('modules/time-tracking')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('time-tracking')
export class TimeReportsController {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly extendedStatsService: TimeTrackingExtendedStatsService,
    private readonly pdfService: TimeTrackingPdfService,
    private readonly exportService: TimeTrackingExportService
  ) {}

  // ========== Extended Statistics ==========

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('reports/extended/top-tasks')
  @ApiOperation({ summary: 'Get top tasks by time spent' })
  @RequirePermission('time-tracking', 'read')
  async getTopTasksByTime(
    @CurrentUser() user: User,
    @Query('preset') preset?: '30d' | '90d' | '365d',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.extendedStatsService.getTopTasksByTime(user, { preset, startDate, endDate });
  }

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('reports/extended/top-settlements')
  @ApiOperation({ summary: 'Get top settlements by time spent' })
  @RequirePermission('time-tracking', 'read')
  async getTopSettlementsByTime(
    @CurrentUser() user: User,
    @Query('preset') preset?: '30d' | '90d' | '365d',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.extendedStatsService.getTopSettlementsByTime(user, { preset, startDate, endDate });
  }

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('reports/extended/employee-breakdown')
  @ApiOperation({ summary: 'Get employee time breakdown (tasks vs settlements)' })
  @RequirePermission('time-tracking', 'read')
  async getEmployeeBreakdown(
    @CurrentUser() user: User,
    @Query('preset') preset?: '30d' | '90d' | '365d',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.extendedStatsService.getEmployeeTimeBreakdown(user, { preset, startDate, endDate });
  }

  // ========== Timesheet Views ==========

  @Get('timesheet/daily')
  @ApiOperation({
    summary: 'Get daily timesheet',
    description: 'Retrieves time entries for a specific day grouped by hours.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (admin/owner only)' })
  @ApiResponse({ status: 200, description: 'Daily timesheet data' })
  @RequirePermission('time-tracking', 'read')
  async getDailyTimesheet(@Query() dto: DailyTimesheetDto, @CurrentUser() user: User) {
    return this.timesheetService.getDailyTimesheet(dto, user);
  }

  @Get('timesheet/weekly')
  @ApiOperation({
    summary: 'Get weekly timesheet',
    description: 'Retrieves time entries for a week grouped by days.',
  })
  @ApiQuery({
    name: 'weekStart',
    required: true,
    description: 'Week start date (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (admin/owner only)' })
  @ApiResponse({ status: 200, description: 'Weekly timesheet data' })
  @RequirePermission('time-tracking', 'read')
  async getWeeklyTimesheet(@Query() dto: WeeklyTimesheetDto, @CurrentUser() user: User) {
    return this.timesheetService.getWeeklyTimesheet(dto, user);
  }

  // ========== Reports ==========

  @Get('reports/summary')
  @ApiOperation({
    summary: 'Get time tracking summary',
    description:
      'Retrieves aggregated time tracking data for the specified period with optional grouping.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group results by: day, client, task',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiQuery({ name: 'isBillable', required: false, description: 'Filter by billable status' })
  @ApiResponse({ status: 200, description: 'Report summary data' })
  @RequirePermission('time-tracking', 'read')
  async getReportSummary(@Query() dto: ReportFiltersDto, @CurrentUser() user: User) {
    return this.timesheetService.getReportSummary(dto, user);
  }

  @Get('reports/by-client/:clientId')
  @ApiOperation({
    summary: 'Get time tracking report by client',
    description: 'Retrieves time tracking data for a specific client.',
  })
  @ApiParam({ name: 'clientId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Client report data' })
  @RequirePermission('time-tracking', 'read')
  async getClientReport(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query() dto: ReportFiltersDto,
    @CurrentUser() user: User
  ) {
    return this.timesheetService.getClientReport(clientId, dto, user);
  }

  // ========== Export ==========

  @Get('reports/export')
  @ApiOperation({
    summary: 'Export time tracking data',
    description: 'Exports time tracking data in the specified format (CSV or Excel).',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format: csv or xlsx',
    enum: ExportFormat,
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiResponse({ status: 200, description: 'Exported file' })
  @RequirePermission('time-tracking', 'read')
  async exportReport(
    @Query() dto: ExportFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const { data, filename, mimeType } = await this.generateExport(dto, user);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  private async generateExport(
    dto: ExportFiltersDto,
    user: User
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    const reportData = await this.timesheetService.getReportSummary(dto, user);
    const format = dto.format || ExportFormat.CSV;

    switch (format) {
      case ExportFormat.CSV: {
        const csv = this.exportService.generateCsv(reportData);
        return {
          data: Buffer.from(csv, 'utf-8'),
          filename: `time-report-${dto.startDate}-${dto.endDate}.csv`,
          mimeType: 'text/csv; charset=utf-8',
        };
      }
      case ExportFormat.PDF: {
        const pdfBuffer = await this.pdfService.generateTimeReportPdf(reportData);
        return {
          data: pdfBuffer,
          filename: `time-report-${dto.startDate}-${dto.endDate}.pdf`,
          mimeType: 'application/pdf',
        };
      }
      case ExportFormat.EXCEL:
        throw new BadRequestException(`Format ${format} nie jest jeszcze obsługiwany. Użyj CSV.`);
      default:
        throw new BadRequestException(`Nieznany format eksportu: ${format}`);
    }
  }
}
