import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Client, UserRole, type User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { DuplicateDetectionService } from './duplicate-detection.service';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;

  const mockCompanyId = 'company-123';
  const mockUserId = 'user-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.COMPANY_OWNER,
    companyId: mockCompanyId,
  };

  const mockSystemCompanyService = {
    getCompanyIdForUser: jest.fn(),
  };

  const mockClientRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSystemCompanyService.getCompanyIdForUser.mockResolvedValue(mockCompanyId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DuplicateDetectionService,
          useFactory: () =>
            new DuplicateDetectionService(
              mockClientRepository as any,
              mockSystemCompanyService as any
            ),
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: SystemCompanyService,
          useValue: mockSystemCompanyService,
        },
      ],
    }).compile();

    service = module.get<DuplicateDetectionService>(DuplicateDetectionService);
  });

  describe('checkDuplicates', () => {
    it('should find duplicates by NIP', async () => {
      const duplicate = {
        id: 'dup-1',
        name: 'Duplicate Client',
        nip: '1234567890',
        email: 'dup@test.com',
        isActive: true,
      };
      mockClientRepository.find.mockResolvedValue([duplicate]);

      const result = await service.checkDuplicates(mockUser as User, '1234567890');

      expect(result.hasDuplicates).toBe(true);
      expect(result.byNip).toHaveLength(1);
      expect(result.byNip[0].nip).toBe('1234567890');
    });

    it('should find duplicates by email', async () => {
      const duplicate = {
        id: 'dup-2',
        name: 'Email Dup',
        nip: '9999999999',
        email: 'shared@test.com',
        isActive: true,
      };
      mockClientRepository.find.mockResolvedValue([duplicate]);

      const result = await service.checkDuplicates(mockUser as User, undefined, 'shared@test.com');

      expect(result.hasDuplicates).toBe(true);
      expect(result.byEmail).toHaveLength(1);
      expect(result.byEmail[0].email).toBe('shared@test.com');
    });

    it('should return no duplicates when none found', async () => {
      mockClientRepository.find.mockResolvedValue([]);

      const result = await service.checkDuplicates(
        mockUser as User,
        '0000000000',
        'unique@test.com'
      );

      expect(result.hasDuplicates).toBe(false);
      expect(result.byNip).toHaveLength(0);
      expect(result.byEmail).toHaveLength(0);
    });

    it('should not include a client in both byNip and byEmail', async () => {
      const sameClient = {
        id: 'dup-3',
        name: 'Both Match',
        nip: '1111111111',
        email: 'both@test.com',
        isActive: true,
      };
      // First call (NIP check) returns client, second call (email check) returns same client
      mockClientRepository.find
        .mockResolvedValueOnce([sameClient])
        .mockResolvedValueOnce([sameClient]);

      const result = await service.checkDuplicates(mockUser as User, '1111111111', 'both@test.com');

      expect(result.hasDuplicates).toBe(true);
      expect(result.byNip).toHaveLength(1);
      expect(result.byEmail).toHaveLength(0); // deduplicated
    });

    it('should exclude a specific client ID when provided', async () => {
      mockClientRepository.find.mockResolvedValue([]);

      await service.checkDuplicates(mockUser as User, '1234567890', undefined, 'exclude-id');

      expect(mockClientRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.anything(), // Not(excludeId)
          }),
        })
      );
    });
  });

  describe('isNipTaken', () => {
    it('should return true when NIP is already used', async () => {
      mockClientRepository.count.mockResolvedValue(1);

      const result = await service.isNipTaken(mockUser as User, '1234567890');

      expect(result).toBe(true);
    });

    it('should return false when NIP is not used', async () => {
      mockClientRepository.count.mockResolvedValue(0);

      const result = await service.isNipTaken(mockUser as User, '0000000000');

      expect(result).toBe(false);
    });

    it('should exclude a specific client when checking', async () => {
      mockClientRepository.count.mockResolvedValue(0);

      const result = await service.isNipTaken(mockUser as User, '1234567890', 'exclude-id');

      expect(result).toBe(false);
      expect(mockClientRepository.count).toHaveBeenCalled();
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is already used', async () => {
      mockClientRepository.count.mockResolvedValue(1);

      const result = await service.isEmailTaken(mockUser as User, 'taken@test.com');

      expect(result).toBe(true);
    });

    it('should return false when email is not used', async () => {
      mockClientRepository.count.mockResolvedValue(0);

      const result = await service.isEmailTaken(mockUser as User, 'free@test.com');

      expect(result).toBe(false);
    });
  });
});
