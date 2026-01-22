import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Request, Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { NotificationType, PaginationQueryDto, User } from '@accounting/common';
import { NotificationInterceptor, NotifyOn } from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  BulkDeleteClientsDto,
  BulkEditClientsDto,
  BulkOperationResultDto,
  BulkRestoreClientsDto,
  CheckDuplicatesDto,
  DuplicateCheckResultDto,
} from '../dto/bulk-operations.dto';
import {
  ChangelogEntryResponseDto,
  ClientErrorResponseDto,
  ClientResponseDto,
  ClientSuccessResponseDto,
  CustomFieldValueResponseDto,
  DeleteRequestResponseDto,
  PaginatedChangelogResponseDto,
  PaginatedClientsResponseDto,
} from '../dto/client-response.dto';
import {
  ClientFiltersDto,
  CreateClientDto,
  CustomFieldFilterDto,
  CustomFieldFilterOperator,
  SetCustomFieldValuesDto,
  UpdateClientDto,
} from '../dto/client.dto';
import { ClientStatisticsDto, ClientStatisticsWithRecentDto } from '../dto/statistics.dto';
import { ClientChangelogService } from '../services/client-changelog.service';
import { ClientsService } from '../services/clients.service';
import { CustomFieldsService } from '../services/custom-fields.service';
import { CreateDeleteRequestDto, DeleteRequestService } from '../services/delete-request.service';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { ClientExportService } from '../services/export.service';
import { ClientStatisticsService } from '../services/statistics.service';

/**
 * Controller for managing clients within the clients module.
 * All endpoints require JWT authentication, module access, and appropriate permissions.
 *
 * @security Bearer - JWT token required
 * @module clients - Module access required for company
 */
@ApiTags('Clients')
@ApiBearerAuth()
@ApiExtraModels(
  ClientResponseDto,
  PaginatedClientsResponseDto,
  ChangelogEntryResponseDto,
  PaginatedChangelogResponseDto,
  DeleteRequestResponseDto,
  CustomFieldValueResponseDto,
  ClientErrorResponseDto,
  BulkOperationResultDto,
  DuplicateCheckResultDto,
  ClientStatisticsDto,
  ClientStatisticsWithRecentDto
)
@Controller('modules/clients')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly customFieldsService: CustomFieldsService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly deleteRequestService: DeleteRequestService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly statisticsService: ClientStatisticsService,
    private readonly exportService: ClientExportService
  ) {}

  /**
   * Search PKD codes server-side (lazy loading).
   * Avoids loading all ~659 codes at app startup.
   */
  @Get('pkd-codes/search')
  @ApiOperation({
    summary: 'Search PKD codes',
    description:
      'Searches PKD (Polish Classification of Activities) codes server-side. ' +
      'Returns matching codes based on search term and optional section filter. ' +
      'Use this for lazy-loading PKD codes in the client form instead of loading all codes upfront.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching PKD codes',
  })
  @RequirePermission('clients', 'read')
  searchPkdCodes(
    @Query('search') search?: string,
    @Query('section') section?: string,
    @Query('limit') limit?: number
  ) {
    return this.clientsService.searchPkdCodes(search, section, limit ?? 50);
  }

  /**
   * Get PKD sections for dropdown.
   */
  @Get('pkd-codes/sections')
  @ApiOperation({
    summary: 'Get PKD sections',
    description: 'Returns all PKD sections (A-V) for section filter dropdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Object mapping section codes to labels',
  })
  @RequirePermission('clients', 'read')
  getPkdSections() {
    return this.clientsService.getPkdSections();
  }

  /**
   * Get all clients for the current user's company with optional filtering and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all clients',
    description:
      "Retrieves a paginated list of clients belonging to the authenticated user's company. " +
      'Supports filtering by various criteria including search text, employment type, VAT status, tax scheme, and ZUS status. ' +
      'Results are paginated with configurable page size.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission or client belongs to different company',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async findAll(
    @CurrentUser() user: User,
    @Query() filters: ClientFiltersDto,
    @Req() req: Request
  ) {
    // Parse custom field filters from query params with customField_ prefix
    const customFieldFilters = this.parseCustomFieldFilters(req.query);

    return this.clientsService.findAll(user, {
      ...filters,
      customFieldFilters,
    });
  }

  /**
   * Parse custom field filters from query params.
   * Format: customField_[UUID]=operator:value
   * Examples:
   *   customField_abc123=contains:Jan
   *   customField_def456=gte:100
   *   customField_ghi789=eq:true
   *   customField_jkl012=in:VALUE1,VALUE2
   */
  private parseCustomFieldFilters(query: Record<string, unknown>): CustomFieldFilterDto[] {
    const customFieldFilters: CustomFieldFilterDto[] = [];
    const prefix = 'customField_';
    const validOperators = Object.values(CustomFieldFilterOperator);
    // UUID v4 pattern for validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const [key, rawValue] of Object.entries(query)) {
      if (key.startsWith(prefix) && typeof rawValue === 'string') {
        const fieldId = key.substring(prefix.length);

        // Validate fieldId is a valid UUID to prevent malformed queries
        if (!uuidRegex.test(fieldId)) {
          continue;
        }
        const colonIndex = rawValue.indexOf(':');

        if (colonIndex > 0) {
          const operator = rawValue.substring(0, colonIndex);
          const value = rawValue.substring(colonIndex + 1);

          // Skip invalid operators - validation will handle the error later
          if (!validOperators.includes(operator as CustomFieldFilterOperator)) {
            continue;
          }

          // For 'in' and 'contains_any' operators, split by comma
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

  /**
   * Get changelog history for all clients in the company.
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get all client changes for the company',
    description:
      'Retrieves a paginated audit trail of all changes made to clients within the company. ' +
      'Each entry includes the change type (CREATE, UPDATE, DELETE, RESTORE), affected field, old and new values, ' +
      'and information about who made the change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of changelog entries',
    type: PaginatedChangelogResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getAllHistory(@CurrentUser() user: User, @Query() pagination: PaginationQueryDto) {
    return this.clientChangelogService.getCompanyChangelog(user, pagination);
  }

  /**
   * Get client statistics for the company.
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get client statistics',
    description:
      'Retrieves comprehensive statistics about clients in the company including ' +
      'totals, counts by status types, and recently added clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client statistics',
    type: ClientStatisticsWithRecentDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getStatistics(@CurrentUser() user: User) {
    return this.statisticsService.getStatisticsWithRecent(user);
  }

  /**
   * Check for duplicate clients.
   */
  @Post('check-duplicates')
  @ApiOperation({
    summary: 'Check for duplicate clients',
    description:
      'Checks if clients with matching NIP or email already exist in the company. ' +
      'Use before creating or updating clients to warn users about potential duplicates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicate check result',
    type: DuplicateCheckResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async checkDuplicates(@Body() dto: CheckDuplicatesDto, @CurrentUser() user: User) {
    return this.duplicateDetectionService.checkDuplicates(user, dto.nip, dto.email, dto.excludeId);
  }

  /**
   * Bulk delete multiple clients.
   */
  @Patch('bulk/delete')
  @ApiOperation({
    summary: 'Bulk delete clients',
    description:
      'Soft deletes multiple clients at once. Limited to Company Owners and Admins. ' +
      'Maximum 100 clients can be deleted in a single operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation result',
    type: BulkOperationResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Company Owners and Admins can bulk delete',
    type: ClientErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  async bulkDelete(@Body() dto: BulkDeleteClientsDto, @CurrentUser() user: User) {
    return this.clientsService.bulkDelete(dto, user);
  }

  /**
   * Bulk restore multiple clients.
   */
  @Patch('bulk/restore')
  @ApiOperation({
    summary: 'Bulk restore clients',
    description:
      'Restores multiple soft-deleted clients at once. ' +
      'Maximum 100 clients can be restored in a single operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation result',
    type: BulkOperationResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async bulkRestore(@Body() dto: BulkRestoreClientsDto, @CurrentUser() user: User) {
    return this.clientsService.bulkRestore(dto, user);
  }

  /**
   * Bulk edit multiple clients.
   */
  @Patch('bulk/edit')
  @ApiOperation({
    summary: 'Bulk edit clients',
    description:
      'Updates multiple clients with the same values at once. ' +
      'Only provided fields will be updated. Maximum 100 clients per operation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation result',
    type: BulkOperationResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async bulkEdit(@Body() dto: BulkEditClientsDto, @CurrentUser() user: User) {
    return this.clientsService.bulkEdit(dto, user);
  }

  /**
   * Export clients to CSV.
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export clients to CSV',
    description:
      'Exports all clients matching the current filters to a CSV file. ' +
      'The CSV file can be used as a backup or for importing into other systems.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async exportToCsv(
    @Query() filters: ClientFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const csvBuffer = await this.exportService.exportToCsv(filters, user);
    const filename = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csvBuffer);
  }

  /**
   * Get CSV import template.
   */
  @Get('import/template')
  @ApiOperation({
    summary: 'Get CSV import template',
    description:
      'Downloads a CSV template with headers and an example row. ' +
      'Use this template as a guide for formatting import data.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV template file download',
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @RequirePermission('clients', 'read')
  async getImportTemplate(@Res() res: Response) {
    const template = this.exportService.getTemplate();

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients-import-template.csv"',
    });
    res.send(template);
  }

  /**
   * Import clients from CSV.
   */
  @Post('import')
  @ApiOperation({
    summary: 'Import clients from CSV',
    description:
      'Imports clients from a CSV file. Clients with matching NIP will be updated, ' +
      'new clients will be created. The file must follow the template format. ' +
      'Maximum file size: 5MB.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import result with counts of imported, updated, and errors',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid CSV format, data, or file too large',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('clients', 'write')
  async importFromCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 5MB limit
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          // Only accept CSV files (text/csv or application/vnd.ms-excel for older clients)
          new FileTypeValidator({
            fileType: /^(text\/csv|application\/vnd\.ms-excel|text\/plain)$/,
          }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: 400,
      })
    )
    file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    if (!file) {
      throw new BadRequestException('Plik jest wymagany');
    }

    const content = file.buffer.toString('utf-8');
    return this.exportService.importFromCsv(content, user);
  }

  /**
   * Get a specific client by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a client by ID',
    description:
      'Retrieves detailed information about a specific client. ' +
      "The client must belong to the authenticated user's company.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Client details including all fields and metadata',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientsService.findOne(id, user);
  }

  /**
   * Create a new client.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new client',
    description:
      "Creates a new client associated with the authenticated user's company. " +
      'The client name is required, all other fields are optional. ' +
      'A changelog entry will be automatically created for this operation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client successfully created',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error in request body',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_CREATED,
    titleTemplate: '{{actor.firstName}} utworzył(a) klienta "{{name}}"',
    actionUrlTemplate: '/modules/clients/{{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: User) {
    return this.clientsService.create(dto, user);
  }

  /**
   * Update an existing client.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a client',
    description:
      'Updates an existing client with partial data. Only provided fields will be updated. ' +
      'All changes are tracked in the changelog with old and new values.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Client successfully updated',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error in request body',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) klienta "{{name}}"',
    actionUrlTemplate: '/modules/clients/{{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: User
  ) {
    return this.clientsService.update(id, dto, user);
  }

  /**
   * Delete a client (Owner/Admin only).
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a client',
    description:
      'Permanently deletes a client. This endpoint is restricted to Company Owners and Admins. ' +
      'Employees must use the /delete-request endpoint to request deletion approval. ' +
      'This performs a soft delete - the client can be restored later.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client to delete',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Client successfully deleted',
    type: ClientSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Only Company Owners and Admins can delete clients directly. Employees must use /delete-request.',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
    type: ClientErrorResponseDto,
  })
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('clients', 'delete')
  @NotifyOn({
    type: NotificationType.CLIENT_DELETED,
    titleTemplate: '{{actor.firstName}} usunął/usunęła klienta',
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.clientsService.remove(id, user);
    return { message: 'Client deleted successfully' };
  }

  /**
   * Request client deletion (for Employees).
   */
  @Post(':id/delete-request')
  @ApiOperation({
    summary: 'Request client deletion',
    description:
      'Creates a deletion request for a client. This endpoint is primarily for Employees who cannot delete directly. ' +
      'The request requires approval from a Company Owner or Admin before the client is deleted. ' +
      'A reason must be provided for the deletion request.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client to request deletion for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Delete request created successfully, pending approval',
    type: DeleteRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid field definition ID or value type mismatch',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission for clients module',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async requestDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDeleteRequestDto,
    @CurrentUser() user: User
  ) {
    return this.deleteRequestService.createDeleteRequest(id, dto, user);
  }

  /**
   * Restore a soft-deleted client.
   */
  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a deleted client',
    description:
      'Restores a previously soft-deleted client, making it active again. ' +
      'The client must exist and be in a deleted (inactive) state. ' +
      'A changelog entry will be created for this operation.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client to restore',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Client successfully restored',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission for clients module',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found or not deleted',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_RESTORED,
    titleTemplate: '{{actor.firstName}} przywrócił(a) klienta "{{name}}"',
    actionUrlTemplate: '/modules/clients/{{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientsService.restore(id, user);
  }

  /**
   * Get changelog for a specific client.
   */
  @Get(':id/changelog')
  @ApiOperation({
    summary: 'Get client change log',
    description:
      'Retrieves the complete audit trail for a specific client. ' +
      'Includes all CREATE, UPDATE, DELETE, and RESTORE operations with timestamps and user information.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of changelog entries for the client',
    type: [ChangelogEntryResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getChangelog(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clientChangelogService.getClientChangelog(id, user);
  }

  /**
   * Get custom field values for a client.
   */
  @Get(':id/custom-fields')
  @ApiOperation({
    summary: 'Get client custom field values',
    description:
      'Retrieves all custom field values for a specific client. ' +
      'Custom fields are defined at the company level and can store additional client-specific data.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of custom field values for the client',
    type: [CustomFieldValueResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks read permission for clients module',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'read')
  async getCustomFields(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.customFieldsService.getClientCustomFields(id, user);
  }

  /**
   * Set custom field values for a client.
   */
  @Put(':id/custom-fields')
  @ApiOperation({
    summary: 'Set client custom field values',
    description:
      'Sets or updates multiple custom field values for a client in a single request. ' +
      'The values object should map field definition IDs to their values. ' +
      'Pass null as the value to clear a custom field.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier of the client',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom fields successfully updated',
    type: [CustomFieldValueResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error in request body',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks write permission or client belongs to different company',
    type: ClientErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
    type: ClientErrorResponseDto,
  })
  @RequirePermission('clients', 'write')
  async setCustomFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCustomFieldValuesDto,
    @CurrentUser() user: User
  ) {
    return this.customFieldsService.setMultipleCustomFieldValues(id, dto.values, user);
  }
}
