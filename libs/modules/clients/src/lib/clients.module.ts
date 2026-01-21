import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  ClientFieldDefinition,
  ClientCustomFieldValue,
  ClientIcon,
  ClientIconAssignment,
  NotificationSettings,
  Company,
  User,
  ChangeLog,
  ClientDeleteRequest,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { RBACModule } from '@accounting/rbac';

import { ClientsController } from './controllers/clients.controller';
import { DeleteRequestsController } from './controllers/delete-requests.controller';
import { FieldDefinitionsController } from './controllers/field-definitions.controller';
import { IconsController } from './controllers/icons.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { AutoAssignService } from './services/auto-assign.service';
import { ClientChangelogService } from './services/client-changelog.service';
import { ClientIconsService } from './services/client-icons.service';
import { ClientsService } from './services/clients.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { DeleteRequestService } from './services/delete-request.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { ClientExportService } from './services/export.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { ClientStatisticsService } from './services/statistics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientFieldDefinition,
      ClientCustomFieldValue,
      ClientIcon,
      ClientIconAssignment,
      NotificationSettings,
      Company,
      User,
      ChangeLog,
      ClientDeleteRequest,
    ]),
    CommonModule,
    RBACModule,
    StorageModule,
    EmailModule,
  ],
  controllers: [
    // More specific routes must be registered before generic /:id routes
    FieldDefinitionsController,
    IconsController,
    NotificationSettingsController,
    DeleteRequestsController,
    ClientsController,
  ],
  providers: [
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
  ],
})
export class ClientsModule {}
