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

import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dto/task-comment.dto';
import {
  TaskCommentResponseDto,
  TaskErrorResponseDto,
  TaskSuccessResponseDto,
} from '../dto/task-response.dto';
import { TaskCommentsService } from '../services/task-comments.service';

@ApiTags('Task Comments')
@ApiBearerAuth()
@Controller('modules/tasks')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionGuard)
@RequireModule('tasks')
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Get(':taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of comments', type: [TaskCommentResponseDto] })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'read')
  async findAll(@Param('taskId', ParseUUIDPipe) taskId: string, @CurrentUser() user: User) {
    return this.commentsService.findAllForTask(taskId, user);
  }

  @Post(':taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Comment created', type: TaskCommentResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async create(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: User
  ) {
    return this.commentsService.create(taskId, dto, user);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Comment updated', type: TaskCommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async update(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateTaskCommentDto,
    @CurrentUser() user: User
  ) {
    return this.commentsService.update(commentId, dto, user);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Comment deleted', type: TaskSuccessResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found', type: TaskErrorResponseDto })
  @RequirePermission('tasks', 'write')
  async remove(@Param('commentId', ParseUUIDPipe) commentId: string, @CurrentUser() user: User) {
    await this.commentsService.remove(commentId, user);
    return { message: 'Komentarz został usunięty' };
  }
}
