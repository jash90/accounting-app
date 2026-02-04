import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import { CreateTaskDependencyDto } from '../dto/task-dependency.dto';
import {
  TaskDependencyResponseDto,
  TaskErrorResponseDto,
  TaskSuccessResponseDto,
} from '../dto/task-response.dto';
import { TaskDependenciesService } from '../services/task-dependencies.service';

@ApiTags('Task Dependencies')
@ApiBearerAuth()
@Controller('modules/tasks')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TaskDependenciesController {
  constructor(private readonly dependenciesService: TaskDependenciesService) {}

  @Get(':taskId/dependencies')
  @ApiOperation({
    summary: 'Get all dependencies for a task',
    description: 'Returns tasks that this task depends on (blocked by)',
  })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'List of dependencies',
    type: [TaskDependencyResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async findAll(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: User) {
    return this.dependenciesService.findAllForTask(taskId, user);
  }

  @Get(':taskId/dependencies/blocked-by')
  @ApiOperation({
    summary: 'Get tasks blocking this one',
    description: 'Returns tasks that must be completed before this task',
  })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Blocking tasks', type: [TaskDependencyResponseDto] })
  @RequirePermission('tasks', 'read')
  async getBlockedBy(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: User) {
    return this.dependenciesService.findBlockedBy(taskId, user);
  }

  @Get(':taskId/dependencies/blocking')
  @ApiOperation({
    summary: 'Get tasks blocked by this one',
    description: 'Returns tasks that cannot be started until this task is complete',
  })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Blocked tasks', type: [TaskDependencyResponseDto] })
  @RequirePermission('tasks', 'read')
  async getBlocking(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: User) {
    return this.dependenciesService.findBlocking(taskId, user);
  }

  @Post(':taskId/dependencies')
  @ApiOperation({
    summary: 'Add a dependency to a task',
    description: 'Creates a dependency relationship between tasks',
  })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Dependency created', type: TaskDependencyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Cycle detected or self-dependency',
    type: TaskErrorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Dependency already exists',
    type: TaskErrorResponseDto,
  })
  @RequirePermission('tasks', 'write')
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskDependencyDto,
    @CurrentUser() user: User
  ) {
    return this.dependenciesService.create(taskId, dto, user);
  }

  @Delete('dependencies/:dependencyId')
  @ApiOperation({ summary: 'Remove a dependency' })
  @ApiParam({ name: 'dependencyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Dependency removed', type: TaskSuccessResponseDto })
  @ApiResponse({ status: 404, description: 'Dependency not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async remove(
    @Param('dependencyId', ParseUUIDPipe) dependencyId: string,
    @CurrentUser() user: User
  ) {
    await this.dependenciesService.remove(dependencyId, user);
    return { message: 'Zależność została usunięta' };
  }
}
