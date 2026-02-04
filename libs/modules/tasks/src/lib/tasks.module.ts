import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  Company,
  NotificationSettings,
  Task,
  TaskComment,
  TaskDependency,
  TaskLabel,
  TaskLabelAssignment,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { RBACModule } from '@accounting/rbac';

import { TaskCommentsController } from './controllers/task-comments.controller';
import { TaskDependenciesController } from './controllers/task-dependencies.controller';
import { TaskLabelsController } from './controllers/task-labels.controller';
import { TasksLookupController } from './controllers/tasks-lookup.controller';
import { TasksController } from './controllers/tasks.controller';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TaskLabelsService } from './services/task-labels.service';
import { TaskNotificationService } from './services/task-notification.service';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskLabel,
      TaskLabelAssignment,
      TaskDependency,
      TaskComment,
      Company,
      User,
      Client,
      NotificationSettings,
    ]),
    CommonModule,
    RBACModule,
    EmailModule,
  ],
  controllers: [
    // More specific routes must be registered before generic /:id routes
    TasksLookupController,
    TaskLabelsController,
    TaskCommentsController,
    TaskDependenciesController,
    TasksController,
  ],
  providers: [
    TasksService,
    TaskLabelsService,
    TaskCommentsService,
    TaskDependenciesService,
    TaskNotificationService,
  ],
  exports: [TasksService, TaskLabelsService, TaskCommentsService, TaskDependenciesService],
})
export class TasksModule {}
