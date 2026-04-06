import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  Company,
  MonthlySettlement,
  Task,
  TimeEntry,
  TimeSettings,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeReportsController } from './controllers/time-reports.controller';
import { TimeSettingsController } from './controllers/time-settings.controller';
import { TimeCalculationService } from './services/time-calculation.service';
import { TimeEntriesService } from './services/time-entries.service';
import { TimeEntryApprovalService } from './services/time-entry-approval.service';
import { TimeEntryLockingService } from './services/time-entry-locking.service';
import { TimeEntryOverlapService } from './services/time-entry-overlap.service';
import { TimeSettingsService } from './services/time-settings.service';
import { TimeTrackingExportService } from './services/time-tracking-export.service';
import { TimeTrackingExtendedStatsService } from './services/time-tracking-extended-stats.service';
import { TimeTrackingPdfService } from './services/time-tracking-pdf.service';
import { TimerService } from './services/timer.service';
import { TimesheetService } from './services/timesheet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeEntry,
      TimeSettings,
      Company,
      User,
      Client,
      Task,
      MonthlySettlement,
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
    TimerService,
    TimeEntryApprovalService,
    TimeEntryLockingService,
    TimeEntryOverlapService,
    TimeSettingsService,
    TimeCalculationService,
    TimesheetService,
    TimeTrackingExtendedStatsService,
    TimeTrackingPdfService,
    TimeTrackingExportService,
  ],
  exports: [
    TimeEntriesService,
    TimerService,
    TimeEntryApprovalService,
    TimeEntryLockingService,
    TimeEntryOverlapService,
    TimeSettingsService,
    TimeCalculationService,
    TimesheetService,
    TimeTrackingExtendedStatsService,
    TimeTrackingPdfService,
    TimeTrackingExportService,
  ],
})
export class TimeTrackingModule {}
