import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentTemplate, GeneratedDocument } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { RBACModule } from '@accounting/rbac';

import { DocumentTemplatesController } from './controllers/document-templates.controller';
import { GeneratedDocumentsController } from './controllers/generated-documents.controller';
import { DocumentTemplatesService } from './services/document-templates.service';
import { GeneratedDocumentsService } from './services/generated-documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTemplate, GeneratedDocument]),
    CommonModule,
    RBACModule,
  ],
  controllers: [DocumentTemplatesController, GeneratedDocumentsController],
  providers: [DocumentTemplatesService, GeneratedDocumentsService],
  exports: [DocumentTemplatesService, GeneratedDocumentsService],
})
export class DocumentsModule {}
