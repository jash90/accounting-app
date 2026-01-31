import { Module } from '@nestjs/common';
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
    LeadsService,
    OfferTemplatesService,
    OffersService,
    OfferNumberingService,
    OfferActivityService,
    OfferEmailService,
    DocxGenerationService,
  ],
  exports: [
    LeadsService,
    OfferTemplatesService,
    OffersService,
    OfferNumberingService,
    OfferActivityService,
    DocxGenerationService,
  ],
})
export class OffersModule {}
