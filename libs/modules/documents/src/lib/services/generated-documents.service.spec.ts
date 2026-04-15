import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  ContentBlockType,
  DocumentTemplate,
  GeneratedDocument,
  UserRole,
  type ContentBlock,
  type User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { DocumentPdfService } from './document-pdf.service';
import { GeneratedDocumentsService } from './generated-documents.service';

describe('GeneratedDocumentsService', () => {
  let service: GeneratedDocumentsService;
  let _generatedDocRepository: jest.Mocked<Repository<GeneratedDocument>>;
  let _templateRepository: jest.Mocked<Repository<DocumentTemplate>>;
  let pdfService: jest.Mocked<DocumentPdfService>;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockTemplate: Partial<DocumentTemplate> = {
    id: 'template-1',
    name: 'Umowa',
    companyId: mockCompanyId,
    documentSourceType: 'blocks',
    contentBlocks: [
      {
        id: 'p1',
        type: ContentBlockType.PARAGRAPH,
        order: 0,
        content: [{ text: 'Witaj {{imie}}' }],
      } as ContentBlock,
    ],
    templateContent: null,
  };

  const mockTextTemplate: Partial<DocumentTemplate> = {
    id: 'template-2',
    name: 'Tekst',
    companyId: mockCompanyId,
    documentSourceType: 'text',
    contentBlocks: null,
    templateContent: 'Witaj {{imie}}, twój NIP to {{nip}}.',
  };

  const mockGeneratedDoc: Partial<GeneratedDocument> = {
    id: 'doc-1',
    name: 'Wygenerowana umowa',
    templateId: 'template-1',
    companyId: mockCompanyId,
    generatedById: mockUserId,
    metadata: {
      renderedContent: 'Witaj Jan',
      resolvedBlocks: [
        {
          id: 'p1',
          type: ContentBlockType.PARAGRAPH,
          order: 0,
          content: [{ text: 'Witaj Jan' }],
        },
      ],
    },
    createdAt: new Date('2024-06-01'),
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const mockPdfService = {
    generatePdfFromBlocks: jest.fn(),
    generatePdfFromText: jest.fn(),
  };

  const mockGeneratedDocRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTemplateRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: GeneratedDocumentsService,
          useFactory: () =>
            new GeneratedDocumentsService(
              mockGeneratedDocRepo as any,
              mockTemplateRepo as any,
              mockSystemCompanyService as any,
              mockPdfService as any
            ),
        },
        { provide: getRepositoryToken(GeneratedDocument), useValue: mockGeneratedDocRepo },
        { provide: getRepositoryToken(DocumentTemplate), useValue: mockTemplateRepo },
        { provide: SystemCompanyService, useValue: mockSystemCompanyService },
        { provide: DocumentPdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<GeneratedDocumentsService>(GeneratedDocumentsService);
    _generatedDocRepository = module.get(getRepositoryToken(GeneratedDocument));
    _templateRepository = module.get(getRepositoryToken(DocumentTemplate));
    pdfService = module.get(DocumentPdfService);
  });

  /* ---- findAll ---- */

  describe('findAll', () => {
    it('should return all generated documents for the tenant', async () => {
      mockGeneratedDocRepo.find.mockResolvedValue([mockGeneratedDoc]);

      const result = await service.findAll(mockUser as User);

      expect(result).toEqual([mockGeneratedDoc]);
      expect(mockGeneratedDocRepo.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        relations: ['template'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  /* ---- findOne ---- */

  describe('findOne', () => {
    it('should return a generated document by id', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(mockGeneratedDoc);

      const result = await service.findOne('doc-1', mockUser as User);

      expect(result).toEqual(mockGeneratedDoc);
      expect(mockGeneratedDocRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-1', companyId: mockCompanyId },
        relations: ['template'],
      });
    });

    it('should throw NotFoundException when document not found', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  /* ---- generate ---- */

  describe('generate', () => {
    it('should generate a document from block-based template with placeholder data', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(mockTemplate);
      const created = { ...mockGeneratedDoc };
      mockGeneratedDocRepo.create.mockReturnValue(created);
      mockGeneratedDocRepo.save.mockResolvedValue(created);

      const dto = {
        templateId: 'template-1',
        name: 'Wygenerowana umowa',
        placeholderData: { imie: 'Jan' },
      };
      const result = await service.generate(dto, mockUser as User);

      expect(result).toEqual(created);
      expect(mockTemplateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1', companyId: mockCompanyId },
      });
      expect(mockGeneratedDocRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wygenerowana umowa',
          templateId: 'template-1',
          generatedById: mockUserId,
          companyId: mockCompanyId,
        })
      );
    });

    it('should generate a document from text-based template', async () => {
      mockTemplateRepo.findOne.mockClear();
      mockGeneratedDocRepo.create.mockClear();
      mockGeneratedDocRepo.save.mockClear();
      mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);
      mockTemplateRepo.findOne.mockResolvedValue(mockTextTemplate);
      const created = { id: 'doc-2', name: 'Tekst doc' } as any;
      mockGeneratedDocRepo.create.mockReturnValue(created);
      mockGeneratedDocRepo.save.mockResolvedValue(created);

      const dto = {
        templateId: 'template-2',
        name: 'Tekst doc',
        placeholderData: { imie: 'Anna', nip: '1234567890' },
      };
      const result = await service.generate(dto, mockUser as User);

      expect(result).toEqual(created);
      expect(mockGeneratedDocRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tekst doc',
          templateId: 'template-2',
          generatedById: mockUserId,
          companyId: mockCompanyId,
          metadata: expect.objectContaining({
            imie: 'Anna',
            nip: '1234567890',
          }),
        })
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      const dto = { templateId: 'nonexistent', name: 'Doc' };
      await expect(service.generate(dto, mockUser as User)).rejects.toThrow(NotFoundException);
    });
  });

  /* ---- generatePdf ---- */

  describe('generatePdf', () => {
    it('should generate PDF from resolved blocks when available', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(mockGeneratedDoc);
      const pdfBuffer = Buffer.from('%PDF');
      mockPdfService.generatePdfFromBlocks.mockResolvedValue(pdfBuffer);

      const result = await service.generatePdf('doc-1', mockUser as User);

      expect(result.buffer).toBe(pdfBuffer);
      expect(result.filename).toContain('.pdf');
      expect(pdfService.generatePdfFromBlocks).toHaveBeenCalled();
      expect(pdfService.generatePdfFromText).not.toHaveBeenCalled();
    });

    it('should fall back to text-based PDF when no resolved blocks', async () => {
      const textDoc = {
        ...mockGeneratedDoc,
        metadata: { renderedContent: 'Plain text content' },
      };
      mockGeneratedDocRepo.findOne.mockResolvedValue(textDoc);
      const pdfBuffer = Buffer.from('%PDF');
      mockPdfService.generatePdfFromText.mockResolvedValue(pdfBuffer);

      const result = await service.generatePdf('doc-1', mockUser as User);

      expect(result.buffer).toBe(pdfBuffer);
      expect(pdfService.generatePdfFromText).toHaveBeenCalledWith(
        'Plain text content',
        mockGeneratedDoc.name
      );
    });
  });

  /* ---- getRenderedContent ---- */

  describe('getRenderedContent', () => {
    it('should return rendered content from metadata', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(mockGeneratedDoc);

      const result = await service.getRenderedContent('doc-1', mockUser as User);

      expect(result).toBe('Witaj Jan');
    });

    it('should throw NotFoundException when no rendered content available', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue({
        ...mockGeneratedDoc,
        metadata: null,
      });

      await expect(service.getRenderedContent('doc-1', mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  /* ---- remove ---- */

  describe('remove', () => {
    it('should remove a generated document', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(mockGeneratedDoc);

      await service.remove('doc-1', mockUser as User);

      expect(mockGeneratedDocRepo.remove).toHaveBeenCalledWith(mockGeneratedDoc);
    });

    it('should throw NotFoundException when trying to remove non-existent document', async () => {
      mockGeneratedDocRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent', mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
