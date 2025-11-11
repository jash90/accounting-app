import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { Roles, CurrentUser } from '@accounting/auth';
import { RolesGuard } from '@accounting/auth';
import { UserRole, User } from '@accounting/common';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate or deactivate user' })
  @ApiResponse({ status: 200, description: 'User activation status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  activateUser(@Param('id') id: string, @Query('isActive') isActive: string) {
    return this.adminService.activateUser(id, isActive === 'true');
  }

  // Company Management
  @Get('companies')
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'List of all companies' })
  findAllCompanies() {
    return this.adminService.findAllCompanies();
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company details' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findCompanyById(@Param('id') id: string) {
    return this.adminService.findCompanyById(id);
  }

  @Post('companies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  createCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.adminService.createCompany(createCompanyDto);
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  updateCompany(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.adminService.updateCompany(id, updateCompanyDto);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company (soft delete)' })
  @ApiResponse({ status: 204, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  deleteCompany(@Param('id') id: string) {
    return this.adminService.deleteCompany(id);
  }

  @Get('companies/:id/employees')
  @ApiOperation({ summary: 'Get company employees' })
  @ApiResponse({ status: 200, description: 'List of company employees' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  getCompanyEmployees(@Param('id') id: string) {
    return this.adminService.getCompanyEmployees(id);
  }

  // Module Management
  @Get('modules')
  @ApiOperation({ summary: 'Get all modules' })
  @ApiResponse({ status: 200, description: 'List of all modules' })
  findAllModules() {
    return this.adminService.findAllModules();
  }

  @Get('modules/:id')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiResponse({ status: 200, description: 'Module details' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  findModuleById(@Param('id') id: string) {
    return this.adminService.findModuleById(id);
  }

  @Post('modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new module' })
  @ApiResponse({ status: 201, description: 'Module created successfully' })
  @ApiResponse({ status: 409, description: 'Module with this slug already exists' })
  createModule(@Body() createModuleDto: CreateModuleDto) {
    return this.adminService.createModule(createModuleDto);
  }

  @Patch('modules/:id')
  @ApiOperation({ summary: 'Update module' })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  updateModule(@Param('id') id: string, @Body() updateModuleDto: Partial<CreateModuleDto>) {
    return this.adminService.updateModule(id, updateModuleDto);
  }

  // Company Module Access Management
  @Get('companies/:id/modules')
  @ApiOperation({ summary: 'Get modules assigned to company' })
  @ApiResponse({ status: 200, description: 'List of company modules' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  getCompanyModules(@Param('id') id: string) {
    return this.adminService.getCompanyModules(id);
  }

  @Post('companies/:id/modules/:moduleId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Grant module access to company' })
  @ApiResponse({ status: 201, description: 'Module access granted' })
  @ApiResponse({ status: 404, description: 'Company or module not found' })
  grantModuleToCompany(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.adminService.grantModuleToCompany(id, moduleId);
  }

  @Delete('companies/:id/modules/:moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke module access from company' })
  @ApiResponse({ status: 204, description: 'Module access revoked' })
  @ApiResponse({ status: 404, description: 'Module access not found' })
  revokeModuleFromCompany(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.adminService.revokeModuleFromCompany(id, moduleId);
  }
}

