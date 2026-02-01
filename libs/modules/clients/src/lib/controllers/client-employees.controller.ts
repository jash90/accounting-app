import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  ClientEmployeeFiltersDto,
  ClientEmployeeResponseDto,
  CreateClientEmployeeDto,
  PaginatedClientEmployeesResponseDto,
  UpdateClientEmployeeDto,
} from '../dto/client-employee.dto';
import { ClientEmployeesService } from '../services/client-employees.service';

/**
 * Controller for managing client employees.
 * All endpoints require JWT authentication, module access, and appropriate permissions.
 */
@ApiTags('Client Employees')
@ApiBearerAuth()
@Controller('modules/clients/:clientId/employees')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class ClientEmployeesController {
  constructor(private readonly employeesService: ClientEmployeesService) {}

  /**
   * Get all employees for a client with filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all employees for a client',
    description:
      'Retrieves a paginated list of employees belonging to the specified client. ' +
      'Supports filtering by name, contract type, and active status.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of employees',
    type: PaginatedClientEmployeesResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'read')
  async findAll(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Query() filters: ClientEmployeeFiltersDto,
    @CurrentUser() user: User
  ) {
    return this.employeesService.findAll(clientId, user, filters);
  }

  /**
   * Get a specific employee by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get an employee by ID',
    description: 'Retrieves detailed information about a specific employee.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Employee ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee details',
    type: ClientEmployeeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client or employee not found',
  })
  @RequirePermission('clients', 'read')
  async findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    return this.employeesService.findOne(clientId, id, user);
  }

  /**
   * Create a new employee for a client
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new employee',
    description:
      'Creates a new employee associated with the specified client. ' +
      'The employee data includes personal information, contract details, and ' +
      'contract-type-specific fields.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    type: ClientEmployeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'write')
  async create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateClientEmployeeDto,
    @CurrentUser() user: User
  ) {
    return this.employeesService.create(clientId, dto, user);
  }

  /**
   * Update an existing employee
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update an employee',
    description:
      'Updates an existing employee with the provided data. ' +
      'Only provided fields will be updated.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Employee ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: ClientEmployeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Client or employee not found',
  })
  @RequirePermission('clients', 'write')
  async update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientEmployeeDto,
    @CurrentUser() user: User
  ) {
    return this.employeesService.update(clientId, id, dto, user);
  }

  /**
   * Soft delete an employee
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an employee',
    description:
      'Soft deletes an employee by setting isActive to false. ' +
      'The employee can be restored later.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Employee ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Client or employee not found',
  })
  @RequirePermission('clients', 'delete')
  async remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    await this.employeesService.remove(clientId, id, user);
    return { message: 'Pracownik został usunięty' };
  }

  /**
   * Restore a soft-deleted employee
   */
  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a deleted employee',
    description: 'Restores a previously soft-deleted employee.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Employee ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee restored successfully',
    type: ClientEmployeeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client or employee not found',
  })
  @RequirePermission('clients', 'write')
  async restore(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ) {
    return this.employeesService.restore(clientId, id, user);
  }
}
