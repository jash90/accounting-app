import {
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskDependencyType } from '@accounting/common';

export class CreateTaskDependencyDto {
  @ApiProperty({ description: 'ID of the task this one depends on' })
  @IsUUID()
  dependsOnTaskId!: string;

  @ApiProperty({ enum: TaskDependencyType, default: TaskDependencyType.BLOCKED_BY })
  @IsEnum(TaskDependencyType)
  dependencyType!: TaskDependencyType;
}
