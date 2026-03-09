import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { AIContext, type User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { type OpenAIProviderService } from './openai-provider.service';
import { RAGService } from './rag.service';

describe('RAGService', () => {
  let service: RAGService;
  let contextRepo: jest.Mocked<Repository<AIContext>>;
  let openaiProvider: jest.Mocked<Pick<OpenAIProviderService, 'generateEmbedding'>>;
  let systemCompanyService: jest.Mocked<
    Pick<SystemCompanyService, 'getCompanyIdForUser' | 'getSystemCompanyId'>
  >;

  const companyId = 'company-1';
  const systemCompanyId = 'system-company-1';
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;

  const mockContext: AIContext = {
    id: 'ctx-1',
    companyId,
    filename: 'test.pdf',
    mimeType: 'application/pdf',
    filePath: '/uploads/test.pdf',
    fileSize: 1024,
    extractedText: 'Some extracted text about accounting rules',
    embedding: [0.1, 0.2, 0.3],
    uploadedById: mockUser.id,
    isActive: true,
  } as unknown as AIContext;

  function createMockQueryBuilder() {
    const qb: any = {};
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.limit = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue([]);
    return qb;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    contextRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as unknown as jest.Mocked<Repository<AIContext>>;

    openaiProvider = {
      generateEmbedding: jest.fn(),
    };

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
      getSystemCompanyId: jest.fn().mockResolvedValue(systemCompanyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: RAGService,
          useFactory: () =>
            new RAGService(contextRepo as any, openaiProvider as any, systemCompanyService as any),
        },
        { provide: getRepositoryToken(AIContext), useValue: contextRepo },
      ],
    }).compile();

    service = module.get(RAGService);
  });

  describe('findAllContexts', () => {
    it('should return all contexts for user company', async () => {
      const contexts = [mockContext];
      contextRepo.find.mockResolvedValue(contexts);

      const result = await service.findAllContexts(mockUser);

      expect(result).toEqual(contexts);
      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(contextRepo.find).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['uploadedBy', 'company'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findContext', () => {
    it('should return a context by id scoped to company', async () => {
      contextRepo.findOne.mockResolvedValue(mockContext);

      const result = await service.findContext('ctx-1', mockUser);

      expect(result).toEqual(mockContext);
      expect(contextRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ctx-1', companyId },
        relations: ['uploadedBy', 'company'],
      });
    });

    it('should throw NotFoundException if context not found', async () => {
      contextRepo.findOne.mockResolvedValue(null);

      await expect(service.findContext('nonexistent', mockUser)).rejects.toThrow(
        'Context file not found'
      );
    });
  });

  describe('removeContext', () => {
    it('should throw NotFoundException if context not found', async () => {
      contextRepo.findOne.mockResolvedValue(null);

      await expect(service.removeContext('nonexistent', mockUser)).rejects.toThrow(
        'Context file not found'
      );
    });
  });

  describe('extractAndEmbedFile', () => {
    it('should create context entity with embedding and save it', async () => {
      // Spy on extractText to avoid fs dependency
      const extractSpy = jest.spyOn(service, 'extractText').mockResolvedValue('extracted content');
      openaiProvider.generateEmbedding.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        totalTokens: 10,
      } as any);
      const savedContext = { ...mockContext, extractedText: 'extracted content' } as AIContext;
      contextRepo.create.mockReturnValue(savedContext);
      contextRepo.save.mockResolvedValue(savedContext);

      const result = await service.extractAndEmbedFile(
        '/path/to/file.txt',
        'file.txt',
        'text/plain',
        1024,
        companyId,
        mockUser,
        'sk-api-key',
        'text-embedding-ada-002'
      );

      expect(extractSpy).toHaveBeenCalledWith('/path/to/file.txt', 'text/plain');
      expect(openaiProvider.generateEmbedding).toHaveBeenCalledWith(
        'extracted content',
        'sk-api-key',
        'text-embedding-ada-002'
      );
      expect(contextRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          filename: 'file.txt',
          extractedText: 'extracted content',
          embedding: [0.1, 0.2, 0.3],
          uploadedById: mockUser.id,
          isActive: true,
        })
      );
      expect(result).toEqual(savedContext);

      extractSpy.mockRestore();
    });
  });

  describe('hasActiveDocuments', () => {
    it('should return true when company has active documents', async () => {
      contextRepo.count.mockResolvedValue(1);

      const result = await service.hasActiveDocuments(companyId);

      expect(result).toBe(true);
    });

    it('should check both company and system company documents', async () => {
      contextRepo.count.mockResolvedValue(0);

      await service.hasActiveDocuments(companyId);

      expect(contextRepo.count).toHaveBeenCalledWith({
        where: [
          { companyId, isActive: true },
          { companyId: systemCompanyId, isActive: true },
        ],
      });
    });

    it('should return false for null companyId when system company also not found', async () => {
      systemCompanyService.getSystemCompanyId.mockRejectedValue(new Error('Not found'));

      const result = await service.hasActiveDocuments(null);

      expect(result).toBe(false);
    });

    it('should continue gracefully if system company lookup fails', async () => {
      systemCompanyService.getSystemCompanyId.mockRejectedValue(new Error('Not found'));
      contextRepo.count.mockResolvedValue(2);

      const result = await service.hasActiveDocuments(companyId);

      expect(result).toBe(true);
    });
  });

  describe('searchContextByKeywords', () => {
    it('should search using extracted keywords with ILIKE', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([mockContext]);
      contextRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchContextByKeywords(
        'What are accounting rules for taxes?',
        companyId,
        3
      );

      expect(result).toEqual([mockContext]);
      expect(qb.where).toHaveBeenCalledWith(
        'context.companyId IN (:...companyIds)',
        expect.objectContaining({ companyIds: expect.arrayContaining([companyId]) })
      );
    });

    it('should fall back to recent documents when no keywords extracted', async () => {
      const recentDocs = [mockContext];
      contextRepo.find.mockResolvedValue(recentDocs);

      // Query with only stop words
      const result = await service.searchContextByKeywords('the is a an', companyId, 3);

      expect(result).toEqual(recentDocs);
      expect(contextRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
          take: 3,
        })
      );
    });

    it('should fall back to recent documents when no keyword matches found', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      contextRepo.createQueryBuilder.mockReturnValue(qb);
      contextRepo.find.mockResolvedValue([mockContext]);

      const result = await service.searchContextByKeywords('specific search query', companyId, 3);

      expect(result).toEqual([mockContext]);
    });

    it('should return empty when no companies to search', async () => {
      systemCompanyService.getSystemCompanyId.mockRejectedValue(new Error('Not found'));

      const result = await service.searchContextByKeywords('query', null, 3);

      expect(result).toEqual([]);
    });

    it('should include system company in search scope', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([mockContext]);
      contextRepo.createQueryBuilder.mockReturnValue(qb);

      await service.searchContextByKeywords('accounting rules', companyId, 3);

      expect(qb.where).toHaveBeenCalledWith('context.companyId IN (:...companyIds)', {
        companyIds: [companyId, systemCompanyId],
      });
    });
  });

  describe('buildRAGContext', () => {
    it('should build formatted context from documents', () => {
      const contexts = [
        { filename: 'doc1.pdf', extractedText: 'Text 1' },
        { filename: 'doc2.pdf', extractedText: 'Text 2' },
      ] as AIContext[];

      const result = service.buildRAGContext(contexts);

      expect(result).toContain('Context Document 1: doc1.pdf');
      expect(result).toContain('Text 1');
      expect(result).toContain('Context Document 2: doc2.pdf');
      expect(result).toContain('Text 2');
    });

    it('should return empty string for empty contexts', () => {
      const result = service.buildRAGContext([]);

      expect(result).toBe('');
    });
  });
});
