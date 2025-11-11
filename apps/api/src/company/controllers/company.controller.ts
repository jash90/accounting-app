import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompanyService } from '../services/company.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { GrantModuleAccessDto } from '../dto/grant-module-access.dto';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole } from '@accounting/common';
import { OwnerOrAdminGuard } from '@accounting/rbac';

@ApiTags('Company')
@ApiBearerAuth('JWT-auth')
@Controller('company')
@UseGuards(RolesGuard, OwnerOrAdminGuard)
@Roles(UserRole.COMPANY_OWNER)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // Employee Management
  @Get('employees')
  @ApiOperation({ summary: 'Get all employees of your company' })
  @ApiResponse({ status: 200, description: 'List of employees' })
  getEmployees(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getEmployees(user.companyId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  getEmployeeById(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getEmployeeById(user.companyId, id);
  }

  @Post('employees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 409, description: 'Employee already exists' })
  createEmployee(@CurrentUser() user: User, @Body() createEmployeeDto: CreateEmployeeDto) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.createEmployee(user.companyId, createEmployeeDto);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  updateEmployee(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.updateEmployee(user.companyId, id, updateEmployeeDto);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  @ApiResponse({ status: 204, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  deleteEmployee(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.deleteEmployee(user.companyId, id);
  }

  // Module Management
  @Get('modules')
  @ApiOperation({ summary: 'Get available modules for your company' })
  @ApiResponse({ status: 200, description: 'List of available modules' })
  getAvailableModules(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getAvailableModules(user.companyId);
  }

  @Get('modules/:slug')
  @ApiOperation({ summary: 'Get module details by slug' })
  @ApiResponse({ status: 200, description: 'Module details' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  getModuleBySlug(@CurrentUser() user: User, @Param('slug') slug: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getModuleBySlug(user.companyId, slug);
  }

  // Employee Module Permissions
  @Get('employees/:id/modules')
  @ApiOperation({ summary: 'Get modules assigned to employee' })
  @ApiResponse({ status: 200, description: 'List of employee modules' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  getEmployeeModules(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getEmployeeModules(user.companyId, id);
  }

  @Post('employees/:id/modules/:slug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grant module access to employee' })
  @ApiResponse({ status: 201, description: 'Module access granted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee or module not found' })
  grantModuleAccessToEmployee(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('slug') slug: string,
    @Body() grantModuleAccessDto: GrantModuleAccessDto,
  ) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.grantModuleAccessToEmployee(
      user.companyId,
      id,
      slug,
      grantModuleAccessDto,
    );
  }

  @Patch('employees/:id/modules/:slug')
  @ApiOperation({ summary: 'Update employee module permissions' })
  @ApiResponse({ status: 200, description: 'Permissions updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Employee or module not found' })
  updateEmployeeModulePermissions(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('slug') slug: string,
    @Body() grantModuleAccessDto: GrantModuleAccessDto,
  ) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.updateEmployeeModulePermissions(
      user.companyId,
      id,
      slug,
      grantModuleAccessDto,
    );
  }

  @Delete('employees/:id/modules/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke module access from employee' })
  @ApiResponse({ status: 204, description: 'Module access revoked' })
  @ApiResponse({ status: 404, description: 'Employee or module not found' })
  revokeModuleAccessFromEmployee(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('slug') slug: string,
  ) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.revokeModuleAccessFromEmployee(user.companyId, id, slug);
  }
}

