import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
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

import { GetKsefAuditLogsQueryDto } from '../dto';
import { KsefAuditLogService } from '../services/ksef-audit-log.service';

@ApiTags('KSeF - Audit Log')
@ApiBearerAuth('JWT-auth')
@Controller('modules/ksef/audit')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('ksef')
@RequirePermission('ksef', 'manage')
export class KsefAuditController {
  constructor(
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List KSeF audit logs',
    description:
      'Returns a paginated list of KSeF audit log entries for the current company.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(
    @Query() query: GetKsefAuditLogsQueryDto,
    @CurrentUser() user: User,
  ) {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    return this.auditLogService.findAll(companyId, query);
  }
}
