import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ChangeLog,
  Client,
  ClientCustomFieldValue,
  ClientDeleteRequest,
  ClientFieldDefinition,
  ClientIcon,
  ClientIconAssignment,
  ClientReliefPeriod,
  ClientSuspension,
  Company,
  CustomFieldReminder,
  NotificationSettings,
  Task,
  TimeEntry,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { NotificationsModule } from '@accounting/modules/notifications';
import { RBACModule } from '@accounting/rbac';

import { ClientBulkController } from './controllers/client-bulk.controller';
import { ClientChangelogController } from './controllers/client-changelog.controller';
import { ClientCustomFieldsController } from './controllers/client-custom-fields.controller';
import { ClientExportController } from './controllers/client-export.controller';
import { ClientStatisticsController } from './controllers/client-statistics.controller';
import { ClientsController } from './controllers/clients.controller';
import { DeleteRequestsController } from './controllers/delete-requests.controller';
import { FieldDefinitionsController } from './controllers/field-definitions.controller';
import { IconsController } from './controllers/icons.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { ReliefPeriodsController } from './controllers/relief-periods.controller';
import { SuspensionsController } from './controllers/suspensions.controller';
import { AutoAssignService } from './services/auto-assign.service';
import { ClientBulkService } from './services/client-bulk.service';
import { ClientChangelogEmailService } from './services/client-changelog-email.service';
import { ClientChangelogService } from './services/client-changelog.service';
import { ClientIconsService } from './services/client-icons.service';
import { ClientPkdService } from './services/client-pkd.service';
import { ClientsService } from './services/clients.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { CustomFieldReminderService } from './services/custom-field-reminder.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { DeleteRequestService } from './services/delete-request.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { ClientExportService } from './services/export.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { ReliefPeriodReminderService } from './services/relief-period-reminder.service';
import { ReliefPeriodService } from './services/relief-period.service';
import { ClientStatisticsService } from './services/statistics.service';
import { SuspensionReminderService } from './services/suspension-reminder.service';
import { SuspensionService } from './services/suspension.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientFieldDefinition,
      ClientCustomFieldValue,
      ClientIcon,
      ClientIconAssignment,
      ClientSuspension,
      ClientReliefPeriod,
      CustomFieldReminder,
      NotificationSettings,
      Company,
      User,
      ChangeLog,
      ClientDeleteRequest,
      Task,
      TimeEntry,
    ]),
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
    ReliefPeriodsController,
    // Sub-controllers with specific path prefixes (bulk/, statistics/, etc.)
    ClientBulkController,
    ClientStatisticsController,
    ClientExportController,
    ClientChangelogController,
    ClientCustomFieldsController,
    // Main CRUD controller last (has /:id catch-all routes)
    ClientsController,
  ],
  providers: [
    ClientsService,
    ClientBulkService,
    ClientPkdService,
    CustomFieldsService,
    ClientIconsService,
    ClientChangelogService,
    ClientChangelogEmailService,
    NotificationSettingsService,
    ConditionEvaluatorService,
    AutoAssignService,
    DeleteRequestService,
    DuplicateDetectionService,
    ClientStatisticsService,
    ClientExportService,
    SuspensionService,
    SuspensionReminderService,
    ReliefPeriodService,
    ReliefPeriodReminderService,
    CustomFieldReminderService,
  ],
  exports: [
    ClientsService,
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
    ReliefPeriodService,
  ],
})
export class ClientsModule {}
