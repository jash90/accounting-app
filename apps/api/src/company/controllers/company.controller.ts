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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CompanyService } from '../services/company.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import { User, UserRole, UserResponseDto, UserModulePermissionResponseDto } from '@accounting/common';
import { OwnerOrAdminGuard } from '@accounting/rbac';

@ApiTags('Company')
@ApiBearerAuth('JWT-auth')
@Controller('company')
@UseGuards(RolesGuard, OwnerOrAdminGuard)
@Roles(UserRole.COMPANY_OWNER)
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) {}

  // Employee Management
  @Get('employees')
  @UseGuards(RolesGuard) // Override class-level guards to allow employees
  @Roles(UserRole.COMPANY_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all employees of your company', description: 'Retrieve list of all employees in your company' })
  @ApiOkResponse({ description: 'List of company employees', type: [UserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner or employee role required and must belong to a company' })
  getEmployees(@CurrentUser() user: User) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getEmployees(user.companyId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID', description: 'Retrieve detailed information about a specific employee in your company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Employee user unique identifier' })
  @ApiOkResponse({ description: 'Employee details', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner role required and must belong to a company' })
  getEmployeeById(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.getEmployeeById(user.companyId, id);
  }

  @Post('employees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee', description: 'Create a new employee account and assign them to your company' })
  @ApiBody({ type: CreateEmployeeDto, description: 'Employee creation data' })
  @ApiCreatedResponse({ description: 'Employee created successfully', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner role required and must belong to a company' })
  createEmployee(@CurrentUser() user: User, @Body() createEmployeeDto: CreateEmployeeDto) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.createEmployee(user.companyId, createEmployeeDto);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee', description: 'Update employee information (email, name, active status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Employee user unique identifier' })
  @ApiBody({ type: UpdateEmployeeDto, description: 'Employee update data (partial update supported)' })
  @ApiOkResponse({ description: 'Employee updated successfully', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Employee not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner role required and must belong to a company' })
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
  @ApiOperation({ summary: 'Delete employee (soft delete)', description: 'Soft delete an employee by setting isActive to false' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Employee user unique identifier' })
  @ApiNoContentResponse({ description: 'Employee deleted successfully' })
  @ApiNotFoundResponse({ description: 'Employee not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner role required and must belong to a company' })
  deleteEmployee(@CurrentUser() user: User, @Param('id') id: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.companyService.deleteEmployee(user.companyId, id);
  }
}

