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
import { RBACModule } from '@accounting/rbac';
import { StorageModule } from '@accounting/infrastructure/storage';
import { EmailModule } from '@accounting/email';
import { ClientsService } from './services/clients.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { ClientIconsService } from './services/client-icons.service';
import { ClientChangelogService } from './services/client-changelog.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { AutoAssignService } from './services/auto-assign.service';
import { DeleteRequestService } from './services/delete-request.service';
import { ClientsController } from './controllers/clients.controller';
import { FieldDefinitionsController } from './controllers/field-definitions.controller';
import { IconsController } from './controllers/icons.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { DeleteRequestsController } from './controllers/delete-requests.controller';

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
  ],
})
export class ClientsModule {}
