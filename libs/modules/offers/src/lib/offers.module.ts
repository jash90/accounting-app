import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Client,
  Company,
  EmailConfiguration,
  Lead,
  Offer,
  OfferActivity,
  OfferTemplate,
  User,
} from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { EmailModule } from '@accounting/email';
import { StorageModule } from '@accounting/infrastructure/storage';
import { RBACModule } from '@accounting/rbac';

import { LeadsController } from './controllers/leads.controller';
import { OfferTemplatesController } from './controllers/offer-templates.controller';
import { OffersController } from './controllers/offers.controller';
import { OfferActivityListener } from './listeners/offer-activity.listener';
import { DocxBlockRendererService } from './services/docx-block-renderer.service';
import { DocxGenerationService } from './services/docx-generation.service';
import { LeadsService } from './services/leads.service';
import { OfferActivityService } from './services/offer-activity.service';
import { OfferEmailService } from './services/offer-email.service';
import { OfferNumberingService } from './services/offer-numbering.service';
import { OfferTemplatesService } from './services/offer-templates.service';
import { OffersService } from './services/offers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      OfferTemplate,
      Offer,
      OfferActivity,
      Client,
      Company,
      User,
      EmailConfiguration,
    ]),
    // EventEmitterModule is registered globally in app.module, but we import for type safety
    EventEmitterModule.forRoot(),
    CommonModule,
    RBACModule,
    StorageModule,
    EmailModule,
  ],
  controllers: [
    // More specific routes must be registered before generic routes
    LeadsController,
    OfferTemplatesController,
    OffersController,
  ],
  providers: [
    // SystemCompanyService is provided by CommonModule
    LeadsService,
    OfferTemplatesService,
    OffersService,
    OfferNumberingService,
    OfferActivityService,
    OfferEmailService,
    DocxGenerationService,
    DocxBlockRendererService,
    // Event listeners
    OfferActivityListener,
  ],
  exports: [
    LeadsService,
    OfferTemplatesService,
    OffersService,
    OfferNumberingService,
    OfferActivityService,
    DocxGenerationService,
    DocxBlockRendererService,
  ],
})
export class OffersModule {}
