import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskDependencyType } from '@accounting/common';

export class TaskLabelResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() color!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class TaskAssigneeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
}

export class TaskClientResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nip?: string;
}

export class AcceptanceCriterionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() completed!: boolean;
}

export class TaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ enum: TaskPriority }) priority!: TaskPriority;
  @ApiPropertyOptional() dueDate?: Date;
  @ApiPropertyOptional() startDate?: Date;
  @ApiPropertyOptional() estimatedMinutes?: number;
  @ApiPropertyOptional() storyPoints?: number;
  @ApiPropertyOptional({ type: [AcceptanceCriterionResponseDto] }) acceptanceCriteria?: AcceptanceCriterionResponseDto[];
  @ApiProperty() sortOrder!: number;
  @ApiProperty() companyId!: string;
  @ApiPropertyOptional() clientId?: string;
  @ApiPropertyOptional({ type: TaskClientResponseDto }) client?: TaskClientResponseDto;
  @ApiPropertyOptional() assigneeId?: string;
  @ApiPropertyOptional({ type: TaskAssigneeResponseDto }) assignee?: TaskAssigneeResponseDto;
  @ApiProperty() createdById!: string;
  @ApiPropertyOptional() parentTaskId?: string;
  @ApiPropertyOptional({ type: [TaskResponseDto] }) subtasks?: TaskResponseDto[];
  @ApiPropertyOptional({ type: [TaskLabelResponseDto] }) labels?: TaskLabelResponseDto[];
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] }) data!: TaskResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

export class KanbanColumnDto {
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty() label!: string;
  @ApiProperty({ type: [TaskResponseDto] }) tasks!: TaskResponseDto[];
  @ApiProperty() count!: number;
}

export class KanbanBoardResponseDto {
  @ApiProperty({ type: [KanbanColumnDto] }) columns!: KanbanColumnDto[];
}

export class TaskCommentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() content!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty() authorId!: string;
  @ApiPropertyOptional({ type: TaskAssigneeResponseDto }) author?: TaskAssigneeResponseDto;
  @ApiProperty() isEdited!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class TaskDependencyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() taskId!: string;
  @ApiProperty() dependsOnTaskId!: string;
  @ApiPropertyOptional({ type: TaskResponseDto }) dependsOnTask?: TaskResponseDto;
  @ApiProperty({ enum: TaskDependencyType }) dependencyType!: TaskDependencyType;
  @ApiProperty() createdById!: string;
  @ApiProperty() createdAt!: Date;
}

export class ClientTaskStatisticsDto {
  @ApiProperty({ description: 'Client ID' })
  clientId!: string;

  @ApiProperty({
    description: 'Task counts grouped by status',
    example: { backlog: 2, todo: 5, in_progress: 3, in_review: 1, done: 10 },
  })
  byStatus!: Record<TaskStatus, number>;

  @ApiProperty({ description: 'Total number of tasks' })
  totalCount!: number;

  @ApiProperty({ description: 'Sum of estimated minutes for all tasks' })
  totalEstimatedMinutes!: number;

  @ApiProperty({ description: 'Sum of story points for all tasks' })
  totalStoryPoints!: number;
}

export class SuccessMessageResponseDto {
  @ApiProperty() message!: string;
}

export class ErrorResponseDto {
  @ApiProperty() statusCode!: number;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() errorCode?: string;
  @ApiPropertyOptional() context?: Record<string, unknown>;
  @ApiProperty() timestamp!: string;
}
