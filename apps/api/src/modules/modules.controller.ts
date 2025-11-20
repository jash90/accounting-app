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
import { ModulesService } from './modules.service';
import { CreateModuleDto, UpdateModuleDto } from './dto';
import { CurrentUser, Roles, RolesGuard } from '@accounting/auth';
import {
  User,
  UserRole,
  ManageModulePermissionDto,
  ModuleResponseDto,
  UserModulePermissionResponseDto,
  CompanyModuleAccessResponseDto,
} from '@accounting/common';

@ApiTags('Modules')
@ApiBearerAuth('JWT-auth')
@Controller('modules')
@UseGuards(RolesGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  // ==================== Unified Module Read Operations (All Roles) ====================

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Get modules for current user',
    description: 'Retrieve modules based on user role: ADMIN sees all modules, COMPANY_OWNER sees company modules, EMPLOYEE sees their permitted modules'
  })
  @ApiOkResponse({ description: 'List of modules based on user role', type: [ModuleResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  getModules(@CurrentUser() user: User) {
    return this.modulesService.getModulesForUser(user);
  }

  @Get(':identifier')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: 'Get module by ID or slug',
    description: 'Retrieve module details by UUID or slug. Access controlled by user role and permissions.'
  })
  @ApiParam({ name: 'identifier', type: 'string', description: 'Module UUID or URL-friendly slug', example: 'simple-text or 550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ description: 'Module details', type: ModuleResponseDto })
  @ApiNotFoundResponse({ description: 'Module not found or not accessible' })
  @ApiForbiddenResponse({ description: 'Forbidden - No access to this module' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  getModuleByIdentifier(@CurrentUser() user: User, @Param('identifier') identifier: string) {
    return this.modulesService.getModuleByIdentifier(user, identifier);
  }

  // ==================== Module CRUD Operations (Admin Only) ====================

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new module', description: 'Create a new module with specified name, slug, and description' })
  @ApiBody({ type: CreateModuleDto, description: 'Module creation data' })
  @ApiCreatedResponse({ description: 'Module created successfully', type: ModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Module with this slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.modulesService.create(createModuleDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update module', description: 'Update module information (name, description, isActive status)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Module unique identifier' })
  @ApiBody({ type: UpdateModuleDto, description: 'Module update data (partial update supported)' })
  @ApiOkResponse({ description: 'Module updated successfully', type: ModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiNotFoundResponse({ description: 'Module not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  update(@Param('id') id: string, @Body() updateModuleDto: UpdateModuleDto) {
    return this.modulesService.update(id, updateModuleDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete module (soft delete)', description: 'Soft delete a module by setting isActive to false' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Module unique identifier' })
  @ApiNoContentResponse({ description: 'Module deleted successfully' })
  @ApiNotFoundResponse({ description: 'Module not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  delete(@Param('id') id: string) {
    return this.modulesService.delete(id);
  }

  // ==================== Unified Permission Management ====================

  @Post('permissions')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Grant or update module permissions',
    description: 'Unified endpoint to grant/update permissions. ADMIN can manage company access, COMPANY_OWNER can manage employee permissions.'
  })
  @ApiBody({ type: ManageModulePermissionDto, description: 'Permission management data' })
  @ApiCreatedResponse({ description: 'Permissions granted/updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions for this operation' })
  @ApiNotFoundResponse({ description: 'Target entity or module not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  managePermissions(@CurrentUser() user: User, @Body() dto: ManageModulePermissionDto) {
    return this.modulesService.managePermission(user, dto);
  }

  @Patch('permissions')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Update module permissions',
    description: 'Update existing permissions. Uses same logic as POST but semantically indicates an update operation.'
  })
  @ApiBody({ type: ManageModulePermissionDto, description: 'Permission update data' })
  @ApiOkResponse({ description: 'Permissions updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions for this operation' })
  @ApiNotFoundResponse({ description: 'Target entity, module, or existing permission not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  updatePermissions(@CurrentUser() user: User, @Body() dto: ManageModulePermissionDto) {
    return this.modulesService.managePermission(user, dto);
  }

  @Delete('permissions')
  @Roles(UserRole.ADMIN, UserRole.COMPANY_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke module permissions',
    description: 'Remove module access. ADMIN can revoke company access, COMPANY_OWNER can revoke employee permissions.'
  })
  @ApiBody({ type: ManageModulePermissionDto, description: 'Permission revocation data (permissions field not required)' })
  @ApiNoContentResponse({ description: 'Permissions revoked successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions for this operation' })
  @ApiNotFoundResponse({ description: 'Target entity, module, or permission not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  revokePermissions(@CurrentUser() user: User, @Body() dto: ManageModulePermissionDto) {
    return this.modulesService.revokePermission(user, dto);
  }

  // ==================== Employee Module Queries (Company Owner) ====================

  @Get('employee/:employeeId')
  @Roles(UserRole.COMPANY_OWNER)
  @ApiOperation({
    summary: 'Get modules assigned to employee',
    description: 'Retrieve all module permissions for a specific employee (Company Owner only)'
  })
  @ApiParam({ name: 'employeeId', type: 'string', format: 'uuid', description: 'Employee user unique identifier' })
  @ApiOkResponse({ description: 'List of employee module permissions', type: [UserModulePermissionResponseDto] })
  @ApiNotFoundResponse({ description: 'Employee not found or does not belong to your company' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Company owner role required' })
  getEmployeeModules(@CurrentUser() user: User, @Param('employeeId') employeeId: string) {
    if (!user.companyId) {
      throw new Error('User is not associated with a company');
    }
    return this.modulesService.getEmployeeModules(user.companyId, employeeId);
  }

  // ==================== Company Module Queries (Admin) ====================

  @Get('companies/:companyId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get modules assigned to company',
    description: 'Retrieve all module access records for a specific company (Admin only)'
  })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid', description: 'Company unique identifier' })
  @ApiOkResponse({ description: 'List of company module access records', type: [CompanyModuleAccessResponseDto] })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  getCompanyModules(@Param('companyId') companyId: string) {
    return this.modulesService.getCompanyModules(companyId);
  }

  // ==================== Cleanup Operations (Admin Only) ====================

  @Post('cleanup/orphaned-permissions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cleanup orphaned employee permissions for disabled modules', description: 'Remove employee permissions for modules that are no longer active or accessible' })
  @ApiOkResponse({ description: 'Cleanup completed successfully - returns count of deleted records' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  cleanupOrphanedPermissions() {
    return this.modulesService.cleanupOrphanedPermissions();
  }
}
