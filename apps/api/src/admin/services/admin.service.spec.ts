import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { RBACService } from '@accounting/rbac';

import { AdminService } from './admin.service';
import { createMockRepository } from '../../testing/mock-helpers';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let rbacService: jest.Mocked<Pick<RBACService, never>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let testingModule: TestingModule;
  let systemCompanyService: jest.Mocked<Pick<SystemCompanyService, 'getSystemCompany'>>;

  const systemCompany = { id: 'system-company-id', name: 'System Admin', isSystemCompany: true };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
    companyId: 'company-1',
    isActive: true,
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockCompany: Company = {
    id: 'company-1',
    name: 'Test Company',
    ownerId: 'owner-1',
    isActive: true,
    isSystemCompany: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    employees: [],
  } as unknown as Company;

  beforeAll(async () => {
    userRepository = createMockRepository<User>();
    companyRepository = createMockRepository<Company>();

    rbacService = {};

    dataSource = {
      transaction: jest.fn(),
    };

    systemCompanyService = {
      getSystemCompany: jest.fn().mockResolvedValue(systemCompany),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AdminService,
          useFactory: () =>
            new AdminService(
              userRepository as any,
              companyRepository as any,
              rbacService as any,
              dataSource as any,
              systemCompanyService as any,
              { invalidateTokens: jest.fn().mockResolvedValue(undefined) } as any,
              { invalidateUserCache: jest.fn() } as any
            ),
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: RBACService, useValue: rbacService },
        { provide: DataSource, useValue: dataSource },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = testingModule.get(AdminService);
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset queryBuilder getOne to return null (no duplicate) by default
    const userQb = userRepository.createQueryBuilder();
    (userQb.getOne as jest.Mock).mockResolvedValue(null);
    (userQb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);
    const companyQb = companyRepository.createQueryBuilder();
    (companyQb.getOne as jest.Mock).mockResolvedValue(null);
    (companyQb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);
  });

  describe('findAllUsers', () => {
    it('should return paginated users with company relations', async () => {
      const mockQb = userRepository.createQueryBuilder();
      (mockQb.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

      const result = await service.findAllUsers();

      expect(result.data).toEqual([mockUser]);
      expect(result.meta.total).toBe(1);
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    });
  });

  describe('findUserById', () => {
    it('should return user by ID', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUser', () => {
    it('should create a user with hashed password via transaction', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.EMPLOYEE,
        companyId: 'company-1',
      };

      userRepository.findOne.mockResolvedValue(null);
      companyRepository.findOne.mockResolvedValue(mockCompany);

      const mockManager = {
        create: jest.fn().mockReturnValue(mockUser),
        save: jest.fn().mockResolvedValue(mockUser),
      };
      dataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.createUser(dto as any);

      expect(result).toEqual(mockUser);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123',
        role: UserRole.EMPLOYEE,
        companyId: 'company-1',
      };
      // Service uses createQueryBuilder for case-insensitive email check
      const mockQb = userRepository.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.createUser(dto as any)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when EMPLOYEE has no companyId', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password123',
        role: UserRole.EMPLOYEE,
        // no companyId
      };
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.createUser(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should auto-assign system company for ADMIN role', async () => {
      const dto = {
        email: 'admin@example.com',
        password: 'Password123',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      };

      userRepository.findOne.mockResolvedValue(null);
      companyRepository.findOne.mockResolvedValue(systemCompany as any);

      const mockManager = {
        create: jest.fn().mockReturnValue(mockUser),
        save: jest.fn().mockResolvedValue(mockUser),
      };
      dataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));

      await service.createUser(dto as any);

      expect(systemCompanyService.getSystemCompany).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const dto = { firstName: 'Updated' };
      const updated = { ...mockUser, firstName: 'Updated' } as User;
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updated);

      const result = await service.updateUser('user-1', dto as any);

      expect(result).toEqual(updated);
    });

    it('should invalidate tokens and cache when deactivating via update', async () => {
      const dto = { isActive: false };
      const deactivated = { ...mockUser, isActive: false } as User;
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue(deactivated);

      const result = await service.updateUser('user-1', dto as any);

      expect(result.isActive).toBe(false);
      // FIX-01: Verify token invalidation happens on deactivation via updateUser
      expect((service as any).authService.invalidateTokens).toHaveBeenCalledWith('user-1');
      expect((service as any).jwtStrategy.invalidateUserCache).toHaveBeenCalledWith('user-1');
    });

    it('should not invalidate tokens when updating non-active fields', async () => {
      const dto = { firstName: 'Updated' };
      const updated = { ...mockUser, firstName: 'Updated' } as User;
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue(updated);

      await service.updateUser('user-1', dto as any);

      expect((service as any).authService.invalidateTokens).not.toHaveBeenCalled();
      expect((service as any).jwtStrategy.invalidateUserCache).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const dto = { email: 'existing@example.com' };
      const existingUser = { ...mockUser, id: 'other-user', email: 'existing@example.com' } as User;

      userRepository.findOne.mockResolvedValueOnce(mockUser); // findUserById
      // Service uses createQueryBuilder for case-insensitive email check
      const mockQb = userRepository.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(existingUser);

      await expect(service.updateUser('user-1', dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('softDeleteUser', () => {
    it('should set isActive to false', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue({ ...mockUser, isActive: false } as User);

      const result = await service.softDeleteUser('user-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('findAllCompanies', () => {
    it('should return paginated non-system companies', async () => {
      const mockQb = companyRepository.createQueryBuilder();
      (mockQb.getManyAndCount as jest.Mock).mockResolvedValue([[mockCompany], 1]);

      const result = await service.findAllCompanies();

      expect(result.data).toEqual([mockCompany]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('softDeleteCompany', () => {
    it('should soft delete a regular company', async () => {
      companyRepository.findOne.mockResolvedValue({ ...mockCompany });
      companyRepository.save.mockResolvedValue({ ...mockCompany, isActive: false } as Company);

      const result = await service.softDeleteCompany('company-1');

      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException when deleting system company', async () => {
      const sysCompany = { ...mockCompany, isSystemCompany: true } as Company;
      companyRepository.findOne.mockResolvedValue(sysCompany);

      await expect(service.softDeleteCompany('system-company-id')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAvailableOwners', () => {
    it('should return COMPANY_OWNER users without assigned company', async () => {
      const availableOwner = {
        ...mockUser,
        role: UserRole.COMPANY_OWNER,
        companyId: null,
      } as unknown as User;
      userRepository.find.mockResolvedValue([availableOwner]);

      const result = await service.findAvailableOwners();

      expect(result).toEqual([availableOwner]);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: {
          role: UserRole.COMPANY_OWNER,
          companyId: null as unknown as string,
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
