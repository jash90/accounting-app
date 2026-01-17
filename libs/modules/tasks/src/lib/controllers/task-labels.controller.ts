import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { TaskLabelsService } from '../services/task-labels.service';
import { CreateTaskLabelDto, UpdateTaskLabelDto } from '../dto/task-label.dto';
import { TaskLabelResponseDto, SuccessMessageResponseDto, ErrorResponseDto } from '../dto/task-response.dto';

@ApiTags('Task Labels')
@ApiBearerAuth()
@Controller('modules/tasks/labels')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TaskLabelsController {
  constructor(private readonly labelsService: TaskLabelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all task labels' })
  @ApiResponse({ status: 200, description: 'List of labels', type: [TaskLabelResponseDto] })
  @RequirePermission('tasks', 'read')
  async findAll(@CurrentUser() user: User) {
    return this.labelsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get label by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Label details', type: TaskLabelResponseDto })
  @ApiResponse({ status: 404, description: 'Label not found', type: ErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.labelsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new label' })
  @ApiResponse({ status: 201, description: 'Label created', type: TaskLabelResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Label already exists', type: ErrorResponseDto })
  @RequirePermission('tasks', 'manage')
  async create(@Body() dto: CreateTaskLabelDto, @CurrentUser() user: User) {
    return this.labelsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a label' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Label updated', type: TaskLabelResponseDto })
  @ApiResponse({ status: 404, description: 'Label not found', type: ErrorResponseDto })
  @RequirePermission('tasks', 'manage')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskLabelDto,
    @CurrentUser() user: User,
  ) {
    return this.labelsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a label' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Label deleted', type: SuccessMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Label not found', type: ErrorResponseDto })
  @RequirePermission('tasks', 'manage')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.labelsService.remove(id, user);
    return { message: 'Etykieta została usunięta' };
  }
}
