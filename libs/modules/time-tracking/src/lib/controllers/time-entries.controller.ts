import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { TimeEntriesService } from '../services/time-entries.service';
import {
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  TimeEntryFiltersDto,
  SubmitTimeEntryDto,
  ApproveTimeEntryDto,
  RejectTimeEntryDto,
} from '../dto/time-entry.dto';
import {
  StartTimerDto,
  StopTimerDto,
  UpdateTimerDto,
} from '../dto/timer.dto';

@ApiTags('Time Tracking - Entries')
@ApiBearerAuth()
@Controller('modules/time-tracking/entries')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('time-tracking')
export class TimeEntriesController {
  constructor(private readonly entriesService: TimeEntriesService) {}

  // ========== CRUD Operations ==========

  @Get()
  @ApiOperation({
    summary: 'Get all time entries',
    description: 'Retrieves a paginated list of time entries with optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of time entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermission('time-tracking', 'read')
  async findAll(@CurrentUser() user: User, @Query() filters: TimeEntryFiltersDto) {
    return this.entriesService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get time entry by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry details' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  @RequirePermission('time-tracking', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.entriesService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new time entry' })
  @ApiResponse({ status: 201, description: 'Time entry created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Time entry overlaps with existing entry' })
  @RequirePermission('time-tracking', 'write')
  async create(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: User) {
    return this.entriesService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a time entry' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry updated' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  @ApiResponse({ status: 403, description: 'Time entry is locked' })
  @RequirePermission('time-tracking', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.entriesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a time entry (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry deleted' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  @RequirePermission('time-tracking', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.entriesService.remove(id, user);
    return { message: 'Wpis czasu został usunięty' };
  }

  // ========== Timer Operations ==========

  @Post('timer/start')
  @ApiOperation({
    summary: 'Start a timer',
    description: 'Starts a new running timer. Only one timer can be running at a time.',
  })
  @ApiResponse({ status: 201, description: 'Timer started' })
  @ApiResponse({ status: 409, description: 'Timer already running' })
  @RequirePermission('time-tracking', 'write')
  async startTimer(@Body() dto: StartTimerDto, @CurrentUser() user: User) {
    return this.entriesService.startTimer(dto, user);
  }

  @Post('timer/stop')
  @ApiOperation({
    summary: 'Stop the active timer',
    description: 'Stops the currently running timer and saves the time entry.',
  })
  @ApiResponse({ status: 200, description: 'Timer stopped' })
  @ApiResponse({ status: 404, description: 'No active timer' })
  @RequirePermission('time-tracking', 'write')
  async stopTimer(@Body() dto: StopTimerDto, @CurrentUser() user: User) {
    return this.entriesService.stopTimer(dto, user);
  }

  @Get('timer/active')
  @ApiOperation({
    summary: 'Get active timer',
    description: 'Retrieves the currently running timer, if any.',
  })
  @ApiResponse({ status: 200, description: 'Active timer or null' })
  @RequirePermission('time-tracking', 'read')
  async getActiveTimer(@CurrentUser() user: User) {
    return this.entriesService.getActiveTimer(user);
  }

  @Patch('timer/active')
  @ApiOperation({
    summary: 'Update active timer',
    description: 'Updates the description or other details of the running timer.',
  })
  @ApiResponse({ status: 200, description: 'Timer updated' })
  @ApiResponse({ status: 404, description: 'No active timer' })
  @RequirePermission('time-tracking', 'write')
  async updateActiveTimer(@Body() dto: UpdateTimerDto, @CurrentUser() user: User) {
    return this.entriesService.updateTimer(dto, user);
  }

  @Delete('timer/discard')
  @ApiOperation({
    summary: 'Discard active timer',
    description: 'Discards the currently running timer without saving.',
  })
  @ApiResponse({ status: 200, description: 'Timer discarded' })
  @ApiResponse({ status: 404, description: 'No active timer' })
  @RequirePermission('time-tracking', 'write')
  async discardTimer(@CurrentUser() user: User) {
    await this.entriesService.discardTimer(user);
    return { message: 'Timer został odrzucony' };
  }

  // ========== Approval Workflow ==========

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit time entry for approval',
    description: 'Submits a draft time entry for approval by a manager.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry submitted' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @RequirePermission('time-tracking', 'write')
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: SubmitTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.entriesService.submitEntry(id, user);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve time entry',
    description: 'Approves a submitted time entry. Requires manage permission.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry approved' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @RequirePermission('time-tracking', 'manage')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: ApproveTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.entriesService.approveEntry(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject time entry',
    description: 'Rejects a submitted time entry with a reason. Requires manage permission.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Time entry rejected' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @RequirePermission('time-tracking', 'manage')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.entriesService.rejectEntry(id, dto.rejectionNote || '', user);
  }
}
