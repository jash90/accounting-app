import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import {
  Company,
  CompanyModuleAccess,
  Module as ModuleEntity,
  User,
  UserModulePermission,
  UserRole,
} from '@accounting/common';
import { RBACService } from '@accounting/rbac';

import { EmployeeModulePermissionsService } from './employee-module-permissions.service';
import { createMockRepository } from '../../testing/mock-helpers';

describe('EmployeeModulePermissionsService', () => {
  let testingModule: TestingModule;
  let service: EmployeeModulePermissionsService;
  let moduleRepository: jest.Mocked<Repository<ModuleEntity>>;
  let companyModuleAccessRepository: jest.Mocked<Repository<CompanyModuleAccess>>;
  let userModulePermissionRepository: jest.Mocked<Repository<UserModulePermission>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let rbacService: jest.Mocked<Pick<RBACService, 'companyHasModule'>>;

  const companyId = 'company-1';
  const employeeId = 'employee-1';
  const moduleSlug = 'tasks';

  const mockModule: ModuleEntity = {
    id: 'module-1',
    name: 'Tasks',
    slug: 'tasks',
    isActive: true,
  } as ModuleEntity;

  const mockEmployee: User = {
    id: employeeId,
    companyId,
    role: UserRole.EMPLOYEE,
  } as User;

  const mockCompany: Company = {
    id: companyId,
    ownerId: 'owner-1',
    owner: { id: 'owner-1' },
  } as unknown as Company;

  const mockPermission: UserModulePermission = {
    id: 'perm-1',
    userId: employeeId,
    moduleId: 'module-1',
    permissions: ['read', 'write'],
    grantedById: 'owner-1',
  } as UserModulePermission;

  // Mock transaction manager
  const createMockManager = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  });

  beforeAll(async () => {
    moduleRepository = createMockRepository<ModuleEntity>();
    companyModuleAccessRepository = createMockRepository<CompanyModuleAccess>();
    userRepository = createMockRepository<User>();
    companyRepository = createMockRepository<Company>();

    userModulePermissionRepository = createMockRepository<UserModulePermission>({
      manager: {
        transaction: jest.fn(),
      },
    });

    rbacService = {
      companyHasModule: jest.fn(),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmployeeModulePermissionsService,
          useFactory: () =>
            new EmployeeModulePermissionsService(
              moduleRepository as any,
              companyModuleAccessRepository as any,
              userModulePermissionRepository as any,
              userRepository as any,
              companyRepository as any,
              rbacService as any
            ),
        },
        { provide: getRepositoryToken(ModuleEntity), useValue: moduleRepository },
        {
          provide: getRepositoryToken(CompanyModuleAccess),
          useValue: companyModuleAccessRepository,
        },
        {
          provide: getRepositoryToken(UserModulePermission),
          useValue: userModulePermissionRepository,
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: RBACService, useValue: rbacService },
      ],
    }).compile();

    service = testingModule.get(EmployeeModulePermissionsService);
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployeeModules', () => {
    it('should return permissions for modules enabled for the company', async () => {
      userRepository.findOne.mockResolvedValue(mockEmployee);
      userModulePermissionRepository.find.mockResolvedValue([mockPermission]);
      companyModuleAccessRepository.find.mockResolvedValue([
        { moduleId: 'module-1', companyId, isEnabled: true } as CompanyModuleAccess,
      ]);

      const result = await service.getEmployeeModules(companyId, employeeId);

      expect(result).toEqual([mockPermission]);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
      });
    });

    it('should filter out permissions for disabled company modules', async () => {
      userRepository.findOne.mockResolvedValue(mockEmployee);
      userModulePermissionRepository.find.mockResolvedValue([
        { ...mockPermission, moduleId: 'module-1' } as UserModulePermission,
        { ...mockPermission, id: 'perm-2', moduleId: 'module-2' } as UserModulePermission,
      ]);
      // Only module-1 is enabled
      companyModuleAccessRepository.find.mockResolvedValue([
        { moduleId: 'module-1', companyId, isEnabled: true } as CompanyModuleAccess,
      ]);

      const result = await service.getEmployeeModules(companyId, employeeId);

      expect(result).toHaveLength(1);
      expect(result[0].moduleId).toBe('module-1');
    });

    it('should throw NotFoundException when employee not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getEmployeeModules(companyId, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('grantModuleToEmployee', () => {
    it('should grant module to employee via transaction', async () => {
      const mockManager = createMockManager();
      // Employee lookup (in the private method via userRepository, not manager)
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      rbacService.companyHasModule.mockResolvedValue(true);
      mockManager.findOne
        .mockResolvedValueOnce(mockCompany) // company lookup
        .mockResolvedValueOnce(null); // no existing permission
      mockManager.create.mockReturnValue(mockPermission);
      mockManager.save.mockResolvedValue(mockPermission);

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.grantModuleToEmployee(companyId, employeeId, moduleSlug, {
        permissions: ['read', 'write'],
      });

      expect(result).toEqual(mockPermission);
    });

    it('should update existing permission on re-grant', async () => {
      const existingPerm = { ...mockPermission, permissions: ['read'] } as UserModulePermission;
      const mockManager = createMockManager();
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      rbacService.companyHasModule.mockResolvedValue(true);
      mockManager.findOne
        .mockResolvedValueOnce(mockCompany) // company lookup
        .mockResolvedValueOnce(existingPerm); // existing permission
      mockManager.save.mockResolvedValue({ ...existingPerm, permissions: ['read', 'write'] });

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.grantModuleToEmployee(companyId, employeeId, moduleSlug, {
        permissions: ['read', 'write'],
      });

      expect(result.permissions).toEqual(['read', 'write']);
    });

    it('should throw ForbiddenException when company lacks module access', async () => {
      const mockManager = createMockManager();
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      rbacService.companyHasModule.mockResolvedValue(false);

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      await expect(
        service.grantModuleToEmployee(companyId, employeeId, moduleSlug, {
          permissions: ['read'],
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateEmployeeModulePermissions', () => {
    it('should update existing permission', async () => {
      rbacService.companyHasModule.mockResolvedValue(true);
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      userModulePermissionRepository.findOne.mockResolvedValue(mockPermission);

      // Mock the delegated grantModuleToEmployee call via transaction
      const mockManager = createMockManager();
      mockManager.findOne.mockResolvedValueOnce(mockCompany).mockResolvedValueOnce(mockPermission);
      mockManager.save.mockResolvedValue({ ...mockPermission, permissions: ['read'] });
      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      // Re-mock userRepository for the second findOne in grantModuleToEmployee
      userRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.updateEmployeeModulePermissions(
        companyId,
        employeeId,
        moduleSlug,
        { permissions: ['read'] }
      );

      expect(result.permissions).toEqual(['read']);
    });

    it('should throw NotFoundException when employee has no existing permission', async () => {
      rbacService.companyHasModule.mockResolvedValue(true);
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      userModulePermissionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmployeeModulePermissions(companyId, employeeId, moduleSlug, {
          permissions: ['read'],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company no longer has module', async () => {
      rbacService.companyHasModule.mockResolvedValue(false);

      await expect(
        service.updateEmployeeModulePermissions(companyId, employeeId, moduleSlug, {
          permissions: ['read'],
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeModuleFromEmployee', () => {
    it('should remove permission via transaction', async () => {
      const mockManager = createMockManager();
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      mockManager.findOne.mockResolvedValue(mockPermission);

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.revokeModuleFromEmployee(companyId, employeeId, moduleSlug);

      expect(result).toEqual({ message: 'Module access revoked successfully' });
      expect(mockManager.remove).toHaveBeenCalledWith(UserModulePermission, mockPermission);
    });

    it('should succeed silently when no permission exists', async () => {
      const mockManager = createMockManager();
      userRepository.findOne.mockResolvedValue(mockEmployee);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      mockManager.findOne.mockResolvedValue(null);

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.revokeModuleFromEmployee(companyId, employeeId, moduleSlug);

      expect(result).toEqual({ message: 'Module access revoked successfully' });
      expect(mockManager.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when employee not found', async () => {
      const mockManager = createMockManager();
      userRepository.findOne.mockResolvedValue(null);

      (userModulePermissionRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      await expect(
        service.revokeModuleFromEmployee(companyId, 'nonexistent', moduleSlug)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
