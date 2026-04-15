import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { TokenLimit, User, UserRole } from '@accounting/common';
import { type SystemCompanyService } from '@accounting/common/backend';

import { TokenLimitService } from './token-limit.service';
import { type TokenUsageService } from './token-usage.service';

describe('TokenLimitService', () => {
  let service: TokenLimitService;
  let limitRepo: jest.Mocked<Repository<TokenLimit>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let tokenUsageService: jest.Mocked<
    Pick<TokenUsageService, 'getUserMonthlyTotal' | 'getCompanyMonthlyTotal'>
  >;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getCompanyIdForUser'>>;

  const companyId = 'company-1';
  const mockAdmin = { id: 'admin-1', companyId: null, role: UserRole.ADMIN } as unknown as User;
  const mockOwner = { id: 'owner-1', companyId, role: UserRole.COMPANY_OWNER } as User;
  const mockUser = { id: 'user-1', companyId, role: UserRole.EMPLOYEE } as User;

  const mockCompanyLimit: TokenLimit = {
    id: 'limit-1',
    companyId,
    userId: null,
    monthlyLimit: 100000,
    warningThresholdPercentage: 80,
    notifyOnWarning: true,
    notifyOnExceeded: true,
    setById: mockAdmin.id,
  } as unknown as TokenLimit;

  const mockUserLimit: TokenLimit = {
    id: 'limit-2',
    companyId,
    userId: mockUser.id,
    monthlyLimit: 10000,
    warningThresholdPercentage: 80,
    notifyOnWarning: true,
    notifyOnExceeded: true,
    setById: mockOwner.id,
  } as unknown as TokenLimit;

  beforeEach(async () => {
    jest.clearAllMocks();

    limitRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TokenLimit>>;

    userRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    tokenUsageService = {
      getUserMonthlyTotal: jest.fn().mockResolvedValue(0),
      getCompanyMonthlyTotal: jest.fn().mockResolvedValue(0),
    };

    systemCompanyService = {
      getCompanyIdForUser: jest.fn().mockResolvedValue(companyId),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: TokenLimitService,
          useFactory: () =>
            new TokenLimitService(
              limitRepo as any,
              userRepo as any,
              tokenUsageService as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(TokenLimit), useValue: limitRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(TokenLimitService);
  });

  describe('setCompanyLimit', () => {
    const setDto = {
      targetType: 'company' as const,
      targetId: companyId,
      monthlyLimit: 100000,
    };

    it('should create new company limit when none exists', async () => {
      limitRepo.findOne.mockResolvedValue(null);
      limitRepo.create.mockReturnValue(mockCompanyLimit);
      limitRepo.save.mockResolvedValue(mockCompanyLimit);

      const result = await service.setCompanyLimit(companyId, setDto, mockAdmin);

      expect(result).toEqual(mockCompanyLimit);
      expect(limitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          userId: null,
          monthlyLimit: 100000,
          setById: mockAdmin.id,
        })
      );
    });

    it('should update existing company limit', async () => {
      limitRepo.findOne.mockResolvedValue({ ...mockCompanyLimit } as TokenLimit);
      limitRepo.save.mockImplementation((entity) => Promise.resolve(entity as any));

      const result = await service.setCompanyLimit(
        companyId,
        { ...setDto, monthlyLimit: 200000 },
        mockAdmin
      );

      expect(result.monthlyLimit).toBe(200000);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(service.setCompanyLimit(companyId, setDto, mockUser)).rejects.toThrow(
        'Only admins can set company limits'
      );
    });
  });

  describe('setUserLimit', () => {
    const setDto = {
      targetType: 'user' as const,
      targetId: mockUser.id,
      monthlyLimit: 10000,
    };

    it('should create new user limit when none exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      limitRepo.findOne.mockResolvedValue(null);
      limitRepo.create.mockReturnValue(mockUserLimit);
      limitRepo.save.mockResolvedValue(mockUserLimit);

      const result = await service.setUserLimit(mockUser.id, setDto, mockOwner);

      expect(result).toEqual(mockUserLimit);
    });

    it('should throw ForbiddenException for non-company-owner', async () => {
      await expect(service.setUserLimit(mockUser.id, setDto, mockUser)).rejects.toThrow(
        'Only company owners can set user limits'
      );
    });

    it('should throw NotFoundException if target user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.setUserLimit('nonexistent', setDto, mockOwner)).rejects.toThrow(
        'not found'
      );
    });

    it('should throw ForbiddenException if target user is in different company', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'other', companyId: 'other-company' } as User);

      await expect(service.setUserLimit('other', setDto, mockOwner)).rejects.toThrow(
        'Cannot set limits for users outside your company'
      );
    });

    it('should throw ForbiddenException if owner has no companyId', async () => {
      const noCompanyOwner = {
        id: 'o-1',
        companyId: null,
        role: UserRole.COMPANY_OWNER,
      } as unknown as User;
      systemCompanyService.getCompanyIdForUser.mockResolvedValue(null);

      await expect(service.setUserLimit(mockUser.id, setDto, noCompanyOwner)).rejects.toThrow(
        'User not associated with company'
      );
    });
  });

  describe('enforceTokenLimit', () => {
    it('should pass when no limits are set', async () => {
      limitRepo.findOne.mockResolvedValue(null);

      await expect(service.enforceTokenLimit(mockUser)).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when user limit exceeded', async () => {
      limitRepo.findOne.mockResolvedValueOnce(mockUserLimit); // user limit
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(15000); // exceeds 10000

      await expect(service.enforceTokenLimit(mockUser)).rejects.toThrow(
        'Monthly token limit exceeded'
      );
    });

    it('should throw BadRequestException when company limit exceeded', async () => {
      limitRepo.findOne
        .mockResolvedValueOnce(null) // no user limit
        .mockResolvedValueOnce(mockCompanyLimit); // company limit
      tokenUsageService.getCompanyMonthlyTotal.mockResolvedValue(150000); // exceeds 100000

      await expect(service.enforceTokenLimit(mockUser)).rejects.toThrow(
        'Company monthly token limit exceeded'
      );
    });

    it('should pass when usage is within both limits', async () => {
      limitRepo.findOne
        .mockResolvedValueOnce(mockUserLimit)
        .mockResolvedValueOnce(mockCompanyLimit);
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(5000);
      tokenUsageService.getCompanyMonthlyTotal.mockResolvedValue(50000);

      await expect(service.enforceTokenLimit(mockUser)).resolves.toBeUndefined();
    });
  });

  describe('getMyLimit', () => {
    it('should return both user and company limits with usage stats', async () => {
      limitRepo.findOne
        .mockResolvedValueOnce(mockUserLimit)
        .mockResolvedValueOnce(mockCompanyLimit);
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(5000);
      tokenUsageService.getCompanyMonthlyTotal.mockResolvedValue(50000);

      const result = await service.getMyLimit(mockUser);

      expect(result.userLimit).toBeDefined();
      expect(result.userLimit!.currentUsage).toBe(5000);
      expect(result.userLimit!.usagePercentage).toBe(50);
      expect(result.userLimit!.isExceeded).toBe(false);
      expect(result.userLimit!.isWarning).toBe(false);

      expect(result.companyLimit).toBeDefined();
      expect(result.companyLimit!.currentUsage).toBe(50000);
      expect(result.companyLimit!.usagePercentage).toBe(50);
    });

    it('should return null limits when none are set', async () => {
      limitRepo.findOne.mockResolvedValue(null);
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(0);

      const result = await service.getMyLimit(mockUser);

      expect(result.userLimit).toBeNull();
      expect(result.companyLimit).toBeNull();
    });

    it('should flag isWarning when threshold exceeded', async () => {
      limitRepo.findOne
        .mockResolvedValueOnce({ ...mockUserLimit, warningThresholdPercentage: 80 } as TokenLimit)
        .mockResolvedValueOnce(null);
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(8500); // 85% of 10000

      const result = await service.getMyLimit(mockUser);

      expect(result.userLimit!.isWarning).toBe(true);
      expect(result.userLimit!.isExceeded).toBe(false);
    });

    it('should flag isExceeded when limit reached', async () => {
      limitRepo.findOne.mockResolvedValueOnce(mockUserLimit).mockResolvedValueOnce(null);
      tokenUsageService.getUserMonthlyTotal.mockResolvedValue(10000); // equal to limit

      const result = await service.getMyLimit(mockUser);

      expect(result.userLimit!.isExceeded).toBe(true);
    });
  });
});
