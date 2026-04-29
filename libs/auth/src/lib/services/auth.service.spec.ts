import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';
import { DataSource } from 'typeorm';

import { Company, RefreshToken, User, UserRole } from '@accounting/common';

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

  const mockRefreshTokenRepository = {
    findOne: mock(() => {}),
    save: mock((row: unknown) => Promise.resolve({ id: 'rt-1', ...(row as object) })),
    update: mock(() => Promise.resolve()),
  };

  const mockAccessJwtService = {
    sign: mock(() => {}),
    verify: mock(() => {}),
  };

  const mockRefreshJwtService = {
    sign: mock(() => {}),
    verify: mock(() => {}),
  };

  const mockConfigService = {
    get: mock((key: string) => (key === 'JWT_REFRESH_EXPIRES_IN' ? '7d' : undefined)),
  };

  // Tracks the manager calls inside `dataSource.transaction(cb)`.
  const txManagerMock = {
    increment: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    save: mock((_entity: unknown, row: unknown) =>
      Promise.resolve({ id: 'rt-tx', ...(row as object) })
    ),
  };

  const mockDataSource = {
    transaction: mock(<T>(cb: (mgr: typeof txManagerMock) => Promise<T>) => cb(txManagerMock)),
  };

  beforeEach(async () => {
    // Reset all mocks
    (mockUserRepository.findOne as Mock<typeof mockUserRepository.findOne>).mockReset();
    (mockUserRepository.create as Mock<typeof mockUserRepository.create>).mockReset();
    (mockUserRepository.save as Mock<typeof mockUserRepository.save>).mockReset();
    (mockUserRepository.increment as Mock<typeof mockUserRepository.increment>).mockReset();
    (
      mockUserRepository.createQueryBuilder as Mock<typeof mockUserRepository.createQueryBuilder>
    ).mockReset();
    (mockCompanyRepository.findOne as Mock<typeof mockCompanyRepository.findOne>).mockReset();
    (
      mockRefreshTokenRepository.findOne as Mock<typeof mockRefreshTokenRepository.findOne>
    ).mockReset();
    (mockRefreshTokenRepository.save as Mock<typeof mockRefreshTokenRepository.save>).mockReset();
    (
      mockRefreshTokenRepository.update as Mock<typeof mockRefreshTokenRepository.update>
    ).mockReset();
    (mockAccessJwtService.sign as Mock<typeof mockAccessJwtService.sign>).mockReset();
    (mockAccessJwtService.verify as Mock<typeof mockAccessJwtService.verify>).mockReset();
    (mockRefreshJwtService.sign as Mock<typeof mockRefreshJwtService.sign>).mockReset();
    (mockRefreshJwtService.verify as Mock<typeof mockRefreshJwtService.verify>).mockReset();
    (txManagerMock.increment as Mock<typeof txManagerMock.increment>).mockReset();
    (txManagerMock.update as Mock<typeof txManagerMock.update>).mockReset();
    (txManagerMock.save as Mock<typeof txManagerMock.save>).mockReset();
    // Provide sensible defaults consumed by generateTokens / invalidateTokens.
    (
      mockRefreshTokenRepository.save as Mock<typeof mockRefreshTokenRepository.save>
    ).mockImplementation((row: unknown) => Promise.resolve({ id: 'rt-1', ...(row as object) }));
    (txManagerMock.save as Mock<typeof txManagerMock.save>).mockImplementation(
      (_entity: unknown, row: unknown) => Promise.resolve({ id: 'rt-tx', ...(row as object) })
    );

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
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: ACCESS_JWT_SERVICE,
          useValue: mockAccessJwtService,
        },
        {
          provide: REFRESH_JWT_SERVICE,
          useValue: mockRefreshJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
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
    it('should increment tokenVersion AND mark all unused refresh tokens used', async () => {
      await service.invalidateTokens('user-123');

      // Runs inside dataSource.transaction(...) — assertions go on the manager mock.
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txManagerMock.increment).toHaveBeenCalledWith(
        User,
        { id: 'user-123' },
        'tokenVersion',
        1
      );
      // All still-valid refresh tokens for this user are flipped to used.
      expect(txManagerMock.update).toHaveBeenCalledTimes(1);
      const [entity, where, set] = (txManagerMock.update as Mock<typeof txManagerMock.update>).mock
        .calls[0] as unknown as [unknown, { userId: string }, { usedAt: Date }];
      expect(entity).toBe(RefreshToken);
      expect(where.userId).toBe('user-123');
      expect(set.usedAt).toBeInstanceOf(Date);
    });
  });
});
