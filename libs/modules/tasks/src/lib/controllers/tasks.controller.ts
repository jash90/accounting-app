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
  ApiQuery,
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

import { StatsPeriodFilterDto } from '../dto/task-extended-stats.dto';
import {
  ClientTaskStatisticsDto,
  GlobalTaskStatisticsDto,
  KanbanBoardResponseDto,
  PaginatedTasksResponseDto,
  TaskErrorResponseDto,
  TaskResponseDto,
  TaskSuccessResponseDto,
} from '../dto/task-response.dto';
import {
  BulkUpdateStatusDto,
  CreateTaskDto,
  ReorderTasksDto,
  TaskFiltersDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { TaskExportService } from '../services/task-export.service';
import { TaskExtendedStatsService } from '../services/task-extended-stats.service';
import { TasksService } from '../services/tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@ApiExtraModels(
  TaskResponseDto,
  PaginatedTasksResponseDto,
  KanbanBoardResponseDto,
  ClientTaskStatisticsDto,
  GlobalTaskStatisticsDto,
  TaskSuccessResponseDto,
  TaskErrorResponseDto
)
@Controller('modules/tasks')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@UseInterceptors(NotificationInterceptor)
@RequireModule('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskExportService: TaskExportService,
    private readonly taskExtendedStatsService: TaskExtendedStatsService
  ) {}

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('export')
  @ApiOperation({
    summary: 'Export tasks to CSV',
    description: 'Exports all tasks matching the current filters to a CSV file.',
  })
  @ApiCsvResponse()
  @RequirePermission('tasks', 'read')
  async exportToCsv(
    @Query() filters: TaskFiltersDto,
    @CurrentUser() user: User,
    @Res() res: Response
  ) {
    const csvBuffer = await this.taskExportService.exportToCsv(filters, user);
    sendCsvResponse(res, csvBuffer, 'tasks-export');
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description: 'Retrieves a paginated list of tasks with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of tasks',
    type: PaginatedTasksResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: TaskErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async findAll(@CurrentUser() user: User, @Query() filters: TaskFiltersDto) {
    return this.tasksService.findAll(user, filters);
  }

  @Get('kanban')
  @ApiOperation({
    summary: 'Get kanban board',
    description: 'Retrieves tasks grouped by status for kanban view.',
  })
  @ApiResponse({ status: 200, description: 'Kanban board data', type: KanbanBoardResponseDto })
  @RequirePermission('tasks', 'read')
  async getKanban(@CurrentUser() user: User, @Query() filters: TaskFiltersDto) {
    return this.tasksService.getKanbanBoard(user, filters);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get calendar tasks',
    description: 'Retrieves tasks with due dates within the specified range.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date (ISO 8601)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date (ISO 8601)',
    example: '2024-12-31',
  })
  @ApiResponse({ status: 200, description: 'Tasks for calendar', type: [TaskResponseDto] })
  @RequirePermission('tasks', 'read')
  async getCalendar(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.tasksService.getCalendarTasks(user, startDate, endDate);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get global task statistics',
    description: 'Retrieves aggregated task statistics for the entire company.',
  })
  @ApiResponse({
    status: 200,
    description: 'Global task statistics',
    type: GlobalTaskStatisticsDto,
  })
  @RequirePermission('tasks', 'read')
  async getGlobalStatistics(@CurrentUser() user: User) {
    return this.tasksService.getGlobalStatistics(user);
  }

  @Get('statistics/client/:clientId')
  @ApiOperation({
    summary: 'Get task statistics for a client',
    description: 'Retrieves aggregated task statistics for a specific client.',
  })
  @ApiParam({ name: 'clientId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Client task statistics',
    type: ClientTaskStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Client not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async getClientStatistics(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() user: User
  ) {
    return this.tasksService.getClientTaskStatistics(clientId, user);
  }

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('statistics/extended/completion-duration')
  @ApiOperation({ summary: 'Get task completion duration statistics (admin/owner only)' })
  @RequirePermission('tasks', 'manage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCompletionDurationStats(
    @CurrentUser() user: User,
    @Query() filters: StatsPeriodFilterDto
  ) {
    return this.taskExtendedStatsService.getCompletionDurationStats(user, filters);
  }

  // eslint-disable-next-line @darraghor/nestjs-typed/api-method-should-specify-api-response
  @Get('statistics/extended/employee-ranking')
  @ApiOperation({ summary: 'Get employee task completion ranking (admin/owner only)' })
  @RequirePermission('tasks', 'manage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getEmployeeCompletionRanking(
    @CurrentUser() user: User,
    @Query() filters: StatsPeriodFilterDto
  ) {
    return this.taskExtendedStatsService.getEmployeeCompletionRanking(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task details', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.tasksService.findOne(id, user);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks of a task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Subtasks list', type: [TaskResponseDto] })
  @RequirePermission('tasks', 'read')
  async getSubtasks(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.tasksService.getSubtasks(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  @NotifyOn({
    type: NotificationType.TASK_CREATED,
    titleTemplate: '{{actor.firstName}} utworzył(a) zadanie "{{title}}"',
    messageTemplate: 'Nowe zadanie zostało utworzone',
    actionUrlTemplate: '/modules/tasks/list?taskId={{id}}',
    recipientResolver: 'assignee',
  })
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder tasks',
    description: 'Update the sort order of tasks (for drag & drop)',
  })
  @ApiResponse({ status: 200, description: 'Tasks reordered', type: TaskSuccessResponseDto })
  @RequirePermission('tasks', 'write')
  async reorder(@Body() dto: ReorderTasksDto, @CurrentUser() user: User) {
    await this.tasksService.reorderTasks(dto, user);
    return { message: 'Zadania zostały przesortowane' };
  }

  @Patch('bulk-status')
  @ApiOperation({
    summary: 'Bulk update task status',
    description: 'Update status of multiple tasks at once',
  })
  @ApiResponse({ status: 200, description: 'Tasks updated' })
  @RequirePermission('tasks', 'write')
  async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto, @CurrentUser() user: User) {
    return this.tasksService.bulkUpdateStatus(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task updated', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  @NotifyOn({
    type: NotificationType.TASK_UPDATED,
    titleTemplate: '{{actor.firstName}} zaktualizował(a) zadanie "{{title}}"',
    actionUrlTemplate: '/modules/tasks/list?taskId={{id}}',
    recipientResolver: 'assignee',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task deleted', type: TaskSuccessResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'delete')
  @NotifyOn({
    type: NotificationType.TASK_DELETED,
    titleTemplate: '{{actor.firstName}} usunął/usunęła zadanie',
    recipientResolver: 'companyUsersExceptActor',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.tasksService.softDeleteTask(id, user);
    return { message: 'Zadanie zostało usunięte' };
  }
}
