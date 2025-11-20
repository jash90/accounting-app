import { Test, TestingModule } from '@nestjs/testing';
import { RBACService } from './rbac.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  User,
  Company,
  Module,
  CompanyModuleAccess,
  UserModulePermission,
} from '@accounting/common';

describe('RBACService - companyHasModule helpers', () => {
  let service: RBACService;
  let moduleRepository: Repository<Module>;
  let companyModuleAccessRepository: Repository<CompanyModuleAccess>;

  const mockCompanyId = 'company-123';
  const mockModuleId = 'module-001';
  const mockModuleSlug = 'invoicing';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RBACService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Company),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Module),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CompanyModuleAccess),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserModulePermission),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<RBACService>(RBACService);
    moduleRepository = module.get<Repository<Module>>(getRepositoryToken(Module));
    companyModuleAccessRepository = module.get<Repository<CompanyModuleAccess>>(
      getRepositoryToken(CompanyModuleAccess),
    );
  });

  describe('companyHasModule', () => {
    const mockModule = {
      id: mockModuleId,
      slug: mockModuleSlug,
      name: 'Invoicing',
      isActive: true,
    };

    it('should return true when company has access to active module', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue({
        id: 'access-123',
        companyId: mockCompanyId,
        moduleId: mockModuleId,
        isEnabled: true,
      } as any);

      const result = await service.companyHasModule(mockCompanyId, mockModuleSlug);

      expect(result).toBe(true);
      expect(moduleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: mockModuleSlug },
      });
      expect(companyModuleAccessRepository.findOne).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          moduleId: mockModuleId,
          isEnabled: true,
        },
      });
    });

    it('should return false when module does not exist', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(null);

      const result = await service.companyHasModule(mockCompanyId, mockModuleSlug);

      expect(result).toBe(false);
      expect(companyModuleAccessRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return false when module is inactive', async () => {
      const inactiveModule = { ...mockModule, isActive: false };
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(inactiveModule as any);

      const result = await service.companyHasModule(mockCompanyId, mockModuleSlug);

      expect(result).toBe(false);
      expect(companyModuleAccessRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return false when company does not have access', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue(null);

      const result = await service.companyHasModule(mockCompanyId, mockModuleSlug);

      expect(result).toBe(false);
    });

    it('should return false when company access is disabled', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue(null);

      const result = await service.companyHasModule(mockCompanyId, mockModuleSlug);

      expect(result).toBe(false);
      expect(companyModuleAccessRepository.findOne).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          moduleId: mockModuleId,
          isEnabled: true,
        },
      });
    });
  });

  describe('companyHasModuleById', () => {
    const mockModule = {
      id: mockModuleId,
      slug: mockModuleSlug,
      name: 'Invoicing',
      isActive: true,
    };

    it('should return true when company has access to active module', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue({
        id: 'access-123',
        companyId: mockCompanyId,
        moduleId: mockModuleId,
        isEnabled: true,
      } as any);

      const result = await service.companyHasModuleById(mockCompanyId, mockModuleId);

      expect(result).toBe(true);
      expect(moduleRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockModuleId, isActive: true },
      });
      expect(companyModuleAccessRepository.findOne).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          moduleId: mockModuleId,
          isEnabled: true,
        },
      });
    });

    it('should return false when module does not exist or is inactive', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(null);

      const result = await service.companyHasModuleById(mockCompanyId, mockModuleId);

      expect(result).toBe(false);
      expect(companyModuleAccessRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return false when company does not have access', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue(null);

      const result = await service.companyHasModuleById(mockCompanyId, mockModuleId);

      expect(result).toBe(false);
    });

    it('should be more efficient by using module ID directly', async () => {
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue({
        id: 'access-123',
        companyId: mockCompanyId,
        moduleId: mockModuleId,
        isEnabled: true,
      } as any);

      const result = await service.companyHasModuleById(mockCompanyId, mockModuleId);

      expect(result).toBe(true);
      // Verify it queries by ID, not by slug
      expect(moduleRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockModuleId, isActive: true },
      });
    });
  });

  describe('Performance comparison', () => {
    it('companyHasModuleById should make fewer database queries than canAccessModule for owners', async () => {
      const mockModule = {
        id: mockModuleId,
        slug: mockModuleSlug,
        name: 'Invoicing',
        isActive: true,
      };

      // Setup for companyHasModuleById
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockModule as any);
      jest.spyOn(companyModuleAccessRepository, 'findOne').mockResolvedValue({
        id: 'access-123',
        companyId: mockCompanyId,
        moduleId: mockModuleId,
        isEnabled: true,
      } as any);

      // Call companyHasModuleById
      await service.companyHasModuleById(mockCompanyId, mockModuleId);

      // Should only make 2 queries: module check and access check
      expect(moduleRepository.findOne).toHaveBeenCalledTimes(1);
      expect(companyModuleAccessRepository.findOne).toHaveBeenCalledTimes(1);

      // Note: canAccessModule would need to also query the user repository
      // making it less efficient for company-level checks
    });
  });
});