import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { PaginationQueryDto, User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  ChangelogEntryResponseDto,
  ClientErrorResponseDto,
  PaginatedChangelogResponseDto,
} from '../dto/client-response.dto';
import { ClientChangelogService } from '../services/client-changelog.service';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientChangelogController {
  constructor(private readonly clientChangelogService: ClientChangelogService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Get all client changes for the company',
    description:
      'Retrieves a paginated audit trail of all changes made to clients within the company.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated changelog',
    type: PaginatedChangelogResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async getAllHistory(@CurrentUser() user: User, @Query() pagination: PaginationQueryDto) {
    return this.clientChangelogService.getCompanyChangelog(user, pagination);
  }

  @Get(':id/changelog')
  @ApiOperation({
    summary: 'Get client change log',
    description: 'Retrieves the complete audit trail for a specific client.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Changelog entries', type: [ChangelogEntryResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async getChangelog(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientChangelogService.getClientChangelog(id, user);
  }
}
