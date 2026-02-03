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
  CreateReliefPeriodDto,
  ReliefPeriodResponseDto,
  UpdateReliefPeriodDto,
} from '../dto/relief-period.dto';
import { ReliefPeriodService } from '../services/relief-period.service';

/**
 * Controller for managing client relief periods (ulgi).
 * Provides CRUD operations for relief periods with start/end dates.
 */
@ApiTags('Client Relief Periods')
@ApiBearerAuth()
@Controller('modules/clients/:clientId/relief-periods')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('clients')
export class ReliefPeriodsController {
  constructor(private readonly reliefPeriodService: ReliefPeriodService) {}

  /**
   * Create a new relief period for a client.
   */
  @Post()
  @ApiOperation({
    summary: 'Create client relief period',
    description:
      'Creates a new relief period for a client. ' +
      'Start date is required, end date is auto-calculated based on relief type if not provided.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Relief period created successfully',
    type: ReliefPeriodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error or duplicate relief type',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_RELIEF_CREATED,
    titleTemplate: '{{actor.firstName}} dodał(a) ulgę dla klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateReliefPeriodDto,
    @CurrentUser() user: User
  ): Promise<ReliefPeriodResponseDto> {
    return this.reliefPeriodService.create(clientId, dto, user);
  }

  /**
   * Get all relief periods for a client.
   */
  @Get()
  @ApiOperation({
    summary: 'Get client relief periods',
    description: 'Retrieves all relief periods for a client, ordered by start date descending.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of relief periods',
    type: [ReliefPeriodResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  @RequirePermission('clients', 'read')
  async findAll(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ): Promise<ReliefPeriodResponseDto[]> {
    return this.reliefPeriodService.findAll(clientId, user);
  }

  /**
   * Get a specific relief period.
   */
  @Get(':reliefId')
  @ApiOperation({
    summary: 'Get relief period details',
    description: 'Retrieves details of a specific relief period.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'reliefId',
    type: 'string',
    format: 'uuid',
    description: 'Relief period ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Relief period details',
    type: ReliefPeriodResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Relief period or client not found',
  })
  @RequirePermission('clients', 'read')
  async findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('reliefId', ParseUUIDPipe) reliefId: string,
    @CurrentUser() user: User
  ): Promise<ReliefPeriodResponseDto> {
    return this.reliefPeriodService.findOne(clientId, reliefId, user);
  }

  /**
   * Update a relief period (e.g., change dates or deactivate).
   */
  @Patch(':reliefId')
  @ApiOperation({
    summary: 'Update relief period',
    description: 'Updates a relief period. Can change dates or deactivate the relief.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'reliefId',
    type: 'string',
    format: 'uuid',
    description: 'Relief period ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Relief period updated successfully',
    type: ReliefPeriodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Relief period or client not found',
  })
  @RequirePermission('clients', 'write')
  @NotifyOn({
    type: NotificationType.CLIENT_RELIEF_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) ulgę klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('reliefId', ParseUUIDPipe) reliefId: string,
    @Body() dto: UpdateReliefPeriodDto,
    @CurrentUser() user: User
  ): Promise<ReliefPeriodResponseDto> {
    return this.reliefPeriodService.update(clientId, reliefId, dto, user);
  }

  /**
   * Delete a relief period.
   */
  @Delete(':reliefId')
  @ApiOperation({
    summary: 'Delete relief period',
    description: 'Permanently deletes a relief period from the client.',
  })
  @ApiParam({
    name: 'clientId',
    type: 'string',
    format: 'uuid',
    description: 'Client ID',
  })
  @ApiParam({
    name: 'reliefId',
    type: 'string',
    format: 'uuid',
    description: 'Relief period ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Relief period deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Relief period or client not found',
  })
  @RequirePermission('clients', 'delete')
  @NotifyOn({
    type: NotificationType.CLIENT_RELIEF_DELETED,
    titleTemplate: '{{actor.firstName}} usunął/usunęła ulgę klienta',
    actionUrlTemplate: '/modules/clients/{{clientId}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('reliefId', ParseUUIDPipe) reliefId: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.reliefPeriodService.remove(clientId, reliefId, user);
    return { message: 'Ulga została usunięta' };
  }
}
