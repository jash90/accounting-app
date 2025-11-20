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
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { Roles, CurrentUser } from '@accounting/auth';
import { RolesGuard } from '@accounting/auth';
import {
  UserRole,
  User,
  UserResponseDto,
  CompanyResponseDto,
} from '@accounting/common';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all users', description: 'Retrieve a complete list of all users in the system' })
  @ApiOkResponse({ description: 'List of all users', type: [UserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve detailed information about a specific user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiOkResponse({ description: 'User details', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user', description: 'Create a new user with specified email, role, and company assignment' })
  @ApiBody({ type: CreateUserDto, description: 'User creation data' })
  @ApiCreatedResponse({ description: 'User created successfully', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user', description: 'Update user information (email, role, company assignment, active status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiBody({ type: UpdateUserDto, description: 'User update data (partial update supported)' })
  @ApiOkResponse({ description: 'User updated successfully', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)', description: 'Soft delete a user by setting isActive to false' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate or deactivate user', description: 'Toggle user account active status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiQuery({ name: 'isActive', type: 'boolean', description: 'Set to true to activate, false to deactivate', example: true })
  @ApiOkResponse({ description: 'User activation status updated successfully', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  activateUser(@Param('id') id: string, @Query('isActive') isActive: string) {
    return this.adminService.activateUser(id, isActive === 'true');
  }

  // Company Management
  @Get('companies')
  @ApiOperation({ summary: 'Get all companies', description: 'Retrieve a complete list of all companies in the system' })
  @ApiOkResponse({ description: 'List of all companies', type: [CompanyResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  findAllCompanies() {
    return this.adminService.findAllCompanies();
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Get company by ID', description: 'Retrieve detailed information about a specific company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Company unique identifier' })
  @ApiOkResponse({ description: 'Company details', type: CompanyResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  findCompanyById(@Param('id') id: string) {
    return this.adminService.findCompanyById(id);
  }

  @Post('companies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new company', description: 'Create a new company with specified name and owner' })
  @ApiBody({ type: CreateCompanyDto, description: 'Company creation data' })
  @ApiCreatedResponse({ description: 'Company created successfully', type: CompanyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  createCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.adminService.createCompany(createCompanyDto);
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Update company', description: 'Update company information (name, owner, active status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Company unique identifier' })
  @ApiBody({ type: UpdateCompanyDto, description: 'Company update data (partial update supported)' })
  @ApiOkResponse({ description: 'Company updated successfully', type: CompanyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  updateCompany(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.adminService.updateCompany(id, updateCompanyDto);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company (soft delete)', description: 'Soft delete a company by setting isActive to false' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Company unique identifier' })
  @ApiNoContentResponse({ description: 'Company deleted successfully' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  deleteCompany(@Param('id') id: string) {
    return this.adminService.deleteCompany(id);
  }

  @Get('companies/:id/employees')
  @ApiOperation({ summary: 'Get company employees', description: 'Retrieve all employees belonging to a specific company' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Company unique identifier' })
  @ApiOkResponse({ description: 'List of company employees', type: [UserResponseDto] })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  getCompanyEmployees(@Param('id') id: string) {
    return this.adminService.getCompanyEmployees(id);
  }
}

