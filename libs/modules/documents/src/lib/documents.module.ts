import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentTemplate, GeneratedDocument } from '@accounting/common';
import { CommonModule } from '@accounting/common/backend';
import { AIAgentModule } from '@accounting/modules/ai-agent';
import { RBACModule } from '@accounting/rbac';

import { DocumentTemplatesController } from './controllers/document-templates.controller';
import { GeneratedDocumentsController } from './controllers/generated-documents.controller';
import { DocumentAiService } from './services/document-ai.service';
import { DocumentPdfService } from './services/document-pdf.service';
import { DocumentTemplatesService } from './services/document-templates.service';
import { GeneratedDocumentsService } from './services/generated-documents.service';
import { TiptapDocxService } from './services/tiptap-docx.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentTemplate, GeneratedDocument]),
    CommonModule,
    RBACModule,
    AIAgentModule,
  ],
  controllers: [DocumentTemplatesController, GeneratedDocumentsController],
  providers: [
    DocumentTemplatesService,
    GeneratedDocumentsService,
    DocumentPdfService,
    TiptapDocxService,
    DocumentAiService,
  ],
  exports: [
    DocumentTemplatesService,
    GeneratedDocumentsService,
    DocumentPdfService,
    TiptapDocxService,
    DocumentAiService,
  ],
})
export class DocumentsModule {}
