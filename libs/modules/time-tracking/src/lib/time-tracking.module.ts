import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Client, Company, Task, TimeEntry, TimeSettings, User } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeReportsController } from './controllers/time-reports.controller';
import { TimeSettingsController } from './controllers/time-settings.controller';
import { TimeCalculationService } from './services/time-calculation.service';
import { TimeEntriesService } from './services/time-entries.service';
import { TimeSettingsService } from './services/time-settings.service';
import { TimesheetService } from './services/timesheet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntry, TimeSettings, Company, User, Client, Task]),
    CommonModule,
    RBACModule,
  ],
  controllers: [
    // Order matters: specific routes before generic /:id routes
    TimeReportsController,
    TimeSettingsController,
    TimeEntriesController,
  ],
  providers: [TimeEntriesService, TimeSettingsService, TimeCalculationService, TimesheetService],
  exports: [TimeEntriesService, TimeSettingsService, TimeCalculationService, TimesheetService],
})
export class TimeTrackingModule {}
