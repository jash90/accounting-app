import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  ZusMonthlyComparisonDto,
  ZusStatisticsDto,
  ZusTopClientDto,
  ZusTotalsDto,
  ZusUpcomingPaymentDto,
} from '../dto';
import { ZusStatisticsService } from '../services';

@ApiTags('ZUS Dashboard')
@ApiBearerAuth()
@Controller('modules/zus/dashboard')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('zus')
export class ZusDashboardController {
  constructor(private readonly statisticsService: ZusStatisticsService) {}

  @Get('statistics')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get ZUS dashboard statistics' })
  @ApiResponse({ status: 200, type: ZusStatisticsDto })
  async getStatistics(@CurrentUser() user: User): Promise<ZusStatisticsDto> {
    return this.statisticsService.getDashboardStatistics(user);
  }

  @Get('upcoming')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get upcoming ZUS payments' })
  @ApiResponse({ status: 200, type: [ZusUpcomingPaymentDto] })
  async getUpcoming(
    @CurrentUser() user: User,
    @Query('days') days?: string
  ): Promise<ZusUpcomingPaymentDto[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.statisticsService.getUpcomingPayments(user, daysNum);
  }

  @Get('comparison')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get monthly ZUS comparison' })
  @ApiResponse({ status: 200, type: [ZusMonthlyComparisonDto] })
  async getComparison(
    @CurrentUser() user: User,
    @Query('months') months?: string
  ): Promise<ZusMonthlyComparisonDto[]> {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.statisticsService.getMonthlyComparison(user, monthsNum);
  }

  @Get('top-clients')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get top clients by ZUS contributions' })
  @ApiResponse({ status: 200, type: [ZusTopClientDto] })
  async getTopClients(
    @CurrentUser() user: User,
    @Query('limit') limit?: string
  ): Promise<ZusTopClientDto[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.statisticsService.getTopClientsByContributions(user, limitNum);
  }

  @Get('month-totals')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get current month ZUS totals' })
  @ApiResponse({ status: 200, type: ZusTotalsDto })
  async getMonthTotals(@CurrentUser() user: User): Promise<ZusTotalsDto> {
    return this.statisticsService.getCurrentMonthTotals(user);
  }

  @Get('year-totals')
  @RequirePermission('zus', 'read')
  @ApiOperation({ summary: 'Get current year ZUS totals' })
  @ApiResponse({ status: 200, type: ZusTotalsDto })
  async getYearTotals(@CurrentUser() user: User): Promise<ZusTotalsDto> {
    return this.statisticsService.getCurrentYearTotals(user);
  }
}
