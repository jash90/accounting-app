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
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { NotificationType, User } from '@accounting/common';
import {
  NOTIFICATION_TEMPLATES,
  NotificationInterceptor,
  NotifyOn,
} from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { CheckDuplicatesDto, DuplicateCheckResultDto } from '../dto/bulk-operations.dto';
import {
  ClientErrorResponseDto,
  ClientResponseDto,
  ClientSuccessResponseDto,
  DeleteRequestResponseDto,
  PaginatedClientsResponseDto,
} from '../dto/client-response.dto';
import {
  ClientFiltersDto,
  CreateClientDto,
  CustomFieldFilterDto,
  CustomFieldFilterOperator,
  UpdateClientDto,
} from '../dto/client.dto';
import { ClientsService } from '../services/clients.service';
import { CreateDeleteRequestDto, DeleteRequestService } from '../services/delete-request.service';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';

/**
 * Core CRUD controller for clients.
 * Sub-controllers handle: bulk operations, export/import, statistics, changelog, custom fields.
 */
@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  ClientResponseDto,
  PaginatedClientsResponseDto,
  ClientErrorResponseDto,
  DuplicateCheckResultDto,
  DeleteRequestResponseDto
)
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly deleteRequestService: DeleteRequestService,
    private readonly duplicateDetectionService: DuplicateDetectionService
  ) {}

  // ==================== PKD Codes ====================

  @Get('pkd-codes/search')
  @ApiOperation({ summary: 'Search PKD codes' })
  @ApiResponse({ status: 200, description: 'List of matching PKD codes' })
  @RequirePermission('clients', 'read')
  searchPkdCodes(
    @Query('search') search?: string,
    @Query('section') section?: string,
    @Query('limit') limit?: number
  ) {
    return this.clientsService.searchPkdCodes(search, section, limit ?? 50);
  }

  @Get('pkd-codes/sections')
  @ApiOperation({ summary: 'Get PKD sections' })
  @ApiResponse({ status: 200, description: 'PKD sections mapping' })
  @RequirePermission('clients', 'read')
  getPkdSections() {
    return this.clientsService.getPkdSections();
  }

  // ==================== Duplicates ====================

  @Post('check-duplicates')
  @ApiOperation({ summary: 'Check for duplicate clients' })
  @ApiResponse({ status: 200, type: DuplicateCheckResultDto })
  @RequirePermission('clients', 'read')
  async checkDuplicates(@Body() dto: CheckDuplicatesDto, @CurrentUser() user: User) {
    return this.duplicateDetectionService.checkDuplicates(user, dto.nip, dto.email, dto.excludeId);
  }

  // ==================== CRUD ====================

  @Get()
  @ApiOperation({
    summary: 'Get all clients',
    description:
      "Retrieves a paginated list of clients belonging to the authenticated user's company.",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ClientErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async findAll(
    @CurrentUser() user: User,
    @Query() filters: ClientFiltersDto,
    @Req() req: Request
  ) {
    const customFieldFilters = this.parseCustomFieldFilters(req.query);
    return this.clientsService.findAll(user, { ...filters, customFieldFilters });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Client not found', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_CREATED,
    ...NOTIFICATION_TEMPLATES.CLIENT.CREATED,
    recipientResolver: 'companyUsersExceptActor',
  })
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: User) {
    return this.clientsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ClientErrorResponseDto })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_UPDATED,
    ...NOTIFICATION_TEMPLATES.CLIENT.UPDATED,
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: User
  ) {
    return this.clientsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client (Owner/Admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientSuccessResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ClientErrorResponseDto })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  @NotifyOn({
    type: NotificationType.CLIENT_DELETED,
    ...NOTIFICATION_TEMPLATES.CLIENT.DELETED,
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.clientsService.softDeleteClient(id, user);
    return { message: 'Client deleted successfully' };
  }

  // ==================== Delete Request & Restore ====================

  @Post(':id/delete-request')
  @ApiOperation({ summary: 'Request client deletion (for Employees)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: DeleteRequestResponseDto })
  @RequirePermission('clients', 'write')
  async requestDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDeleteRequestDto,
    @CurrentUser() user: User
  ) {
    return this.deleteRequestService.createDeleteRequest(id, dto, user);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted client' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_RESTORED,
    ...NOTIFICATION_TEMPLATES.CLIENT.RESTORED,
    recipientResolver: 'companyUsersExceptActor',
  })
  async restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientsService.restore(id, user);
  }

  // ==================== Helpers ====================

  private parseCustomFieldFilters(query: Record<string, unknown>): CustomFieldFilterDto[] {
    const customFieldFilters: CustomFieldFilterDto[] = [];
    const prefix = 'customField_';
    const validOperators = Object.values(CustomFieldFilterOperator);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const [key, rawValue] of Object.entries(query)) {
      if (key.startsWith(prefix) && typeof rawValue === 'string') {
        const fieldId = key.substring(prefix.length);
        if (!uuidRegex.test(fieldId)) continue;

        const colonIndex = rawValue.indexOf(':');
        if (colonIndex > 0) {
          const operator = rawValue.substring(0, colonIndex);
          const value = rawValue.substring(colonIndex + 1);

          if (!validOperators.includes(operator as CustomFieldFilterOperator)) continue;

          const parsedValue =
            operator === CustomFieldFilterOperator.IN ||
            operator === CustomFieldFilterOperator.CONTAINS_ANY
              ? value.split(',').map((v) => v.trim())
              : value;

          customFieldFilters.push({
            fieldId,
            operator: operator as CustomFieldFilterOperator,
            value: parsedValue,
          });
        }
      }
    }

    return customFieldFilters;
  }
}
