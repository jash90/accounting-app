import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { type EmailAutoReplyTemplate, User, UserRole } from '@accounting/common';
import { type ReceivedEmail } from '@accounting/email';

import { type EmailAiService } from './email-ai.service';
import { EmailAutoReplyMatcherService } from './email-auto-reply-matcher.service';
import { type EmailAutoReplyTemplateService } from './email-auto-reply-template.service';

describe('EmailAutoReplyMatcherService', () => {
  let service: EmailAutoReplyMatcherService;
  let userRepository: jest.Mocked<Repository<User>>;
  let templateService: jest.Mocked<
    Pick<
      EmailAutoReplyTemplateService,
      'findActiveByCompanyId' | 'matchesEmail' | 'incrementMatchCount'
    >
  >;
  let aiService: jest.Mocked<Pick<EmailAiService, 'generateReplyDraft'>>;

  const companyId = 'company-1';
  const mockOwner = {
    id: 'owner-1',
    companyId,
    role: UserRole.COMPANY_OWNER,
    isActive: true,
  } as User;

  const mockTemplate: EmailAutoReplyTemplate = {
    id: 'template-1',
    companyId,
    name: 'VAT Auto-Reply',
    triggerKeywords: ['vat'],
    keywordMatchMode: 'any',
    matchSubjectOnly: false,
    bodyTemplate: 'Reply about VAT',
    tone: 'neutral',
    isActive: true,
    matchCount: 0,
  } as EmailAutoReplyTemplate;

  const mockMessage = {
    uid: 42,
    subject: 'Pytanie o VAT',
    from: [{ name: 'Jan', address: 'jan@test.com' }],
    to: [{ address: 'biuro@test.com' }],
    text: 'Chciałbym zapytać o VAT',
    date: new Date(),
  } as unknown as ReceivedEmail;

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    templateService = {
      findActiveByCompanyId: jest.fn(),
      matchesEmail: jest.fn(),
      incrementMatchCount: jest.fn(),
    };

    aiService = {
      generateReplyDraft: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: EmailAutoReplyMatcherService,
          useFactory: () =>
            new EmailAutoReplyMatcherService(
              userRepository as any,
              templateService as any,
              aiService as any
            ),
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    service = module.get(EmailAutoReplyMatcherService);
  });

  describe('handleNewEmail', () => {
    it('should generate AI reply draft for matched template', async () => {
      templateService.findActiveByCompanyId.mockResolvedValue([mockTemplate]);
      templateService.matchesEmail.mockReturnValue(true);
      userRepository.findOne.mockResolvedValue(mockOwner);
      aiService.generateReplyDraft.mockResolvedValue({} as any);
      templateService.incrementMatchCount.mockResolvedValue(undefined);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(aiService.generateReplyDraft).toHaveBeenCalledWith(
        mockOwner,
        mockMessage,
        expect.objectContaining({ tone: 'neutral', length: 'medium' })
      );
      expect(templateService.incrementMatchCount).toHaveBeenCalledWith('template-1');
    });

    it('should skip when no active templates exist', async () => {
      templateService.findActiveByCompanyId.mockResolvedValue([]);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(templateService.matchesEmail).not.toHaveBeenCalled();
      expect(aiService.generateReplyDraft).not.toHaveBeenCalled();
    });

    it('should skip when no templates match the email', async () => {
      templateService.findActiveByCompanyId.mockResolvedValue([mockTemplate]);
      templateService.matchesEmail.mockReturnValue(false);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(aiService.generateReplyDraft).not.toHaveBeenCalled();
    });

    it('should skip when no active company owner found', async () => {
      templateService.findActiveByCompanyId.mockResolvedValue([mockTemplate]);
      templateService.matchesEmail.mockReturnValue(true);
      userRepository.findOne.mockResolvedValue(null);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(aiService.generateReplyDraft).not.toHaveBeenCalled();
    });

    it('should continue processing other templates when one fails', async () => {
      const template2 = {
        ...mockTemplate,
        id: 'template-2',
        name: 'ZUS Auto-Reply',
      } as EmailAutoReplyTemplate;
      templateService.findActiveByCompanyId.mockResolvedValue([mockTemplate, template2]);
      templateService.matchesEmail.mockReturnValue(true);
      userRepository.findOne.mockResolvedValue(mockOwner);
      aiService.generateReplyDraft
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce({} as any);
      templateService.incrementMatchCount.mockResolvedValue(undefined);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(aiService.generateReplyDraft).toHaveBeenCalledTimes(2);
      expect(templateService.incrementMatchCount).toHaveBeenCalledTimes(1);
      expect(templateService.incrementMatchCount).toHaveBeenCalledWith('template-2');
    });

    it('should pass template custom instructions as AI options', async () => {
      const templateWithInstructions = {
        ...mockTemplate,
        tone: 'formal',
        customInstructions: 'Always mention our phone number',
      } as EmailAutoReplyTemplate;
      templateService.findActiveByCompanyId.mockResolvedValue([templateWithInstructions]);
      templateService.matchesEmail.mockReturnValue(true);
      userRepository.findOne.mockResolvedValue(mockOwner);
      aiService.generateReplyDraft.mockResolvedValue({} as any);
      templateService.incrementMatchCount.mockResolvedValue(undefined);

      await service.handleNewEmail({ companyId, message: mockMessage });

      expect(aiService.generateReplyDraft).toHaveBeenCalledWith(
        mockOwner,
        mockMessage,
        expect.objectContaining({
          tone: 'formal',
          customInstructions: 'Always mention our phone number',
        })
      );
    });
  });
});
