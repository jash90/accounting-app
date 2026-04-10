import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';
import {
  KsefConfiguration,
  KsefSession,
  KsefInvoice,
  KsefAuditLog,
  Company,
  Client,
  User,
} from '@accounting/common';

import {
  KsefAuditLogService,
  KsefHttpClientService,
  KsefConfigService,
  KsefCryptoService,
  KsefAuthService,
  KsefXmlService,
  KsefSessionService,
  KsefInvoiceService,
  KsefDownloadService,
  KsefStatsService,
  KsefSchedulerService,
} from './services';

import {
  KsefConfigController,
  KsefInvoiceController,
  KsefSessionController,
  KsefDownloadController,
  KsefAuditController,
  KsefStatsController,
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KsefConfiguration,
      KsefSession,
      KsefInvoice,
      KsefAuditLog,
      Company,
      Client,
      User,
    ]),
    CommonModule,
    RBACModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [
    KsefConfigController,
    KsefInvoiceController,
    KsefSessionController,
    KsefDownloadController,
    KsefAuditController,
    KsefStatsController,
  ],
  providers: [
    KsefAuditLogService,
    KsefHttpClientService,
    KsefConfigService,
    KsefCryptoService,
    KsefAuthService,
    KsefXmlService,
    KsefSessionService,
    KsefInvoiceService,
    KsefDownloadService,
    KsefStatsService,
    KsefSchedulerService,
  ],
  exports: [
    KsefConfigService,
    KsefXmlService,
    KsefAuthService,
    KsefSessionService,
    KsefInvoiceService,
  ],
})
export class KsefModule {}
