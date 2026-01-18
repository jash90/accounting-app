import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { TimesheetService } from '../services/timesheet.service';
import {
  DailyTimesheetDto,
  WeeklyTimesheetDto,
  ReportFiltersDto,
  ExportFiltersDto,
  ExportFormat,
} from '../dto/timesheet.dto';

@ApiTags('Time Tracking - Reports')
@ApiBearerAuth()
@Controller('modules/time-tracking')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('time-tracking')
export class TimeReportsController {
  constructor(private readonly timesheetService: TimesheetService) {}

  // ========== Timesheet Views ==========

  @Get('timesheet/daily')
  @ApiOperation({
    summary: 'Get daily timesheet',
    description: 'Retrieves time entries for a specific day grouped by hours.',
  })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)', example: '2024-01-15' })
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
  @ApiQuery({ name: 'weekStart', required: true, description: 'Week start date (YYYY-MM-DD)', example: '2024-01-15' })
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
    description: 'Retrieves aggregated time tracking data for the specified period with optional grouping.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group results by: day, client, task' })
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
    @CurrentUser() user: User,
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
  @ApiQuery({ name: 'format', required: false, description: 'Export format: csv or xlsx', enum: ExportFormat })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client ID' })
  @ApiResponse({ status: 200, description: 'Exported file' })
  @RequirePermission('time-tracking', 'read')
  async exportReport(
    @Query() dto: ExportFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { data, filename, mimeType } = await this.generateExport(dto, user);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  private async generateExport(
    dto: ExportFiltersDto,
    user: User,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    const reportData = await this.timesheetService.getReportSummary(dto, user);
    const format = dto.format || ExportFormat.CSV;

    if (format === ExportFormat.CSV) {
      const csv = this.generateCsv(reportData);
      return {
        data: Buffer.from(csv, 'utf-8'),
        filename: `time-report-${dto.startDate}-${dto.endDate}.csv`,
        mimeType: 'text/csv; charset=utf-8',
      };
    }

    // For Excel, we would need a library like exceljs
    // For now, fall back to CSV
    const csv = this.generateCsv(reportData);
    return {
      data: Buffer.from(csv, 'utf-8'),
      filename: `time-report-${dto.startDate}-${dto.endDate}.csv`,
      mimeType: 'text/csv; charset=utf-8',
    };
  }

  private generateCsv(reportData: any): string {
    const lines: string[] = [];

    // Header
    lines.push('Raport czasu pracy');
    lines.push(`Okres: ${reportData.startDate} - ${reportData.endDate}`);
    lines.push('');

    // Summary
    lines.push('Podsumowanie');
    lines.push(`Całkowity czas (min),${reportData.totalMinutes}`);
    lines.push(`Czas rozliczalny (min),${reportData.billableMinutes}`);
    lines.push(`Czas nierozliczalny (min),${reportData.nonBillableMinutes}`);
    lines.push(`Całkowita kwota,${reportData.totalAmount}`);
    lines.push(`Liczba wpisów,${reportData.entriesCount}`);
    lines.push('');

    // Grouped data if available
    if (reportData.groupedData && reportData.groupedData.length > 0) {
      lines.push('Dane szczegółowe');
      lines.push('Grupa,Całkowity czas (min),Czas rozliczalny (min),Kwota,Liczba wpisów');

      for (const group of reportData.groupedData) {
        lines.push(
          `"${group.groupName}",${group.totalMinutes},${group.billableMinutes},${group.totalAmount},${group.entriesCount}`
        );
      }
    }

    return lines.join('\n');
  }
}
