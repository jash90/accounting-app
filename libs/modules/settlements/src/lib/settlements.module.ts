import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  Company,
  EmailConfiguration,
  MonthlySettlement,
  SettlementComment,
  SettlementSettings,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { RBACModule } from '@accounting/rbac';

import { SettlementsController } from './controllers/settlements.controller';
import { SettlementCommentsService } from './services/settlement-comments.service';
import { SettlementExportService } from './services/settlement-export.service';
import { SettlementExtendedStatsService } from './services/settlement-extended-stats.service';
import { SettlementSettingsService } from './services/settlement-settings.service';
import { SettlementStatsService } from './services/settlement-stats.service';
import { SettlementsService } from './services/settlements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonthlySettlement,
      SettlementComment,
      SettlementSettings,
      Client,
      User,
      Company,
      EmailConfiguration,
    ]),
    CommonModule,
    EmailModule,
    RBACModule,
  ],
  controllers: [SettlementsController],
  providers: [
    SettlementsService,
    SettlementExportService,
    SettlementStatsService,
    SettlementCommentsService,
    SettlementSettingsService,
    SettlementExtendedStatsService,
  ],
  exports: [
    SettlementsService,
    SettlementStatsService,
    SettlementCommentsService,
    SettlementSettingsService,
    SettlementExtendedStatsService,
  ],
})
export class SettlementsModule {}
