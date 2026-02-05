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
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
