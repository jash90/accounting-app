// Module
export * from './lib/email.module';

// Controllers
export * from './lib/controllers/email-configuration.controller';

// Services
export * from './lib/services/email-sender.service';
export * from './lib/services/email-reader.service';
export * from './lib/services/email-configuration.service';
export * from './lib/services/email-autodiscovery.service';
export * from './lib/services/email-verification.service';
export * from './lib/services/imap-mailbox.service';

// Interfaces
export * from './lib/interfaces/email-config.interface';
export * from './lib/interfaces/email-message.interface';
export * from './lib/interfaces/autodiscovery.interface';
export * from './lib/interfaces/email-config-result.interface';

// DTOs
export * from './lib/dto/send-email.dto';
export * from './lib/dto/fetch-emails.dto';
export * from './lib/dto/create-email-config.dto';
export * from './lib/dto/update-email-config.dto';
export * from './lib/dto/email-config-response.dto';
export * from './lib/dto/autodiscover.dto';

// Data
export * from './lib/data/known-providers';

// Utils
export * from './lib/utils/email-config.helper';
export * from './lib/utils/email-message.parser';
export * from './lib/utils/fetch-with-timeout';
export * from './lib/utils/autoconfig-xml.parser';
export * from './lib/utils/autodiscover-xml.parser';
export * from './lib/utils/imap-connection.factory';
export * from './lib/utils/imap-folder-discovery';
