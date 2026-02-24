import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { AssigneeDto, ClientLookupDto, TasksLookupService } from '../services/tasks-lookup.service';

@ApiTags('Tasks Lookup')
@ApiBearerAuth()
@Controller('modules/tasks/lookup')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TasksLookupController {
  constructor(private readonly tasksLookupService: TasksLookupService) {}

  @Get('assignees')
  @ApiOperation({
    summary: 'Get available assignees for tasks',
    description:
      'Returns users that can be assigned to tasks. For admins, returns all admins. For company users, returns company employees.',
  })
  @ApiResponse({ status: 200, description: 'List of available assignees' })
  @RequirePermission('tasks', 'read')
  getAssignees(@CurrentUser() user: User): Promise<AssigneeDto[]> {
    return this.tasksLookupService.getAssignees(user);
  }

  @Get('clients')
  @ApiOperation({
    summary: 'Get available clients for tasks',
    description:
      'Returns clients that can be associated with tasks. Uses tenant service to get effective company ID.',
  })
  @ApiResponse({ status: 200, description: 'List of available clients' })
  @RequirePermission('tasks', 'read')
  getClients(@CurrentUser() user: User): Promise<ClientLookupDto[]> {
    return this.tasksLookupService.getClients(user);
  }
}
