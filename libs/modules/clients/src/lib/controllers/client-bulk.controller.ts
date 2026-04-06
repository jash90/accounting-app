import { Body, Controller, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import { NotificationInterceptor } from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  BulkDeleteClientsDto,
  BulkEditClientsDto,
  BulkOperationResultDto,
  BulkRestoreClientsDto,
} from '../dto/bulk-operations.dto';
import { ClientErrorResponseDto } from '../dto/client-response.dto';
import { ClientBulkService } from '../services/client-bulk.service';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@Controller('modules/clients/bulk')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('clients')
export class ClientBulkController {
  constructor(private readonly clientBulkService: ClientBulkService) {}

  @Patch('delete')
  @ApiOperation({
    summary: 'Bulk delete clients',
    description:
      'Soft deletes multiple clients at once. Limited to Company Owners and Admins. ' +
      'Maximum 100 clients can be deleted in a single operation.',
  })
  @ApiResponse({ status: 200, description: 'Bulk operation result', type: BulkOperationResultDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ClientErrorResponseDto })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async bulkDelete(@Body() dto: BulkDeleteClientsDto, @CurrentUser() user: User) {
    return this.clientBulkService.bulkDelete(dto, user);
  }

  @Patch('restore')
  @ApiOperation({
    summary: 'Bulk restore clients',
    description:
      'Restores multiple soft-deleted clients at once. ' +
      'Maximum 100 clients can be restored in a single operation.',
  })
  @ApiResponse({ status: 200, description: 'Bulk operation result', type: BulkOperationResultDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'write')
  async bulkRestore(@Body() dto: BulkRestoreClientsDto, @CurrentUser() user: User) {
    return this.clientBulkService.bulkRestore(dto, user);
  }

  @Patch('edit')
  @ApiOperation({
    summary: 'Bulk edit clients',
    description:
      'Updates multiple clients with the same values at once. ' +
      'Only provided fields will be updated. Maximum 100 clients per operation.',
  })
  @ApiResponse({ status: 200, description: 'Bulk operation result', type: BulkOperationResultDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'write')
  async bulkEdit(@Body() dto: BulkEditClientsDto, @CurrentUser() user: User) {
    return this.clientBulkService.bulkEdit(dto, user);
  }
}
