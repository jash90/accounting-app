import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@accounting/auth';
import { EmailConfiguration, Company } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { EmailConfigurationController } from './controllers/email-configuration.controller';
import { DiscoveryCacheService } from './services/discovery-cache.service';
import { DnsDiscoveryService } from './services/dns-discovery.service';
import { EmailAutodiscoveryService } from './services/email-autodiscovery.service';
import { EmailConfigurationService } from './services/email-configuration.service';
import { EmailReaderService } from './services/email-reader.service';
import { EmailSenderService } from './services/email-sender.service';
import { EmailVerificationService } from './services/email-verification.service';
import { ImapMailboxService } from './services/imap-mailbox.service';
import { ProviderLookupService } from './services/provider-lookup.service';


/**
 * Email Module providing SMTP and IMAP functionality
 *
 * Services:
 * - EmailSenderService: Send emails via SMTP
 * - EmailReaderService: Read emails via IMAP
 * - EmailConfigurationService: Manage email configurations
 * - EmailAutodiscoveryService: Auto-discover email server settings
 *
 * Supporting Services (internal):
 * - DiscoveryCacheService: Cache autodiscovery results
 * - ProviderLookupService: Lookup known email providers
 * - DnsDiscoveryService: DNS-based email server discovery
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [EmailModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailConfiguration, Company]),
    CommonModule,
    AuthModule,
    RBACModule,
  ],
  controllers: [EmailConfigurationController],
  providers: [
    // Core email services
    EmailSenderService,
    EmailReaderService,
    EmailConfigurationService,
    EmailAutodiscoveryService,
    // Supporting services
    DiscoveryCacheService,
    ProviderLookupService,
    DnsDiscoveryService,
    EmailVerificationService,
    ImapMailboxService,
  ],
  exports: [
    EmailSenderService,
    EmailReaderService,
    EmailConfigurationService,
    EmailAutodiscoveryService,
    EmailVerificationService,
    ImapMailboxService,
  ],
})
export class EmailModule {}
