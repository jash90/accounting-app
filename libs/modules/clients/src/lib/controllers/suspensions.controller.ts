import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { NotificationType, User } from '@accounting/common';
import { NotificationInterceptor, NotifyOn } from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  CreateSuspensionDto,
  SuspensionResponseDto,
  UpdateSuspensionDto,
} from '../dto/suspension.dto';
import { SuspensionService } from '../services/suspension.service';

/**
 * Controller for managing client suspension history.
 * Provides CRUD operations for suspension periods with start/end dates.
 */
@ApiTags('Client Suspensions')
@ApiBearerAuth()
@Controller('modules/clients/:clientId/suspensions')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('clients')
export class SuspensionsController {
  constructor(private readonly suspensionService: SuspensionService) {}

  /**
   * Create a new suspension for a client.
   */
  @Post()
  @ApiOperation({
    summary: 'Create client suspension',
    description:
      'Creates a new suspension period for a client. ' +
      'Start date is required, end date is optional and can be set later.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Suspension created successfully',
    type: SuspensionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or overlapping suspension',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_SUSPENSION_CREATED,
    titleTemplate: '{{actor.firstName}} utworzył(a) zawieszenie dla klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateSuspensionDto,
    @CurrentUser() user: User
  ): Promise<SuspensionResponseDto> {
    return this.suspensionService.create(clientId, dto, user);
  }

  /**
   * Get all suspensions for a client.
   */
  @Get()
  @ApiOperation({
    summary: 'Get client suspension history',
    description: 'Retrieves all suspension periods for a client, ordered by start date descending.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of suspensions',
    type: [SuspensionResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'read')
  async findAll(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ): Promise<SuspensionResponseDto[]> {
    return this.suspensionService.findAll(clientId, user);
  }

  /**
   * Get a specific suspension.
   */
  @Get(':suspensionId')
  @ApiOperation({
    summary: 'Get suspension details',
    description: 'Retrieves details of a specific suspension period.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'suspensionId',
    type: 'string',
    format: 'uuid',
    description: 'Suspension ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspension details',
    type: SuspensionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Suspension or client not found',
  })
  @RequirePermission('clients', 'read')
  async findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('suspensionId', ParseUUIDPipe) suspensionId: string,
    @CurrentUser() user: User
  ): Promise<SuspensionResponseDto> {
    return this.suspensionService.findOne(clientId, suspensionId, user);
  }

  /**
   * Update a suspension (e.g., set or change end date).
   */
  @Patch(':suspensionId')
  @ApiOperation({
    summary: 'Update suspension',
    description:
      'Updates a suspension period. Typically used to set or change the end date (resumption date).',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'suspensionId',
    type: 'string',
    format: 'uuid',
    description: 'Suspension ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspension updated successfully',
    type: SuspensionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or overlapping suspension',
  })
  @ApiResponse({
    status: 404,
    description: 'Suspension or client not found',
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_SUSPENSION_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) zawieszenie klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('suspensionId', ParseUUIDPipe) suspensionId: string,
    @Body() dto: UpdateSuspensionDto,
    @CurrentUser() user: User
  ): Promise<SuspensionResponseDto> {
    return this.suspensionService.update(clientId, suspensionId, dto, user);
  }

  /**
   * Delete a suspension.
   */
  @Delete(':suspensionId')
  @ApiOperation({
    summary: 'Delete suspension',
    description: 'Permanently deletes a suspension period from the history.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'suspensionId',
    type: 'string',
    format: 'uuid',
    description: 'Suspension ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspension deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Suspension or client not found',
  })
  @RequirePermission('clients', 'delete')
  @NotifyOn({
    type: NotificationType.CLIENT_SUSPENSION_DELETED,
    titleTemplate: '{{actor.firstName}} usunął/usunęła zawieszenie klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('suspensionId', ParseUUIDPipe) suspensionId: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.suspensionService.remove(clientId, suspensionId, user);
    return { message: 'Zawieszenie zostało usunięte' };
  }
}
