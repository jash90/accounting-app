// Module
export * from './lib/email.module';

// Controllers
export * from './lib/controllers/email-configuration.controller';

// Services
export * from './lib/services/email-sender.service';
export * from './lib/services/email-reader.service';
export * from './lib/services/email-configuration.service';

// Interfaces
export * from './lib/interfaces/email-config.interface';
export * from './lib/interfaces/email-message.interface';

// DTOs
export * from './lib/dto/send-email.dto';
export * from './lib/dto/fetch-emails.dto';
export * from './lib/dto/create-email-config.dto';
export * from './lib/dto/update-email-config.dto';
export * from './lib/dto/email-config-response.dto';

// Utils
export * from './lib/utils/email-config.helper';
