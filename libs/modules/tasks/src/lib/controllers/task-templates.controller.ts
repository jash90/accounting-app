import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard } from '@accounting/auth';
import { Task, User } from '@accounting/common';
import {
  ModuleAccessGuard,
  PermissionGuard,
  RequireModule,
  RequirePermission,
} from '@accounting/rbac';

import {
  CreateTaskTemplateDto,
  TaskTemplateFiltersDto,
  UpdateTaskTemplateDto,
} from '../dto/task-template.dto';
import { TaskTemplateService } from '../services/task-template.service';

@ApiTags('Task Templates')
@ApiBearerAuth()
@Controller('modules/tasks/templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TaskTemplatesController {
  constructor(private readonly templateService: TaskTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task templates' })
  @ApiResponse({ status: 200, description: 'List of task templates' })
  @RequirePermission('tasks', 'read')
  async findAll(@Query() filters: TaskTemplateFiltersDto, @CurrentUser() user: User) {
    return this.templateService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task template by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Task template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @RequirePermission('tasks', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<Task> {
    return this.templateService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task template' })
  @ApiResponse({ status: 201, description: 'Created task template' })
  @RequirePermission('tasks', 'write')
  async create(@Body() dto: CreateTaskTemplateDto, @CurrentUser() user: User): Promise<Task> {
    return this.templateService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Updated task template' })
  @RequirePermission('tasks', 'write')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskTemplateDto,
    @CurrentUser() user: User
  ): Promise<Task> {
    return this.templateService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (soft) a task template' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @RequirePermission('tasks', 'delete')
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<void> {
    return this.templateService.delete(id, user);
  }

  @Post(':id/create-task')
  @ApiOperation({
    summary: 'Create a task from a template',
    description: 'Instantiates a new task from the specified template.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Created task' })
  @RequirePermission('tasks', 'write')
  async createFromTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<Task> {
    return this.templateService.createTaskFromTemplate(id, user);
  }
}
