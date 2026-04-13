import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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

import { KsefDashboardStatsDto } from '../dto';
import { KsefStatsService } from '../services/ksef-stats.service';

@ApiTags('KSeF - Statistics')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/stats')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
@RequirePermission('ksef', 'read')
export class KsefStatsController {
  constructor(
    private readonly statsService: KsefStatsService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get KSeF dashboard statistics',
    description:
      'Returns aggregate statistics for the KSeF module dashboard including invoice counts by status, amounts, and active session status.',
  })
  @ApiResponse({ status: 200, type: KsefDashboardStatsDto })
  async getDashboardStats(
    @CurrentUser() user: User,
  ): Promise<KsefDashboardStatsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.statsService.getDashboardStats(companyId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check KSeF API health' })
  async checkHealth(@CurrentUser() user: User) {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.statsService.checkHealth(companyId, user.id);
  }
}
