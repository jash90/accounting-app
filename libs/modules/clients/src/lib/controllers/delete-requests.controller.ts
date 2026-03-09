import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { DeleteRequestStatus, User } from '@accounting/common';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { DeleteRequestService, ProcessDeleteRequestDto } from '../services/delete-request.service';

@ApiTags('Client Delete Requests')
@ApiBearerAuth()
@Controller('modules/clients/delete-requests')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class DeleteRequestsController {
  constructor(private readonly deleteRequestService: DeleteRequestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all delete requests (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'List of delete requests' })
  @ApiQuery({ name: 'status', required: false, enum: DeleteRequestStatus })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'read')
  async findAll(@CurrentUser() user: User, @Query('status') status?: DeleteRequestStatus) {
    return this.deleteRequestService.findAllRequests(user, status);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending delete requests (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending delete requests' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'read')
  async findPending(@CurrentUser() user: User) {
    return this.deleteRequestService.findAllPendingRequests(user);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my delete requests' })
  @ApiResponse({ status: 200, description: 'List of my delete requests' })
  @RequirePermission('clients', 'read')
  async findMyRequests(@CurrentUser() user: User) {
    return this.deleteRequestService.getMyRequests(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delete request by ID' })
  @ApiResponse({ status: 200, description: 'Delete request details' })
  @ApiResponse({ status: 404, description: 'Delete request not found' })
  @RequirePermission('clients', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.deleteRequestService.findRequestById(id, user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a delete request (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Delete request approved' })
  @ApiResponse({ status: 400, description: 'Invalid request status' })
  @ApiResponse({ status: 404, description: 'Delete request not found' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.deleteRequestService.approveRequest(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a delete request (Owner/Admin only)' })
  @ApiResponse({ status: 200, description: 'Delete request rejected' })
  @ApiResponse({ status: 400, description: 'Invalid request status' })
  @ApiResponse({ status: 404, description: 'Delete request not found' })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessDeleteRequestDto,
    @CurrentUser() user: User
  ) {
    return this.deleteRequestService.rejectRequest(id, dto, user);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel a delete request (requester only)' })
  @ApiResponse({ status: 200, description: 'Delete request cancelled' })
  @ApiResponse({ status: 400, description: 'Invalid request status' })
  @ApiResponse({ status: 404, description: 'Delete request not found' })
  @RequirePermission('clients', 'write')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.deleteRequestService.cancelRequest(id, user);
    return { message: 'Delete request cancelled successfully' };
  }
}
