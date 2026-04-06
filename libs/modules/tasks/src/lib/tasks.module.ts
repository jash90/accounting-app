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
import { TaskTemplatesController } from './controllers/task-templates.controller';
import { TasksLookupController } from './controllers/tasks-lookup.controller';
import { TasksController } from './controllers/tasks.controller';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskDeadlineNotificationsService } from './services/task-deadline-notifications.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TaskExportService } from './services/task-export.service';
import { TaskExtendedStatsService } from './services/task-extended-stats.service';
import { TaskLabelsService } from './services/task-labels.service';
import { TaskNotificationService } from './services/task-notification.service';
import { TaskRecurrenceService } from './services/task-recurrence.service';
import { TaskStatisticsService } from './services/task-statistics.service';
import { TaskTemplateService } from './services/task-template.service';
import { TaskViewsService } from './services/task-views.service';
import { TasksLookupService } from './services/tasks-lookup.service';
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
    TaskTemplatesController,
    TasksLookupController,
    TaskLabelsController,
    TaskCommentsController,
    TaskDependenciesController,
    TasksController,
  ],
  providers: [
    TasksService,
    TaskStatisticsService,
    TaskViewsService,
    TasksLookupService,
    TaskExportService,
    TaskExtendedStatsService,
    TaskLabelsService,
    TaskCommentsService,
    TaskDependenciesService,
    TaskNotificationService,
    TaskTemplateService,
    TaskRecurrenceService,
    TaskDeadlineNotificationsService,
  ],
  exports: [
    TasksService,
    TaskLabelsService,
    TaskCommentsService,
    TaskDependenciesService,
    TaskTemplateService,
  ],
})
export class TasksModule {}
