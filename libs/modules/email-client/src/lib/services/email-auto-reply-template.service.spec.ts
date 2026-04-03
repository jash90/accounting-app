import { SystemCompanyService } from '@accounting/common/backend';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { EmailAutoReplyTemplate, UserRole, type User } from '@accounting/common';

import { EmailAutoReplyTemplateService } from './email-auto-reply-template.service';

describe('EmailAutoReplyTemplateService', () => {
  let service: EmailAutoReplyTemplateService;
  let templateRepository: jest.Mocked<Repository<EmailAutoReplyTemplate>>;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;

  const mockTemplate: EmailAutoReplyTemplate = {
    id: 'template-1',
    companyId,
    name: 'VAT Template',
    description: 'Auto-reply for VAT questions',
    category: 'VAT',
    isActive: true,
    triggerKeywords: ['vat', 'faktura'],
    keywordMatchMode: 'any',
    matchSubjectOnly: false,
    bodyTemplate: 'Thank you for your question about VAT.',
    tone: 'neutral',
    customInstructions: null,
    createdById: 'user-1',
    matchCount: 0,
    lastMatchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmailAutoReplyTemplate;

  beforeEach(async () => {
    jest.clearAllMocks();

    templateRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<EmailAutoReplyTemplate>>;

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailAutoReplyTemplateService,
          useFactory: () =>
            new EmailAutoReplyTemplateService(
              templateRepository as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(EmailAutoReplyTemplate), useValue: templateRepository },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(EmailAutoReplyTemplateService);
  });

  describe('findAll', () => {
    it('should return all templates for company sorted by createdAt DESC', async () => {
      templateRepository.find.mockResolvedValue([mockTemplate]);

      const result = await service.findAll(mockUser);

      expect(result).toEqual([mockTemplate]);
      expect(systemCompanyService.getCompanyIdForUser).toHaveBeenCalledWith(mockUser);
      expect(templateRepository.find).toHaveBeenCalledWith({
        where: { companyId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return template by id with tenant isolation', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findOne('template-1', mockUser);

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1', companyId },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create template with defaults', async () => {
      const createDto = {
        name: 'New Template',
        triggerKeywords: ['zus'],
        bodyTemplate: 'Reply about ZUS',
      };
      templateRepository.create.mockReturnValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);

      const result = await service.create(createDto as any, mockUser);

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          createdById: 'user-1',
          keywordMatchMode: 'any',
          matchSubjectOnly: false,
          tone: 'neutral',
          isActive: true,
        })
      );
    });

    it('should respect provided options over defaults', async () => {
      const createDto = {
        name: 'Custom',
        triggerKeywords: ['pit'],
        bodyTemplate: 'PIT reply',
        keywordMatchMode: 'all' as const,
        matchSubjectOnly: true,
        tone: 'formal' as const,
        isActive: false,
      };
      templateRepository.create.mockReturnValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);

      await service.create(createDto as any, mockUser);

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          keywordMatchMode: 'all',
          matchSubjectOnly: true,
          tone: 'formal',
          isActive: false,
        })
      );
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      templateRepository.findOne.mockResolvedValue({ ...mockTemplate });
      templateRepository.save.mockResolvedValue({
        ...mockTemplate,
        name: 'Updated',
      } as EmailAutoReplyTemplate);

      const result = await service.update('template-1', { name: 'Updated' } as any, mockUser);

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete template', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate);
      templateRepository.remove.mockResolvedValue(mockTemplate);

      await service.remove('template-1', mockUser);

      expect(templateRepository.remove).toHaveBeenCalledWith(mockTemplate);
    });
  });

  describe('findActiveByCompanyId', () => {
    it('should return only active templates for company', async () => {
      templateRepository.find.mockResolvedValue([mockTemplate]);

      const result = await service.findActiveByCompanyId(companyId);

      expect(result).toEqual([mockTemplate]);
      expect(templateRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
      });
    });
  });

  describe('incrementMatchCount', () => {
    it('should increment match count and set lastMatchedAt', async () => {
      templateRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.incrementMatchCount('template-1');

      expect(templateRepository.update).toHaveBeenCalledWith('template-1', {
        matchCount: expect.any(Function),
        lastMatchedAt: expect.any(Date),
      });
    });
  });

  describe('matchesEmail', () => {
    it('should match when any keyword is found (mode=any)', () => {
      const template = {
        ...mockTemplate,
        keywordMatchMode: 'any' as const,
        triggerKeywords: ['vat', 'faktura'],
      };

      expect(
        service.matchesEmail(template as EmailAutoReplyTemplate, 'Pytanie o VAT', 'Treść')
      ).toBe(true);
    });

    it('should not match when no keywords found', () => {
      const template = {
        ...mockTemplate,
        keywordMatchMode: 'any' as const,
        triggerKeywords: ['zus'],
      };

      expect(
        service.matchesEmail(
          template as EmailAutoReplyTemplate,
          'Pytanie o VAT',
          'Treść o fakturze'
        )
      ).toBe(false);
    });

    it('should require all keywords when mode=all', () => {
      const template = {
        ...mockTemplate,
        keywordMatchMode: 'all' as const,
        triggerKeywords: ['vat', 'faktura'],
      };

      expect(service.matchesEmail(template as EmailAutoReplyTemplate, 'VAT', 'Treść')).toBe(false);
      expect(service.matchesEmail(template as EmailAutoReplyTemplate, 'VAT faktura', 'Treść')).toBe(
        true
      );
    });

    it('should only search subject when matchSubjectOnly=true', () => {
      const template = {
        ...mockTemplate,
        keywordMatchMode: 'any' as const,
        triggerKeywords: ['faktura'],
        matchSubjectOnly: true,
      };

      expect(
        service.matchesEmail(template as EmailAutoReplyTemplate, 'Pytanie', 'faktura w treści')
      ).toBe(false);
      expect(
        service.matchesEmail(template as EmailAutoReplyTemplate, 'Pytanie o faktura', '')
      ).toBe(true);
    });

    it('should be case-insensitive', () => {
      const template = {
        ...mockTemplate,
        keywordMatchMode: 'any' as const,
        triggerKeywords: ['vat'],
      };

      expect(service.matchesEmail(template as EmailAutoReplyTemplate, 'PYTANIE O VAT', '')).toBe(
        true
      );
    });
  });
});
