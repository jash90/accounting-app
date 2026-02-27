import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
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

import { Response } from 'express';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { ApiCsvResponse, NotificationType, User } from '@accounting/common';
import { sendCsvResponse } from '@accounting/common/backend';
import { NotificationInterceptor, NotifyOn } from '@accounting/modules/notifications';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  AssignSettlementDto,
  BlockedClientsStatsDto,
  BulkAssignDto,
  BulkAssignResultDto,
  CreateCommentDto,
  EmployeeStatsListDto,
  GetSettlementsQueryDto,
  InitializeMonthDto,
  InitializeMonthResultDto,
  MonthYearQueryDto,
  MyStatsDto,
  SettlementCommentResponseDto,
  SettlementCompletionDurationStatsDto,
  SettlementEmployeeRankingDto,
  SettlementResponseDto,
  SettlementSettingsResponseDto,
  SettlementStatsDto,
  SettlementStatsPeriodFilterDto,
  UpdateSettlementDto,
  UpdateSettlementSettingsDto,
  UpdateSettlementStatusDto,
} from '../dto';
import { SettlementCommentsService } from '../services/settlement-comments.service';
import { SettlementExportService } from '../services/settlement-export.service';
import { SettlementExtendedStatsService } from '../services/settlement-extended-stats.service';
import { SettlementSettingsService } from '../services/settlement-settings.service';
import { SettlementStatsService } from '../services/settlement-stats.service';
import { SettlementsService } from '../services/settlements.service';

@ApiTags('Settlements')
@ApiBearerAuth()
@ApiExtraModels(
  SettlementResponseDto,
  SettlementStatsDto,
  EmployeeStatsListDto,
  MyStatsDto,
  InitializeMonthResultDto,
  BulkAssignResultDto,
  SettlementCommentResponseDto
)
@Controller('modules/settlements')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('settlements')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
    private readonly statsService: SettlementStatsService,
    private readonly commentsService: SettlementCommentsService,
    private readonly exportService: SettlementExportService,
    private readonly settingsService: SettlementSettingsService,
    private readonly extendedStatsService: SettlementExtendedStatsService
  ) {}

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('export')
  @ApiOperation({
    summary: 'Export settlements to CSV',
    description: 'Exports all settlements matching the current filters to a CSV file.',
  })
  @ApiCsvResponse()
  @RequirePermission('settlements', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportToCsv(
    @Query() filters: GetSettlementsQueryDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const csvBuffer = await this.exportService.exportToCsv(filters, user);
    sendCsvResponse(res, csvBuffer, 'settlements-export');
  }

  @Get()
  @ApiOperation({
    summary: 'Get all settlements for month/year',
    description:
      'Retrieves a paginated list of settlements for the specified month and year. ' +
      'Employees see only their assigned settlements, owners/admins see all.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of settlements',
  })
  @RequirePermission('settlements', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async findAll(@Query() query: GetSettlementsQueryDto, @CurrentUser() user: User) {
    return this.settlementsService.findAll(query, user);
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get settlement statistics overview',
    description:
      'Returns aggregate statistics for settlements in the specified month/year. ' +
      'Includes counts by status, unassigned count, and completion rate.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement statistics',
    type: SettlementStatsDto,
  })
  @RequirePermission('settlements', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getOverviewStats(
    @Query() query: MonthYearQueryDto,
    @CurrentUser() user: User
  ): Promise<SettlementStatsDto> {
    return this.statsService.getOverviewStats(query.month, query.year, user);
  }

  @Get('stats/employees')
  @ApiOperation({
    summary: 'Get settlement statistics per employee',
    description:
      'Returns settlement statistics broken down by employee. ' +
      'Only available to company owners and admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee statistics list',
    type: EmployeeStatsListDto,
  })
  @RequirePermission('settlements', 'manage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getEmployeeStats(
    @Query() query: MonthYearQueryDto,
    @CurrentUser() user: User
  ): Promise<EmployeeStatsListDto> {
    return this.statsService.getEmployeeStats(query.month, query.year, user);
  }

  @Get('stats/my')
  @ApiOperation({
    summary: 'Get my settlement statistics',
    description: 'Returns settlement statistics for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'My statistics',
    type: MyStatsDto,
  })
  @RequirePermission('settlements', 'read')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getMyStats(
    @Query() query: MonthYearQueryDto,
    @CurrentUser() user: User
  ): Promise<MyStatsDto> {
    return this.statsService.getMyStats(query.month, query.year, user);
  }

  @Get('stats/extended/completion-duration')
  @ApiOperation({ summary: 'Get settlement completion duration statistics' })
  @ApiResponse({
    status: 200,
    description: 'Completion duration statistics',
    type: SettlementCompletionDurationStatsDto,
  })
  @RequirePermission('settlements', 'manage')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSettlementCompletionDurationStats(
    @CurrentUser() user: User,
    @Query() filters: SettlementStatsPeriodFilterDto
  ): Promise<SettlementCompletionDurationStatsDto> {
    return this.extendedStatsService.getCompletionDurationStats(user, filters);
  }

  @Get('stats/extended/employee-ranking')
  @ApiOperation({ summary: 'Get employee settlement completion ranking' })
  @ApiResponse({
    status: 200,
    description: 'Employee ranking by completed settlements',
    type: SettlementEmployeeRankingDto,
  })
  @RequirePermission('settlements', 'manage')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSettlementEmployeeRanking(
    @CurrentUser() user: User,
    @Query() filters: SettlementStatsPeriodFilterDto
  ): Promise<SettlementEmployeeRankingDto> {
    return this.extendedStatsService.getEmployeeCompletionRanking(user, filters);
  }

  @Get('stats/extended/blocked-clients')
  @ApiOperation({ summary: 'Get clients with frequent blocking' })
  @ApiResponse({
    status: 200,
    description: 'Blocked clients statistics',
    type: BlockedClientsStatsDto,
  })
  @RequirePermission('settlements', 'manage')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getBlockedClientsStats(
    @CurrentUser() user: User,
    @Query() filters: SettlementStatsPeriodFilterDto
  ): Promise<BlockedClientsStatsDto> {
    return this.extendedStatsService.getBlockedClientsStats(user, filters);
  }

  @Get('assignable-users')
  @ApiOperation({
    summary: 'Get all assignable users for settlements module',
    description:
      "Returns all active employees from the user's company that can be assigned to settlements.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of assignable users',
  })
  @RequirePermission('settlements', 'manage')
  async getAllAssignableUsers(@CurrentUser() user: User) {
    return this.settlementsService.getAllAssignableUsers(user);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Get settlement module settings',
    description:
      'Returns the settlement module settings for the current company. Creates defaults if not set.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement settings',
    type: SettlementSettingsResponseDto,
  })
  @RequirePermission('settlements', 'manage')
  async getSettings(@CurrentUser() user: User): Promise<SettlementSettingsResponseDto> {
    return this.settingsService.getSettings(user);
  }

  @Patch('settings')
  @ApiOperation({
    summary: 'Update settlement module settings',
    description: 'Updates the settlement module settings for the current company.',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated settlement settings',
    type: SettlementSettingsResponseDto,
  })
  @RequirePermission('settlements', 'manage')
  async updateSettings(
    @Body() dto: UpdateSettlementSettingsDto,
    @CurrentUser() user: User
  ): Promise<SettlementSettingsResponseDto> {
    return this.settingsService.updateSettings(dto, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a settlement by ID',
    description: 'Retrieves detailed information about a specific settlement.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement details',
    type: SettlementResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User lacks access to this settlement',
  })
  @ApiResponse({
    status: 404,
    description: 'Settlement not found',
  })
  @RequirePermission('settlements', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.settlementsService.findOne(id, user);
  }

  @Get(':id/assignable-users')
  @ApiOperation({
    summary: 'Get assignable users for a settlement',
    description:
      "Returns all active employees from the settlement's company that can be assigned to the settlement.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assignable users',
  })
  @RequirePermission('settlements', 'manage')
  async getAssignableUsers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.settlementsService.getAssignableUsers(id, user);
  }

  @Post('initialize')
  @ApiOperation({
    summary: 'Initialize settlements for a month',
    description:
      'Creates settlement records for all active clients for the specified month/year. ' +
      'Skips clients that already have a settlement for that period. ' +
      'Only available to company owners and admins.',
  })
  @ApiResponse({
    status: 201,
    description: 'Initialization result',
    type: InitializeMonthResultDto,
  })
  @RequirePermission('settlements', 'manage')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_MONTH_INITIALIZED,
    titleTemplate: '{{actor.firstName}} zainicjalizował(a) miesiąc rozliczeń',
    messageTemplate: 'Nowe rozliczenia zostały zainicjalizowane',
    recipientResolver: 'companyUsersExceptActor',
  })
  async initializeMonth(
    @Body() dto: InitializeMonthDto,
    @CurrentUser() user: User
  ): Promise<InitializeMonthResultDto> {
    return this.settlementsService.createMonthlySettlements(dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update settlement status',
    description: 'Updates the status of a settlement. Status changes are recorded in history.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated settlement',
    type: SettlementResponseDto,
  })
  @RequirePermission('settlements', 'write')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_STATUS_CHANGED,
    titleTemplate: '{{actor.firstName}} zmienił(a) status rozliczenia',
    actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSettlementStatusDto,
    @CurrentUser() user: User
  ) {
    return this.settlementsService.updateStatus(id, dto, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update settlement details',
    description: 'Updates various settlement fields like notes, invoice count, etc.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated settlement',
    type: SettlementResponseDto,
  })
  @RequirePermission('settlements', 'write')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) rozliczenie',
    actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSettlementDto,
    @CurrentUser() user: User
  ) {
    return this.settlementsService.update(id, dto, user);
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign settlement to employee',
    description:
      'Assigns a settlement to an employee or unassigns it (pass null userId). ' +
      'Only available to company owners and admins.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated settlement',
    type: SettlementResponseDto,
  })
  @RequirePermission('settlements', 'manage')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_ASSIGNED,
    titleTemplate: '{{actor.firstName}} przypisał(a) rozliczenie',
    actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async assignToEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSettlementDto,
    @CurrentUser() user: User
  ) {
    return this.settlementsService.assignToEmployee(id, dto, user);
  }

  @Post('bulk-assign')
  @ApiOperation({
    summary: 'Bulk assign settlements to employee',
    description:
      'Assigns multiple settlements to a single employee. ' +
      'Only available to company owners and admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk assignment result',
    type: BulkAssignResultDto,
  })
  @RequirePermission('settlements', 'manage')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_BULK_ASSIGNED,
    titleTemplate: '{{actor.firstName}} masowo przypisał(a) rozliczenia',
    recipientResolver: 'companyUsersExceptActor',
  })
  async bulkAssign(
    @Body() dto: BulkAssignDto,
    @CurrentUser() user: User
  ): Promise<BulkAssignResultDto> {
    return this.settlementsService.bulkAssign(dto, user);
  }

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Get comments for a settlement',
    description: 'Retrieves all comments for a specific settlement.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of comments',
    type: [SettlementCommentResponseDto],
  })
  @RequirePermission('settlements', 'read')
  async getComments(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.commentsService.getComments(id, user);
  }

  @Post(':id/send-missing-invoice-email')
  @ApiOperation({ summary: 'Send missing invoice email to client' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  @RequirePermission('settlements', 'write')
  async sendMissingInvoiceEmail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.settlementsService.sendMissingInvoiceEmail(id, user);
  }

  @Post(':id/comments')
  @ApiOperation({
    summary: 'Add a comment to a settlement',
    description: 'Adds a new comment to a settlement.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Settlement ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Created comment',
    type: SettlementCommentResponseDto,
  })
  @RequirePermission('settlements', 'write')
  @NotifyOn({
    type: NotificationType.SETTLEMENT_COMMENT_ADDED,
    titleTemplate: '{{actor.firstName}} dodał(a) komentarz do rozliczenia',
    actionUrlTemplate: '/modules/settlements?settlementId={{id}}',
    recipientResolver: 'companyUsersExceptActor',
  })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User
  ) {
    return this.commentsService.addComment(id, dto, user);
  }
}
