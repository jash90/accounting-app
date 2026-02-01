import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ChangeLog,
  Client,
  ClientCustomFieldValue,
  ClientDeleteRequest,
  ClientEmployee,
  ClientFieldDefinition,
  ClientIcon,
  ClientIconAssignment,
  ClientSuspension,
  Company,
  NotificationSettings,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { NotificationsModule } from '@accounting/modules/notifications';
import { RBACModule } from '@accounting/rbac';

import { ClientEmployeesController } from './controllers/client-employees.controller';
import { ClientsController } from './controllers/clients.controller';
import { DeleteRequestsController } from './controllers/delete-requests.controller';
import { FieldDefinitionsController } from './controllers/field-definitions.controller';
import { IconsController } from './controllers/icons.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { SuspensionsController } from './controllers/suspensions.controller';
import { AutoAssignService } from './services/auto-assign.service';
import { ClientChangelogService } from './services/client-changelog.service';
import { ClientEmployeesService } from './services/client-employees.service';
import { ClientIconsService } from './services/client-icons.service';
import { ClientsService } from './services/clients.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { DeleteRequestService } from './services/delete-request.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { ClientExportService } from './services/export.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { ClientStatisticsService } from './services/statistics.service';
import { SuspensionReminderService } from './services/suspension-reminder.service';
import { SuspensionService } from './services/suspension.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientEmployee,
      ClientFieldDefinition,
      ClientCustomFieldValue,
      ClientIcon,
      ClientIconAssignment,
      ClientSuspension,
      NotificationSettings,
      Company,
      User,
      ChangeLog,
      ClientDeleteRequest,
    ]),
    ScheduleModule.forRoot(),
    CommonModule,
    RBACModule,
    StorageModule,
    EmailModule,
    NotificationsModule,
  ],
  controllers: [
    // More specific routes must be registered before generic /:id routes
    FieldDefinitionsController,
    IconsController,
    NotificationSettingsController,
    DeleteRequestsController,
    SuspensionsController,
    ClientEmployeesController,
    ClientsController,
  ],
  providers: [
    ClientsService,
    ClientEmployeesService,
    CustomFieldsService,
    ClientIconsService,
    ClientChangelogService,
    NotificationSettingsService,
    ConditionEvaluatorService,
    AutoAssignService,
    DeleteRequestService,
    DuplicateDetectionService,
    ClientStatisticsService,
    ClientExportService,
    SuspensionService,
    SuspensionReminderService,
  ],
  exports: [
    ClientsService,
    ClientEmployeesService,
    CustomFieldsService,
    ClientIconsService,
    ClientChangelogService,
    NotificationSettingsService,
    ConditionEvaluatorService,
    AutoAssignService,
    DeleteRequestService,
    DuplicateDetectionService,
    ClientStatisticsService,
    ClientExportService,
    SuspensionService,
  ],
})
export class ClientsModule {}
