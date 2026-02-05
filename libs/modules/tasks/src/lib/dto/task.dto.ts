import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Sanitize, SanitizeWithFormatting, TaskPriority, TaskStatus } from '@accounting/common';

export class AcceptanceCriterionDto {
  @ApiProperty({ description: 'Unique ID of the criterion' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Text of the criterion' })
  @Sanitize()
  @IsString()
  @MaxLength(500)
  text!: string;

  @ApiProperty({ description: 'Whether the criterion is completed' })
  @IsBoolean()
  completed!: boolean;
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', minLength: 1, maxLength: 255 })
  @Sanitize()
  @IsString()
  @MinLength(1, { message: 'Tytuł jest wymagany' })
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Task description (supports rich text)' })
  @IsOptional()
  @SanitizeWithFormatting()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-12-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Estimated time in minutes', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Story points (1, 2, 3, 5, 8, 13, 21)', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  storyPoints?: number;

  @ApiPropertyOptional({
    description: 'Acceptance criteria checklist',
    type: [AcceptanceCriterionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcceptanceCriterionDto)
  acceptanceCriteria?: AcceptanceCriterionDto[];

  @ApiPropertyOptional({ description: 'Associated client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Parent task ID (for subtasks)' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ description: 'Label IDs to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds?: string[];
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class TaskFiltersDto {
  @ApiPropertyOptional({ description: 'Search in title and description', maxLength: 100 })
  @IsOptional()
  @Sanitize()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskStatus,
    isArray: true,
    description: 'Filter by multiple statuses',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  statuses?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by label ID' })
  @IsOptional()
  @IsUUID()
  labelId?: string;

  @ApiPropertyOptional({ description: 'Filter tasks due on or before this date' })
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @ApiPropertyOptional({ description: 'Filter tasks due on or after this date' })
  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @ApiPropertyOptional({ description: 'Include only root tasks (no parent)', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  rootOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ReorderTasksDto {
  @ApiProperty({ description: 'Array of task IDs in new order', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds!: string[];

  @ApiPropertyOptional({ description: 'New status for reordered tasks (for kanban moves)' })
  @IsOptional()
  @IsEnum(TaskStatus)
  newStatus?: TaskStatus;
}

export class BulkUpdateStatusDto {
  @ApiProperty({ description: 'Task IDs to update', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds!: string[];

  @ApiProperty({ enum: TaskStatus, description: 'New status' })
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
