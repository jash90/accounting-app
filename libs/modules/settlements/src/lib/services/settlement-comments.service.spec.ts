import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { MonthlySettlement, SettlementComment, UserRole, type User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { type CreateCommentDto } from '../dto';
import { SettlementAccessDeniedException, SettlementNotFoundException } from '../exceptions';
import { SettlementCommentsService } from './settlement-comments.service';

describe('SettlementCommentsService', () => {
  let service: SettlementCommentsService;
  let commentRepository: jest.Mocked<Repository<SettlementComment>>;
  let settlementRepository: jest.Mocked<Repository<MonthlySettlement>>;
  let tenantService: jest.Mocked<TenantService>;

  // Mock data
  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';
  const mockSettlementId = 'settlement-123';

  const mockCompanyOwner: Partial<User> = {
    id: mockUserId,
    email: 'owner@company.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
    firstName: 'Jan',
    lastName: 'Kowalski',
  };

  const mockEmployee: Partial<User> = {
    id: 'employee-456',
    email: 'employee@company.com',
    role: UserRole.EMPLOYEE,
    companyId: mockCompanyId,
    firstName: 'Anna',
    lastName: 'Nowak',
  };

  const mockAdmin: Partial<User> = {
    id: 'admin-789',
    email: 'admin@system.com',
    role: UserRole.ADMIN,
    companyId: null,
  };

  const mockSettlement: Partial<MonthlySettlement> = {
    id: mockSettlementId,
    companyId: mockCompanyId,
    userId: mockUserId,
    month: 1,
    year: 2024,
  };

  const mockComment: Partial<SettlementComment> = {
    id: 'comment-123',
    settlementId: mockSettlementId,
    userId: mockUserId,
    content: 'Test comment',
    companyId: mockCompanyId,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockComment]),
  });

  const mockTenantService = {
    getEffectiveCompanyId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTenantService.getEffectiveCompanyId.mockResolvedValue(mockCompanyId);

    const mockQueryBuilder = createMockQueryBuilder();

    const mockCommentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockSettlementRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // Use useFactory for Bun compatibility (no decorator metadata)
        {
          provide: SettlementCommentsService,
          useFactory: () => {
            return new SettlementCommentsService(
              mockCommentRepository as any,
              mockSettlementRepository as any,
              mockTenantService as any
            );
          },
        },
        {
          provide: getRepositoryToken(SettlementComment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(MonthlySettlement),
          useValue: mockSettlementRepository,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<SettlementCommentsService>(SettlementCommentsService);
    commentRepository = module.get(getRepositoryToken(SettlementComment));
    settlementRepository = module.get(getRepositoryToken(MonthlySettlement));
    tenantService = module.get(TenantService);
  });

  describe('getComments', () => {
    it('should return comments for COMPANY_OWNER', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);

      const result = await service.getComments(mockSettlementId, mockCompanyOwner as User);

      expect(result).toHaveLength(1);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
    });

    it('should return comments for ADMIN user', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);

      const result = await service.getComments(mockSettlementId, mockAdmin as User);

      expect(result).toHaveLength(1);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockAdmin);
    });

    it('should return comments for EMPLOYEE on their own settlement', async () => {
      const employeeSettlement = { ...mockSettlement, userId: mockEmployee.id };
      settlementRepository.findOne = jest.fn().mockResolvedValue(employeeSettlement);

      const result = await service.getComments(mockSettlementId, mockEmployee as User);

      expect(result).toHaveLength(1);
    });

    it('should throw SettlementAccessDeniedException for EMPLOYEE on other settlement', async () => {
      // Settlement belongs to a different user
      const otherUserSettlement = { ...mockSettlement, userId: 'other-user-id' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(otherUserSettlement);

      await expect(service.getComments(mockSettlementId, mockEmployee as User)).rejects.toThrow(
        SettlementAccessDeniedException
      );
    });

    it('should throw SettlementNotFoundException when settlement does not exist', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getComments(mockSettlementId, mockCompanyOwner as User)).rejects.toThrow(
        SettlementNotFoundException
      );
    });

    it('should use QueryBuilder with proper joins for N+1 prevention', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      const mockQueryBuilder = createMockQueryBuilder();
      commentRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getComments(mockSettlementId, mockCompanyOwner as User);

      expect(commentRepository.createQueryBuilder).toHaveBeenCalledWith('comment');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('comment.user', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('comment.settlementId = :settlementId', {
        settlementId: mockSettlementId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('comment.companyId = :companyId', {
        companyId: mockCompanyId,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('comment.createdAt', 'DESC');
    });

    it('should filter by companyId for multi-tenancy isolation', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      const mockQueryBuilder = createMockQueryBuilder();
      commentRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder) as any;

      await service.getComments(mockSettlementId, mockCompanyOwner as User);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('comment.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('should verify settlement companyId matches tenant context', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);

      await service.getComments(mockSettlementId, mockCompanyOwner as User);

      expect(settlementRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSettlementId, companyId: mockCompanyId },
      });
    });
  });

  describe('addComment', () => {
    const createDto: CreateCommentDto = {
      content: 'New test comment',
    };

    it('should create comment for COMPANY_OWNER', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      const savedComment = {
        ...mockComment,
        content: createDto.content,
        userId: mockCompanyOwner.id,
      };
      commentRepository.create = jest.fn().mockReturnValue(savedComment);
      commentRepository.save = jest.fn().mockResolvedValue(savedComment);

      const result = await service.addComment(
        mockSettlementId,
        createDto,
        mockCompanyOwner as User
      );

      expect(result.content).toBe(createDto.content);
      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
    });

    it('should create comment for ADMIN user', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      const savedComment = {
        ...mockComment,
        content: createDto.content,
        userId: mockAdmin.id,
      };
      commentRepository.create = jest.fn().mockReturnValue(savedComment);
      commentRepository.save = jest.fn().mockResolvedValue(savedComment);

      const result = await service.addComment(mockSettlementId, createDto, mockAdmin as User);

      expect(result.content).toBe(createDto.content);
    });

    it('should create comment for EMPLOYEE on their own settlement', async () => {
      const employeeSettlement = { ...mockSettlement, userId: mockEmployee.id };
      settlementRepository.findOne = jest.fn().mockResolvedValue(employeeSettlement);
      const savedComment = {
        ...mockComment,
        content: createDto.content,
        userId: mockEmployee.id,
      };
      commentRepository.create = jest.fn().mockReturnValue(savedComment);
      commentRepository.save = jest.fn().mockResolvedValue(savedComment);

      const result = await service.addComment(mockSettlementId, createDto, mockEmployee as User);

      expect(result.content).toBe(createDto.content);
    });

    it('should throw SettlementAccessDeniedException for EMPLOYEE on other settlement', async () => {
      const otherUserSettlement = { ...mockSettlement, userId: 'other-user-id' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(otherUserSettlement);

      await expect(
        service.addComment(mockSettlementId, createDto, mockEmployee as User)
      ).rejects.toThrow(SettlementAccessDeniedException);
    });

    it('should throw SettlementNotFoundException when settlement does not exist', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.addComment(mockSettlementId, createDto, mockCompanyOwner as User)
      ).rejects.toThrow(SettlementNotFoundException);
    });

    it('should create comment with correct data structure', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      commentRepository.create = jest.fn().mockReturnValue(mockComment);
      commentRepository.save = jest.fn().mockResolvedValue(mockComment);

      await service.addComment(mockSettlementId, createDto, mockCompanyOwner as User);

      expect(commentRepository.create).toHaveBeenCalledWith({
        settlementId: mockSettlementId,
        userId: mockCompanyOwner.id,
        content: createDto.content,
        companyId: mockCompanyId,
      });
    });

    it('should attach user to saved comment for response', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      const savedComment = { ...mockComment };
      commentRepository.create = jest.fn().mockReturnValue(savedComment);
      commentRepository.save = jest.fn().mockResolvedValue(savedComment);

      const result = await service.addComment(
        mockSettlementId,
        createDto,
        mockCompanyOwner as User
      );

      // User should be attached directly from request context
      expect(result.user).toBe(mockCompanyOwner);
    });

    it('should use tenant service for companyId', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);
      commentRepository.create = jest.fn().mockReturnValue(mockComment);
      commentRepository.save = jest.fn().mockResolvedValue(mockComment);

      await service.addComment(mockSettlementId, createDto, mockCompanyOwner as User);

      expect(tenantService.getEffectiveCompanyId).toHaveBeenCalledWith(mockCompanyOwner);
      expect(commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });
  });

  describe('Multi-tenancy isolation', () => {
    it('should always filter settlements by companyId', async () => {
      settlementRepository.findOne = jest.fn().mockResolvedValue(mockSettlement);

      await service.getComments(mockSettlementId, mockCompanyOwner as User);

      expect(settlementRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockSettlementId,
          companyId: mockCompanyId,
        },
      });
    });

    it('should use TenantService to get effective companyId', async () => {
      const differentCompanyId = 'different-company-456';
      mockTenantService.getEffectiveCompanyId.mockResolvedValue(differentCompanyId);
      settlementRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getComments(mockSettlementId, mockCompanyOwner as User)).rejects.toThrow(
        SettlementNotFoundException
      );

      expect(settlementRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockSettlementId,
          companyId: differentCompanyId,
        },
      });
    });
  });

  describe('Access control - canViewAllClients', () => {
    it('should allow COMPANY_OWNER to view any settlement in their company', async () => {
      const differentUserSettlement = { ...mockSettlement, userId: 'different-user' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(differentUserSettlement);

      // Should not throw
      await expect(
        service.getComments(mockSettlementId, mockCompanyOwner as User)
      ).resolves.toBeDefined();
    });

    it('should allow ADMIN to view any settlement', async () => {
      const differentUserSettlement = { ...mockSettlement, userId: 'different-user' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(differentUserSettlement);

      // Should not throw
      await expect(service.getComments(mockSettlementId, mockAdmin as User)).resolves.toBeDefined();
    });

    it('should restrict EMPLOYEE to only their own settlements', async () => {
      const differentUserSettlement = { ...mockSettlement, userId: 'different-user' };
      settlementRepository.findOne = jest.fn().mockResolvedValue(differentUserSettlement);

      await expect(service.getComments(mockSettlementId, mockEmployee as User)).rejects.toThrow(
        SettlementAccessDeniedException
      );
    });
  });
});
