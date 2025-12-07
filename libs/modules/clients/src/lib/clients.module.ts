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
} from '@accounting/common';
import { RBACModule } from '@accounting/rbac';
import { StorageModule } from '@accounting/infrastructure/storage';
import { ClientsService } from './services/clients.service';
import { CustomFieldsService } from './services/custom-fields.service';
import { ClientIconsService } from './services/client-icons.service';
import { ClientChangelogService } from './services/client-changelog.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { AutoAssignService } from './services/auto-assign.service';
import { ClientsController } from './controllers/clients.controller';
import { FieldDefinitionsController } from './controllers/field-definitions.controller';
import { IconsController } from './controllers/icons.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';

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
    ]),
    RBACModule,
    StorageModule,
  ],
  controllers: [
    // More specific routes must be registered before generic /:id routes
    FieldDefinitionsController,
    IconsController,
    NotificationSettingsController,
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
  ],
  exports: [
    ClientsService,
    CustomFieldsService,
    ClientIconsService,
    ClientChangelogService,
    NotificationSettingsService,
    ConditionEvaluatorService,
    AutoAssignService,
  ],
})
export class ClientsModule {}
