import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TimeEntry,
  TimeSettings,
  Company,
  User,
  Client,
  Task,
  CommonModule,
} from '@accounting/common';
import { RBACModule } from '@accounting/rbac';
import { TimeEntriesService } from './services/time-entries.service';
import { TimeSettingsService } from './services/time-settings.service';
import { TimeCalculationService } from './services/time-calculation.service';
import { TimesheetService } from './services/timesheet.service';
import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeSettingsController } from './controllers/time-settings.controller';
import { TimeReportsController } from './controllers/time-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeEntry,
      TimeSettings,
      Company,
      User,
      Client,
      Task,
    ]),
    CommonModule,
    RBACModule,
  ],
  controllers: [
    // Order matters: specific routes before generic /:id routes
    TimeReportsController,
    TimeSettingsController,
    TimeEntriesController,
  ],
  providers: [
    TimeEntriesService,
    TimeSettingsService,
    TimeCalculationService,
    TimesheetService,
  ],
  exports: [
    TimeEntriesService,
    TimeSettingsService,
    TimeCalculationService,
    TimesheetService,
  ],
})
export class TimeTrackingModule {}
