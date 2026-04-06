import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';

import { Company, CompanyModuleAccess, Module as ModuleEntity } from '@accounting/common';

import { CompanyModuleAccessService } from './company-module-access.service';
import { createMockRepository } from '../../testing/mock-helpers';

describe('CompanyModuleAccessService', () => {
  let testingModule: TestingModule;
  let service: CompanyModuleAccessService;
  let moduleRepository: jest.Mocked<Repository<ModuleEntity>>;
  let companyModuleAccessRepository: jest.Mocked<Repository<CompanyModuleAccess>>;
  let companyRepository: jest.Mocked<Repository<Company>>;

  const companyId = 'company-1';
  const moduleId = 'module-1';

  const mockCompany: Company = {
    id: companyId,
    name: 'Test Company',
  } as Company;

  const mockModule: ModuleEntity = {
    id: moduleId,
    name: 'Tasks',
    slug: 'tasks',
    isActive: true,
  } as ModuleEntity;

  const mockAccess: CompanyModuleAccess = {
    id: 'access-1',
    companyId,
    moduleId,
    isEnabled: true,
  } as CompanyModuleAccess;

  beforeAll(async () => {
    moduleRepository = createMockRepository<ModuleEntity>();

    companyModuleAccessRepository = createMockRepository<CompanyModuleAccess>({
      manager: {
        transaction: jest.fn(),
      },
    });

    companyRepository = createMockRepository<Company>();

    testingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CompanyModuleAccessService,
          useFactory: () =>
            new CompanyModuleAccessService(
              moduleRepository as any,
              companyModuleAccessRepository as any,
              companyRepository as any
            ),
        },
        { provide: getRepositoryToken(ModuleEntity), useValue: moduleRepository },
        {
          provide: getRepositoryToken(CompanyModuleAccess),
          useValue: companyModuleAccessRepository,
        },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
      ],
    }).compile();

    service = testingModule.get(CompanyModuleAccessService);
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyModules', () => {
    it('should return all module accesses for a company', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      companyModuleAccessRepository.find.mockResolvedValue([mockAccess]);

      const result = await service.getCompanyModules(companyId);

      expect(result).toEqual([mockAccess]);
      expect(companyModuleAccessRepository.find).toHaveBeenCalledWith({
        where: { companyId },
        relations: ['module'],
      });
    });

    it('should throw NotFoundException when company not found', async () => {
      companyRepository.findOne.mockResolvedValue(null);

      await expect(service.getCompanyModules('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('grantModuleToCompany', () => {
    it('should create new access record when none exists', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessRepository.findOne.mockResolvedValue(null);
      companyModuleAccessRepository.create.mockReturnValue(mockAccess);
      companyModuleAccessRepository.save.mockResolvedValue(mockAccess);

      const result = await service.grantModuleToCompany(companyId, moduleId);

      expect(result).toEqual(mockAccess);
      expect(companyModuleAccessRepository.create).toHaveBeenCalledWith({
        companyId,
        moduleId,
        isEnabled: true,
      });
    });

    it('should re-enable existing disabled access', async () => {
      const disabledAccess = { ...mockAccess, isEnabled: false } as CompanyModuleAccess;
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessRepository.findOne.mockResolvedValue(disabledAccess);
      companyModuleAccessRepository.save.mockResolvedValue({
        ...disabledAccess,
        isEnabled: true,
      } as CompanyModuleAccess);

      const result = await service.grantModuleToCompany(companyId, moduleId);

      expect(result.isEnabled).toBe(true);
      expect(companyModuleAccessRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when company not found', async () => {
      companyRepository.findOne.mockResolvedValue(null);

      await expect(service.grantModuleToCompany('nonexistent', moduleId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when module not found', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(null);

      await expect(service.grantModuleToCompany(companyId, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('revokeModuleFromCompany', () => {
    it('should disable access and cascade delete employee permissions', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessRepository.findOne.mockResolvedValue({ ...mockAccess });

      const mockManager = {
        save: jest.fn().mockResolvedValue({ ...mockAccess, isEnabled: false }),
        find: jest.fn().mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }]),
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
        }),
      };
      (companyModuleAccessRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.revokeModuleFromCompany(companyId, moduleId);

      expect(result.isEnabled).toBe(false);
      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when access record not found', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeModuleFromCompany(companyId, moduleId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should skip employee cleanup when no employees exist', async () => {
      companyRepository.findOne.mockResolvedValue(mockCompany);
      moduleRepository.findOne.mockResolvedValue(mockModule);
      companyModuleAccessRepository.findOne.mockResolvedValue({ ...mockAccess });

      const mockManager = {
        save: jest.fn().mockResolvedValue({ ...mockAccess, isEnabled: false }),
        find: jest.fn().mockResolvedValue([]), // no employees
        createQueryBuilder: jest.fn(),
      };
      (companyModuleAccessRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      await service.revokeModuleFromCompany(companyId, moduleId);

      expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOrphanedPermissions', () => {
    it('should delete orphaned permissions for disabled modules', async () => {
      const disabledAccess = {
        companyId,
        moduleId,
        isEnabled: false,
        company: { name: 'Test Company' },
        module: { name: 'Tasks' },
      } as unknown as CompanyModuleAccess;

      const mockManager = {
        find: jest
          .fn()
          .mockResolvedValueOnce([disabledAccess]) // disabled accesses
          .mockResolvedValueOnce([{ id: 'emp-1' }]), // employees
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 3 }),
        }),
      };
      (companyModuleAccessRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.cleanupOrphanedPermissions();

      expect(result.deletedCount).toBe(3);
      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].deletedPermissions).toBe(3);
    });

    it('should return zero when no orphaned permissions exist', async () => {
      const mockManager = {
        find: jest.fn().mockResolvedValue([]), // no disabled accesses
      };
      (companyModuleAccessRepository.manager.transaction as jest.Mock).mockImplementation(
        async (cb: any) => cb(mockManager)
      );

      const result = await service.cleanupOrphanedPermissions();

      expect(result.deletedCount).toBe(0);
      expect(result.companies).toHaveLength(0);
    });
  });
});
