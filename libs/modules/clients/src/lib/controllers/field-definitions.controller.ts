import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';

import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
  OwnerOrAdminGuard,
  OwnerOrAdmin,
} from '@accounting/rbac';

import { SuccessMessageResponseDto, ErrorResponseDto } from '../dto/client-response.dto';
import {
  CreateFieldDefinitionDto,
  UpdateFieldDefinitionDto,
  FieldDefinitionQueryDto,
  FieldDefinitionResponseDto,
  PaginatedFieldDefinitionsResponseDto,
} from '../dto/field-definition.dto';
import { CustomFieldsService } from '../services/custom-fields.service';

/**
 * Controller for managing custom field definitions within the clients module.
 * Field definitions allow companies to create custom data fields for their clients.
 * Creating, updating, and deleting field definitions is restricted to Company Owners and Admins.
 *
 * @security Bearer - JWT token required
 * @module clients - Module access required for company
 */
@ApiTags('Client Field Definitions')
@ApiBearerAuth()
@ApiExtraModels(FieldDefinitionResponseDto, PaginatedFieldDefinitionsResponseDto, ErrorResponseDto)
@Controller('modules/clients/field-definitions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('clients')
export class FieldDefinitionsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  /**
   * Get all field definitions for the company.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all field definitions',
    description:
      "Retrieves a paginated list of custom field definitions for the authenticated user's company. " +
      'Field definitions define the custom data fields available for clients. ' +
      'Supports pagination with configurable page size.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of field definitions',
    type: PaginatedFieldDefinitionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async findAll(@CurrentUser() user: User, @Query() query: FieldDefinitionQueryDto) {
    return this.customFieldsService.findAllDefinitions(user, query);
  }

  /**
   * Get a specific field definition by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a field definition by ID',
    description:
      'Retrieves detailed information about a specific field definition. ' +
      "The field definition must belong to the authenticated user's company.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the field definition',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Field definition details including type, label, and configuration',
    type: FieldDefinitionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User lacks read permission or field definition belongs to different company',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Field definition not found',
    type: ErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.customFieldsService.findDefinitionById(id, user);
  }

  /**
   * Create a new field definition (Owner/Admin only).
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new field definition',
    description:
      'Creates a new custom field definition for the company. This endpoint is restricted to Company Owners and Admins. ' +
      'Field types include TEXT, NUMBER, DATE, BOOLEAN, ENUM, and MULTISELECT. ' +
      'For ENUM and MULTISELECT types, you must provide the enumValues array with allowed options.',
  })
  @ApiResponse({
    status: 201,
    description: 'Field definition successfully created',
    type: FieldDefinitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error (e.g., ENUM type without enumValues)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can create field definitions',
    type: ErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  async create(@Body() dto: CreateFieldDefinitionDto, @CurrentUser() user: User) {
    return this.customFieldsService.createDefinition(dto, user);
  }

  /**
   * Update an existing field definition (Owner/Admin only).
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a field definition',
    description:
      'Updates an existing field definition. This endpoint is restricted to Company Owners and Admins. ' +
      'Note: Changing the field type may affect existing values stored for clients. ' +
      'For ENUM/MULTISELECT types, modifying enumValues does not automatically update existing client values.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the field definition to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Field definition successfully updated',
    type: FieldDefinitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error in request body',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can update field definitions',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Field definition not found',
    type: ErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldDefinitionDto,
    @CurrentUser() user: User
  ) {
    return this.customFieldsService.updateDefinition(id, dto, user);
  }

  /**
   * Delete a field definition (Owner/Admin only).
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a field definition',
    description:
      'Deletes a field definition and all associated client values. This endpoint is restricted to Company Owners and Admins. ' +
      'Warning: This operation will permanently remove all values stored for this field across all clients.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the field definition to delete',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Field definition successfully deleted',
    type: SuccessMessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can delete field definitions',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Field definition not found',
    type: ErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.customFieldsService.removeDefinition(id, user);
    return { message: 'Field definition deleted successfully' };
  }
}
