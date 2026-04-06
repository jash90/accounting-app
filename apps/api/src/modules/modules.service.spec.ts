import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Module as ModuleEntity, PermissionTargetType, User, UserRole } from '@accounting/common';
import { ModuleDiscoveryService, RBACService } from '@accounting/rbac';

import { ModulesService } from './modules.service';
import { createMockRepository } from '../testing/mock-helpers';
import { CompanyModuleAccessService } from './services/company-module-access.service';
import { EmployeeModulePermissionsService } from './services/employee-module-permissions.service';

describe('ModulesService', () => {
  let testingModule: TestingModule;
  let service: ModulesService;
  let moduleRepository: jest.Mocked<Repository<ModuleEntity>>;
  let rbacService: jest.Mocked<
    Pick<
      RBACService,
      | 'getAvailableModules'
      | 'canAccessModule'
      | 'getModulePermissions'
      | 'getDefaultModulePermissions'
    >
  >;
  let companyModuleAccessService: jest.Mocked<
    Pick<
      CompanyModuleAccessService,
      | 'getCompanyModules'
      | 'grantModuleToCompany'
      | 'revokeModuleFromCompany'
      | 'cleanupOrphanedPermissions'
    >
  >;
  let employeePermissionsService: jest.Mocked<
    Pick<
      EmployeeModulePermissionsService,
      | 'getEmployeeModules'
      | 'grantModuleToEmployee'
      | 'updateEmployeeModulePermissions'
      | 'revokeModuleFromEmployee'
    >
  >;
  let moduleDiscoveryService: jest.Mocked<
    Pick<
      ModuleDiscoveryService,
      'getAllModules' | 'getDiscoveryStats' | 'isDiscoveryComplete' | 'reloadModules'
    >
  >;

  const mockModule: ModuleEntity = {
    id: 'module-1',
    name: 'Tasks',
    slug: 'tasks',
    description: 'Task management',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ModuleEntity;

  const adminUser = {
    id: 'admin-1',
    role: UserRole.ADMIN,
    companyId: 'system-company',
  } as User;

  const ownerUser = {
    id: 'owner-1',
    role: UserRole.COMPANY_OWNER,
    companyId: 'company-1',
  } as User;

  const employeeUser = {
    id: 'employee-1',
    role: UserRole.EMPLOYEE,
    companyId: 'company-1',
  } as User;

  beforeAll(async () => {
    moduleRepository = createMockRepository<ModuleEntity>();

    const mockUserRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    rbacService = {
      getAvailableModules: jest.fn(),
      canAccessModule: jest.fn(),
      getModulePermissions: jest.fn(),
      getDefaultModulePermissions: jest.fn(),
    };

    companyModuleAccessService = {
      getCompanyModules: jest.fn(),
      grantModuleToCompany: jest.fn(),
      revokeModuleFromCompany: jest.fn(),
      cleanupOrphanedPermissions: jest.fn(),
    };

    employeePermissionsService = {
      getEmployeeModules: jest.fn(),
      grantModuleToEmployee: jest.fn(),
      updateEmployeeModulePermissions: jest.fn(),
      revokeModuleFromEmployee: jest.fn(),
    };

    moduleDiscoveryService = {
      getAllModules: jest.fn(),
      getDiscoveryStats: jest.fn(),
      isDiscoveryComplete: jest.fn(),
      reloadModules: jest.fn(),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ModulesService,
          useFactory: () =>
            new ModulesService(
              moduleRepository as any,
              mockUserRepository as any,
              rbacService as any,
              companyModuleAccessService as any,
              employeePermissionsService as any,
              moduleDiscoveryService as any
            ),
        },
        { provide: getRepositoryToken(ModuleEntity), useValue: moduleRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: RBACService, useValue: rbacService },
        { provide: CompanyModuleAccessService, useValue: companyModuleAccessService },
        { provide: EmployeeModulePermissionsService, useValue: employeePermissionsService },
        { provide: ModuleDiscoveryService, useValue: moduleDiscoveryService },
      ],
    }).compile();

    service = testingModule.get(ModulesService);
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all modules ordered by createdAt DESC', async () => {
      const modules = [mockModule];
      moduleRepository.find.mockResolvedValue(modules);

      const result = await service.findAll();

      expect(result).toEqual(modules);
      expect(moduleRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getModulesForUser', () => {
    it('should return all modules for ADMIN user', async () => {
      moduleRepository.find.mockResolvedValue([mockModule]);

      const result = await service.getModulesForUser(adminUser);

      expect(result).toEqual([mockModule]);
      expect(moduleRepository.find).toHaveBeenCalled();
    });

    it('should return available modules for non-ADMIN user', async () => {
      rbacService.getAvailableModules.mockResolvedValue([mockModule] as any);

      const result = await service.getModulesForUser(ownerUser);

      expect(result).toEqual([mockModule]);
      expect(rbacService.getAvailableModules).toHaveBeenCalledWith(ownerUser.id);
    });
  });

  describe('findById', () => {
    it('should return module by ID', async () => {
      moduleRepository.findOne.mockResolvedValue(mockModule);

      const result = await service.findById('module-1');

      expect(result).toEqual(mockModule);
      expect(moduleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'module-1' },
      });
    });

    it('should throw NotFoundException when module not found', async () => {
      moduleRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new module', async () => {
      const dto = { name: 'Tasks', slug: 'tasks', description: 'Task management' };
      moduleRepository.findOne.mockResolvedValue(null);
      moduleRepository.create.mockReturnValue(mockModule);
      moduleRepository.save.mockResolvedValue(mockModule);

      const result = await service.create(dto as any);

      expect(result).toEqual(mockModule);
      expect(moduleRepository.create).toHaveBeenCalledWith(dto);
      expect(moduleRepository.save).toHaveBeenCalledWith(mockModule);
    });

    it('should throw ConflictException when slug already exists', async () => {
      const dto = { name: 'Tasks', slug: 'tasks' };
      moduleRepository.findOne.mockResolvedValue(mockModule);

      await expect(service.create(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update an existing module', async () => {
      const dto = { name: 'Updated Tasks' };
      const updated = { ...mockModule, name: 'Updated Tasks' } as ModuleEntity;
      moduleRepository.findOne.mockResolvedValue(mockModule);
      moduleRepository.save.mockResolvedValue(updated);

      const result = await service.update('module-1', dto as any);

      expect(result).toEqual(updated);
      expect(moduleRepository.save).toHaveBeenCalled();
    });
  });

  describe('softDeleteModule', () => {
    it('should set isActive to false', async () => {
      moduleRepository.findOne.mockResolvedValue({ ...mockModule });
      moduleRepository.save.mockResolvedValue({ ...mockModule, isActive: false } as ModuleEntity);

      const result = await service.softDeleteModule('module-1');

      expect(result.isActive).toBe(false);
      expect(moduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });

  describe('managePermission', () => {
    it('should grant module to company when ADMIN targets COMPANY', async () => {
      const dto = {
        targetType: PermissionTargetType.COMPANY,
        targetId: 'company-1',
        moduleSlug: 'tasks',
      };
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessService.grantModuleToCompany.mockResolvedValue({} as any);

      await service.managePermission(adminUser, dto as any);

      expect(companyModuleAccessService.grantModuleToCompany).toHaveBeenCalledWith(
        'company-1',
        mockModule.id
      );
    });

    it('should throw ForbiddenException when non-ADMIN targets COMPANY', async () => {
      const dto = {
        targetType: PermissionTargetType.COMPANY,
        targetId: 'company-1',
        moduleSlug: 'tasks',
      };

      await expect(service.managePermission(ownerUser, dto as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should grant module to employee when COMPANY_OWNER targets EMPLOYEE', async () => {
      const dto = {
        targetType: PermissionTargetType.EMPLOYEE,
        targetId: 'employee-1',
        moduleSlug: 'tasks',
        permissions: ['read', 'write'],
      };
      employeePermissionsService.grantModuleToEmployee.mockResolvedValue({} as any);

      await service.managePermission(ownerUser, dto as any);

      expect(employeePermissionsService.grantModuleToEmployee).toHaveBeenCalledWith(
        ownerUser.companyId,
        'employee-1',
        'tasks',
        { permissions: ['read', 'write'] }
      );
    });

    it('should throw BadRequestException when permissions missing for EMPLOYEE target', async () => {
      const dto = {
        targetType: PermissionTargetType.EMPLOYEE,
        targetId: 'employee-1',
        moduleSlug: 'tasks',
        permissions: [],
      };

      await expect(service.managePermission(ownerUser, dto as any)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('revokePermission', () => {
    it('should revoke module from company when ADMIN', async () => {
      const dto = {
        targetType: PermissionTargetType.COMPANY,
        targetId: 'company-1',
        moduleSlug: 'tasks',
      };
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessService.revokeModuleFromCompany.mockResolvedValue({} as any);

      await service.revokePermission(adminUser, dto as any);

      expect(companyModuleAccessService.revokeModuleFromCompany).toHaveBeenCalledWith(
        'company-1',
        mockModule.id
      );
    });

    it('should throw ForbiddenException when EMPLOYEE tries to revoke', async () => {
      const dto = {
        targetType: PermissionTargetType.EMPLOYEE,
        targetId: 'employee-1',
        moduleSlug: 'tasks',
      };

      await expect(service.revokePermission(employeeUser, dto as any)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getDiscoveredModules', () => {
    it('should return discovered modules from discovery service', () => {
      const discovered = [{ slug: 'tasks', name: 'Tasks' }];
      moduleDiscoveryService.getAllModules.mockReturnValue(discovered as any);

      const result = service.getDiscoveredModules();

      expect(result).toEqual(discovered);
    });
  });
});
