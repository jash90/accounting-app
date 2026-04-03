import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { ClientErrorResponseDto } from '../dto/client-response.dto';
import { ClientStatisticsWithRecentDto, ClientTaskTimeStatsDto } from '../dto/statistics.dto';
import { ClientStatisticsService } from '../services/statistics.service';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('modules/clients/statistics')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientStatisticsController {
  constructor(private readonly statisticsService: ClientStatisticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get client statistics',
    description:
      'Retrieves comprehensive statistics about clients in the company including ' +
      'totals, counts by status types, and recently added clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client statistics',
    type: ClientStatisticsWithRecentDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async getStatistics(@CurrentUser() user: User) {
    return this.statisticsService.getStatisticsWithRecent(user);
  }

  @Get('task-time')
  @ApiOperation({ summary: 'Get client task and time statistics (admin/owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Per-client task and time statistics',
    type: [ClientTaskTimeStatsDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  @UseGuards(OwnerOrAdminGuard)
  async getClientTaskTimeStats(@CurrentUser() user: User) {
    return this.statisticsService.getClientTaskAndTimeStats(user);
  }
}
