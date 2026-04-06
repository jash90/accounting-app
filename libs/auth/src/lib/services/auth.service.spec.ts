import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';

import { Company, User, UserRole } from '@accounting/common';

import { AuthService } from './auth.service';
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from '../constants/jwt.constants';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: mock(() => {}),
    create: mock(() => {}),
    save: mock(() => {}),
    increment: mock(() => Promise.resolve()),
    createQueryBuilder: mock(() => ({
      where: mock(() => ({ getOne: mock(() => {}) })),
      getOne: mock(() => {}),
    })),
  };

  const mockCompanyRepository = {
    findOne: mock(() => {}),
  };

  const mockAccessJwtService = {
    sign: mock(() => {}),
    verify: mock(() => {}),
  };

  const mockRefreshJwtService = {
    sign: mock(() => {}),
    verify: mock(() => {}),
  };

  beforeEach(async () => {
    // Reset all mocks
    (mockUserRepository.findOne as Mock<typeof mockUserRepository.findOne>).mockReset();
    (mockUserRepository.create as Mock<typeof mockUserRepository.create>).mockReset();
    (mockUserRepository.save as Mock<typeof mockUserRepository.save>).mockReset();
    (
      mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
    ).mockReset();
    (mockCompanyRepository.findOne as Mock<typeof mockCompanyRepository.findOne>).mockReset();
    (mockAccessJwtService.sign as Mock<typeof mockAccessJwtService.sign>).mockReset();
    (mockAccessJwtService.verify as Mock<typeof mockAccessJwtService.verify>).mockReset();
    (mockRefreshJwtService.sign as Mock<typeof mockRefreshJwtService.sign>).mockReset();
    (mockRefreshJwtService.verify as Mock<typeof mockRefreshJwtService.verify>).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: ACCESS_JWT_SERVICE,
          useValue: mockAccessJwtService,
        },
        {
          provide: REFRESH_JWT_SERVICE,
          useValue: mockRefreshJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return auth response with tokens on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser: Partial<User> = {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.EMPLOYEE,
        companyId: 'company-1',
        isActive: true,
      };

      const mockGetOne = mock(() => Promise.resolve(mockUser));
      const mockWhere = mock(() => ({ getOne: mockGetOne }));
      (
        mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
      ).mockImplementation(() => ({
        where: mockWhere,
        getOne: mockGetOne,
      }));
      (mockAccessJwtService.sign as Mock<typeof mockAccessJwtService.sign>).mockImplementation(
        () => 'mock-access-token'
      );
      (mockRefreshJwtService.sign as Mock<typeof mockRefreshJwtService.sign>).mockImplementation(
        () => 'mock-refresh-token'
      );

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const mockGetOne = mock(() => Promise.resolve(null));
      const mockWhere = mock(() => ({ getOne: mockGetOne }));
      (
        mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
      ).mockImplementation(() => ({
        where: mockWhere,
        getOne: mockGetOne,
      }));

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should always create user with COMPANY_OWNER role (FIX-03)', async () => {
      const mockGetOne = mock(() => Promise.resolve(null));
      const mockWhere = mock(() => ({ getOne: mockGetOne }));
      (
        mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
      ).mockImplementation(() => ({
        where: mockWhere,
        getOne: mockGetOne,
      }));

      const savedUser = {
        id: '2',
        email: 'owner@test.com',
        firstName: 'Owner',
        lastName: 'User',
        role: UserRole.COMPANY_OWNER,
        companyId: null,
        isActive: true,
        tokenVersion: 0,
      };
      (mockUserRepository.create as Mock<typeof mockUserRepository.create>).mockReturnValue(
        savedUser
      );
      (mockUserRepository.save as Mock<typeof mockUserRepository.save>).mockResolvedValue(
        savedUser
      );
      (mockAccessJwtService.sign as Mock<typeof mockAccessJwtService.sign>).mockReturnValue(
        'access'
      );
      (mockRefreshJwtService.sign as Mock<typeof mockRefreshJwtService.sign>).mockReturnValue(
        'refresh'
      );

      const result = await service.register({
        email: 'owner@test.com',
        password: 'SecurePass123!',
        firstName: 'Owner',
        lastName: 'User',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      // Verify user was created with COMPANY_OWNER role
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.COMPANY_OWNER, companyId: null })
      );
    });

    it('should reject registration if email already exists', async () => {
      const existingUser = { id: '1', email: 'existing@test.com' };
      const mockGetOne = mock(() => Promise.resolve(existingUser));
      const mockWhere = mock(() => ({ getOne: mockGetOne }));
      (
        mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
      ).mockImplementation(() => ({
        where: mockWhere,
        getOne: mockGetOne,
      }));

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });
  });

  describe('invalidateTokens', () => {
    it('should increment tokenVersion for the given user', async () => {
      (mockUserRepository.increment as Mock<typeof mockUserRepository.increment>).mockResolvedValue(
        undefined
      );

      await service.invalidateTokens('user-123');

      expect(mockUserRepository.increment).toHaveBeenCalledWith(
        { id: 'user-123' },
        'tokenVersion',
        1
      );
    });
  });
});
