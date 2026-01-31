import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
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

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  OwnerOrAdmin,
  OwnerOrAdminGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  AssignSettlementDto,
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
  SettlementResponseDto,
  SettlementStatsDto,
  UpdateSettlementDto,
  UpdateSettlementStatusDto,
} from '../dto';
import { SettlementCommentsService } from '../services/settlement-comments.service';
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
@RequireModule('settlements')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
    private readonly statsService: SettlementStatsService,
    private readonly commentsService: SettlementCommentsService
  ) {}

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
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
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
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('settlements', 'manage')
  async initializeMonth(
    @Body() dto: InitializeMonthDto,
    @CurrentUser() user: User
  ): Promise<InitializeMonthResultDto> {
    return this.settlementsService.initializeMonth(dto, user);
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
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('settlements', 'manage')
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
  @UseGuards(OwnerOrAdminGuard)
  @OwnerOrAdmin()
  @RequirePermission('settlements', 'manage')
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
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User
  ) {
    return this.commentsService.addComment(id, dto, user);
  }
}
