import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { User, Client, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

interface AssigneeDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ClientLookupDto {
  id: string;
  name: string;
}

@ApiTags('Tasks Lookup')
@ApiBearerAuth()
@Controller('modules/tasks/lookup')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TasksLookupController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantService: TenantService
  ) {}

  @Get('assignees')
  @ApiOperation({
    summary: 'Get available assignees for tasks',
    description:
      'Returns users that can be assigned to tasks. For admins, returns all admins. For company users, returns company employees.',
  })
  @ApiResponse({ status: 200, description: 'List of available assignees' })
  @RequirePermission('tasks', 'read')
  async getAssignees(@CurrentUser() user: User): Promise<AssigneeDto[]> {
    let users: User[];

    if (user.role === UserRole.ADMIN) {
      // Admin: return all admins as potential assignees
      users = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    } else if (user.companyId) {
      // Company user: return employees of their company
      users = await this.userRepository.find({
        where: { companyId: user.companyId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    } else {
      // Fallback: no company, return empty list
      users = [];
    }

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    }));
  }

  @Get('clients')
  @ApiOperation({
    summary: 'Get available clients for tasks',
    description:
      'Returns clients that can be associated with tasks. Uses tenant service to get effective company ID.',
  })
  @ApiResponse({ status: 200, description: 'List of available clients' })
  @RequirePermission('tasks', 'read')
  async getClients(@CurrentUser() user: User): Promise<ClientLookupDto[]> {
    // Use TenantService to get the effective company ID (system company for admins)
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const clients = await this.clientRepository.find({
      where: { companyId, isActive: true },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }
}
