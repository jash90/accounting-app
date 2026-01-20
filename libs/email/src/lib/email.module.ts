import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSenderService } from './services/email-sender.service';
import { EmailReaderService } from './services/email-reader.service';
import { EmailConfigurationService } from './services/email-configuration.service';
import { EmailAutodiscoveryService } from './services/email-autodiscovery.service';
import { DiscoveryCacheService } from './services/discovery-cache.service';
import { ProviderLookupService } from './services/provider-lookup.service';
import { DnsDiscoveryService } from './services/dns-discovery.service';
import { EmailConfigurationController } from './controllers/email-configuration.controller';
import { EmailConfiguration, Company } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { AuthModule } from '@accounting/auth';
import { RBACModule } from '@accounting/rbac';

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
    // Autodiscovery supporting services
    DiscoveryCacheService,
    ProviderLookupService,
    DnsDiscoveryService,
  ],
  exports: [
    EmailSenderService,
    EmailReaderService,
    EmailConfigurationService,
    EmailAutodiscoveryService,
  ],
})
export class EmailModule {}
