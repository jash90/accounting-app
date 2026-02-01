import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ChangeLog,
  Client,
  Company,
  User,
  ZusClientSettings,
  ZusContribution,
  ZusRate,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import {
  ZusContributionsController,
  ZusDashboardController,
  ZusSettingsController,
} from './controllers';
import {
  ZusCalculationService,
  ZusContributionsService,
  ZusRatesService,
  ZusSettingsService,
  ZusStatisticsService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZusContribution,
      ZusClientSettings,
      ZusRate,
      Client,
      Company,
      User,
      ChangeLog,
    ]),
    CommonModule,
    RBACModule,
  ],
  controllers: [
    // Dashboard routes should be before generic routes
    ZusDashboardController,
    ZusSettingsController,
    ZusContributionsController,
  ],
  providers: [
    ZusRatesService,
    ZusCalculationService,
    ZusSettingsService,
    ZusContributionsService,
    ZusStatisticsService,
  ],
  exports: [
    ZusRatesService,
    ZusCalculationService,
    ZusSettingsService,
    ZusContributionsService,
    ZusStatisticsService,
  ],
})
export class ZusModule {}
