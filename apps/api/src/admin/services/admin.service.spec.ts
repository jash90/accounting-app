import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataSource, type Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { RBACService } from '@accounting/rbac';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let rbacService: jest.Mocked<Pick<RBACService, never>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
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

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    companyRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Company>>;

    rbacService = {};

    dataSource = {
      transaction: jest.fn(),
    };

    systemCompanyService = {
      getSystemCompany: jest.fn().mockResolvedValue(systemCompany),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AdminService,
          useFactory: () =>
            new AdminService(
              userRepository as any,
              companyRepository as any,
              rbacService as any,
              dataSource as any,
              systemCompanyService as any
            ),
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: RBACService, useValue: rbacService },
        { provide: DataSource, useValue: dataSource },
        { provide: SystemCompanyService, useValue: systemCompanyService },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('findAllUsers', () => {
    it('should return all users with company relations', async () => {
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findAllUsers();

      expect(result).toEqual([mockUser]);
      expect(userRepository.find).toHaveBeenCalledWith({
        relations: ['company'],
        order: { createdAt: 'DESC' },
      });
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
      userRepository.findOne.mockResolvedValue(mockUser);

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

    it('should throw ConflictException when updating to existing email', async () => {
      const dto = { email: 'existing@example.com' };
      const existingUser = { ...mockUser, id: 'other-user', email: 'existing@example.com' } as User;

      userRepository.findOne.mockResolvedValueOnce(mockUser); // findUserById
      userRepository.findOne.mockResolvedValueOnce(existingUser); // email check

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
    it('should return all non-system companies', async () => {
      companyRepository.find.mockResolvedValue([mockCompany]);

      const result = await service.findAllCompanies();

      expect(result).toEqual([mockCompany]);
      expect(companyRepository.find).toHaveBeenCalledWith({
        where: { isSystemCompany: false },
        relations: ['owner', 'employees'],
        order: { createdAt: 'DESC' },
      });
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
