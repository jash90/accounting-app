import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  ContentBlockType,
  DocumentTemplate,
  UserRole,
  type ContentBlock,
  type User,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { DocumentTemplatesService } from './document-templates.service';

describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;
  let _templateRepository: jest.Mocked<Repository<DocumentTemplate>>;

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
    name: 'Umowa o pracę',
    companyId: mockCompanyId,
    createdById: mockUserId,
    category: 'contract',
    documentSourceType: 'blocks',
    contentBlocks: [
      {
        id: 'p1',
        type: ContentBlockType.PARAGRAPH,
        order: 0,
        content: [{ text: 'Paragraf 1' }],
      } as ContentBlock,
    ],
    placeholders: ['imie', 'nazwisko'],
    createdAt: new Date('2024-05-01'),
  };

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  const mockTemplateRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DocumentTemplatesService,
          useFactory: () =>
            new DocumentTemplatesService(mockTemplateRepo as any, mockTenantService as any),
        },
        { provide: getRepositoryToken(DocumentTemplate), useValue: mockTemplateRepo },
        { provide: TenantService, useValue: mockTenantService },
      ],
    }).compile();

    service = module.get<DocumentTemplatesService>(DocumentTemplatesService);
    _templateRepository = module.get(getRepositoryToken(DocumentTemplate));
  });

  /* ---- findAll ---- */

  describe('findAll', () => {
    it('should return all templates for the tenant ordered by createdAt DESC', async () => {
      mockTemplateRepo.find.mockResolvedValue([mockTemplate]);

      const result = await service.findAll(mockUser as User);

      expect(result).toEqual([mockTemplate]);
      expect(mockTemplateRepo.find).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  /* ---- findOne ---- */

  describe('findOne', () => {
    it('should return a template by id within the tenant', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findOne('template-1', mockUser as User);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1', companyId: mockCompanyId },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  /* ---- create ---- */

  describe('create', () => {
    it('should create a template with companyId and default category', async () => {
      const dto = { name: 'Nowy szablon', documentSourceType: 'text' as const };
      const created = { ...mockTemplate, ...dto, category: 'other' };
      mockTemplateRepo.create.mockReturnValue(created);
      mockTemplateRepo.save.mockResolvedValue(created);

      const result = await service.create(dto as any, mockUser as User);

      expect(result).toEqual(created);
      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nowy szablon',
          companyId: mockCompanyId,
          createdById: mockUserId,
          category: 'other',
        })
      );
    });

    it('should use provided category when specified', async () => {
      const dto = { name: 'Szablon', category: 'invoice' };
      const created = { ...mockTemplate, ...dto };
      mockTemplateRepo.create.mockReturnValue(created);
      mockTemplateRepo.save.mockResolvedValue(created);

      await service.create(dto as any, mockUser as User);

      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'invoice' })
      );
    });
  });

  /* ---- update ---- */

  describe('update', () => {
    it('should update an existing template', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({ ...mockTemplate });
      const updated = { ...mockTemplate, name: 'Zaktualizowany' };
      mockTemplateRepo.save.mockResolvedValue(updated);

      const result = await service.update(
        'template-1',
        { name: 'Zaktualizowany' } as any,
        mockUser as User
      );

      expect(result.name).toBe('Zaktualizowany');
      expect(mockTemplateRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' } as any, mockUser as User)
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ---- remove ---- */

  describe('remove', () => {
    it('should remove an existing template', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(mockTemplate);

      await service.remove('template-1', mockUser as User);

      expect(mockTemplateRepo.remove).toHaveBeenCalledWith(mockTemplate);
    });

    it('should throw NotFoundException when removing non-existent template', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent', mockUser as User)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  /* ---- getContentBlocks ---- */

  describe('getContentBlocks', () => {
    it('should return content blocks and metadata for a template', async () => {
      mockTemplateRepo.findOne.mockResolvedValue(mockTemplate);

      const result = await service.getContentBlocks('template-1', mockUser as User);

      expect(result).toEqual({
        contentBlocks: mockTemplate.contentBlocks,
        documentSourceType: mockTemplate.documentSourceType,
        name: mockTemplate.name,
        placeholders: mockTemplate.placeholders,
      });
    });
  });

  /* ---- updateContentBlocks ---- */

  describe('updateContentBlocks', () => {
    it('should update content blocks on a template', async () => {
      const existing = { ...mockTemplate };
      mockTemplateRepo.findOne.mockResolvedValue(existing);
      const newBlocks = [
        {
          id: 'h1',
          type: ContentBlockType.HEADING,
          order: 0,
          level: 1,
          content: [{ text: 'New' }],
        },
      ] as ContentBlock[];
      mockTemplateRepo.save.mockResolvedValue({ ...existing, contentBlocks: newBlocks });

      const result = await service.updateContentBlocks(
        'template-1',
        { contentBlocks: newBlocks } as any,
        mockUser as User
      );

      expect(result.contentBlocks).toEqual(newBlocks);
    });

    it('should update documentSourceType when provided', async () => {
      const existing = { ...mockTemplate };
      mockTemplateRepo.findOne.mockResolvedValue(existing);
      mockTemplateRepo.save.mockImplementation(async (entity) => entity as any);

      await service.updateContentBlocks(
        'template-1',
        { documentSourceType: 'text' } as any,
        mockUser as User
      );

      expect(mockTemplateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ documentSourceType: 'text' })
      );
    });
  });
});
