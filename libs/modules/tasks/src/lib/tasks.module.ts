import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Task,
  TaskLabel,
  TaskLabelAssignment,
  TaskDependency,
  TaskComment,
  Company,
  User,
  Client,
  CommonModule,
} from '@accounting/common';
import { RBACModule } from '@accounting/rbac';
import { TasksService } from './services/tasks.service';
import { TaskLabelsService } from './services/task-labels.service';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TasksController } from './controllers/tasks.controller';
import { TaskLabelsController } from './controllers/task-labels.controller';
import { TaskCommentsController } from './controllers/task-comments.controller';
import { TaskDependenciesController } from './controllers/task-dependencies.controller';
import { TasksLookupController } from './controllers/tasks-lookup.controller';

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
    ]),
    CommonModule,
    RBACModule,
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
  ],
  exports: [
    TasksService,
    TaskLabelsService,
    TaskCommentsService,
    TaskDependenciesService,
  ],
})
export class TasksModule {}
