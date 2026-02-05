import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Client, Company, MonthlySettlement, SettlementComment, User } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { SettlementsController } from './controllers/settlements.controller';
import { SettlementCommentsService } from './services/settlement-comments.service';
import { SettlementStatsService } from './services/settlement-stats.service';
import { SettlementsService } from './services/settlements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonthlySettlement, SettlementComment, Client, User, Company]),
    CommonModule,
    RBACModule,
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService, SettlementStatsService, SettlementCommentsService],
  exports: [SettlementsService, SettlementStatsService, SettlementCommentsService],
})
export class SettlementsModule {}
