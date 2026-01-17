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
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@accounting/auth';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';
import { User } from '@accounting/common';
import { TasksService } from '../services/tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskFiltersDto,
  ReorderTasksDto,
  BulkUpdateStatusDto,
} from '../dto/task.dto';
import {
  TaskResponseDto,
  PaginatedTasksResponseDto,
  KanbanBoardResponseDto,
  SuccessMessageResponseDto,
  ErrorResponseDto,
} from '../dto/task-response.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@ApiExtraModels(
  TaskResponseDto,
  PaginatedTasksResponseDto,
  KanbanBoardResponseDto,
  SuccessMessageResponseDto,
  ErrorResponseDto,
)
@Controller('modules/tasks')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description: 'Retrieves a paginated list of tasks with optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks', type: PaginatedTasksResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden', type: ErrorResponseDto })
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
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO 8601)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO 8601)', example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Tasks for calendar', type: [TaskResponseDto] })
  @RequirePermission('tasks', 'read')
  async getCalendar(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.tasksService.getCalendarTasks(user, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task details', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: ErrorResponseDto })
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
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder tasks',
    description: 'Update the sort order of tasks (for drag & drop)',
  })
  @ApiResponse({ status: 200, description: 'Tasks reordered', type: SuccessMessageResponseDto })
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
  @ApiResponse({ status: 404, description: 'Task not found', type: ErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task deleted', type: SuccessMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: ErrorResponseDto })
  @RequirePermission('tasks', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.tasksService.remove(id, user);
    return { message: 'Zadanie zostało usunięte' };
  }
}
