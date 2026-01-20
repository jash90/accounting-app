import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModuleDiscoveryService, ModuleConfig } from '@accounting/rbac';
import { Module, ModuleSource } from '@accounting/common';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ModuleDiscoveryService', () => {
  let service: ModuleDiscoveryService;

  const mockModuleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockModuleConfig: ModuleConfig = {
    slug: 'test-module',
    name: 'Test Module',
    description: 'A test module',
    version: '1.0.0',
    isActive: true,
    permissions: ['read', 'write'],
    defaultPermissions: ['read'],
    icon: 'test-icon',
    category: 'utilities',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleDiscoveryService,
        {
          provide: getRepositoryToken(Module),
          useValue: mockModuleRepository,
        },
      ],
    }).compile();

    service = module.get<ModuleDiscoveryService>(ModuleDiscoveryService);
  });

  describe('discoverModules', () => {
    it('should return empty array when modules directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should discover modules from valid module.json files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      const result = await service.discoverModules();

      expect(result.length).toBe(1);
      expect(result[0].slug).toBe('test-module');
      expect(result[0].name).toBe('Test Module');
      expect(result[0].permissions).toEqual(['read', 'write']);
    });

    it('should skip directories without module.json', async () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.endsWith('module.json')) {
          return false;
        }
        return true;
      });
      mockFs.readdirSync.mockReturnValue([
        { name: 'empty-module', isDirectory: () => true },
      ] as any);

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should skip modules with invalid configuration', async () => {
      const invalidConfig = { ...mockModuleConfig, slug: '' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'bad-json', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });

  describe('getModuleBySlug', () => {
    beforeEach(async () => {
      // Simulate discovery
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should return module from cache', () => {
      const result = service.getModuleBySlug('test-module');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-module');
    });

    it('should return undefined for non-existent module', () => {
      const result = service.getModuleBySlug('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('moduleExists', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should return true for existing module', () => {
      expect(service.moduleExists('test-module')).toBe(true);
    });

    it('should return false for non-existent module', () => {
      expect(service.moduleExists('non-existent')).toBe(false);
    });
  });

  describe('getModulePermissions', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should return permissions for existing module', () => {
      const permissions = service.getModulePermissions('test-module');

      expect(permissions).toEqual(['read', 'write']);
    });

    it('should return null for non-existent module', () => {
      const permissions = service.getModulePermissions('non-existent');

      expect(permissions).toBeNull();
    });
  });

  describe('getDefaultPermissions', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should return default permissions for existing module', () => {
      const permissions = service.getDefaultPermissions('test-module');

      expect(permissions).toEqual(['read']);
    });

    it('should return null for non-existent module', () => {
      const permissions = service.getDefaultPermissions('non-existent');

      expect(permissions).toBeNull();
    });
  });

  describe('syncWithDatabase', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should create new module in database if not exists', async () => {
      mockModuleRepository.findOne.mockResolvedValue(null);
      mockModuleRepository.create.mockReturnValue({
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });
      mockModuleRepository.save.mockResolvedValue({
        id: '123',
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });

      await service.syncWithDatabase();

      expect(mockModuleRepository.create).toHaveBeenCalled();
      expect(mockModuleRepository.save).toHaveBeenCalled();
    });

    it('should update existing module in database', async () => {
      const existingModule = {
        id: '123',
        slug: 'test-module',
        name: 'Old Name',
        source: ModuleSource.LEGACY,
      };
      mockModuleRepository.findOne.mockResolvedValue(existingModule);
      mockModuleRepository.save.mockResolvedValue({
        ...existingModule,
        name: 'Test Module',
        source: ModuleSource.FILE,
      });

      await service.syncWithDatabase();

      expect(mockModuleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Module',
          source: ModuleSource.FILE,
        })
      );
    });
  });

  describe('getAllModules', () => {
    it('should return all discovered modules', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.includes('module-a')) {
          return JSON.stringify({ ...mockModuleConfig, slug: 'module-a', name: 'Module A' });
        }
        return JSON.stringify({ ...mockModuleConfig, slug: 'module-b', name: 'Module B' });
      });

      await service.discoverModules();
      const modules = service.getAllModules();

      expect(modules.length).toBe(2);
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return correct statistics', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      const stats = service.getDiscoveryStats();

      expect(stats.discoveredCount).toBe(1);
      expect(stats.modulesList).toContain('test-module');
    });
  });

  describe('reloadModules', () => {
    it('should clear cache and rediscover modules', async () => {
      // Initial discovery
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      expect(service.getAllModules().length).toBe(1);

      // Add new module and reload
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
        { name: 'new-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.includes('new-module')) {
          return JSON.stringify({ ...mockModuleConfig, slug: 'new-module', name: 'New Module' });
        }
        return JSON.stringify(mockModuleConfig);
      });
      mockModuleRepository.findOne.mockResolvedValue(null);
      mockModuleRepository.create.mockImplementation((dto) => dto);
      mockModuleRepository.save.mockImplementation((dto) => Promise.resolve(dto));

      await service.reloadModules();
      expect(service.getAllModules().length).toBe(2);
    });
  });

  describe('concurrent discoverModules', () => {
    it('should handle concurrent discovery calls without race conditions', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (typeof filePath === 'string' && filePath.includes('module-a')) {
          return JSON.stringify({ ...mockModuleConfig, slug: 'module-a', name: 'Module A' });
        }
        return JSON.stringify({ ...mockModuleConfig, slug: 'module-b', name: 'Module B' });
      });

      // Call discoverModules multiple times concurrently
      const results = await Promise.all([
        service.discoverModules(),
        service.discoverModules(),
        service.discoverModules(),
      ]);

      // All calls should return the same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0].length).toBe(2);

      // Cache should be consistent
      const modules = service.getAllModules();
      expect(modules.length).toBe(2);
    });

    it('should handle concurrent sync operations gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockModuleConfig));
      mockModuleRepository.findOne.mockResolvedValue(null);
      mockModuleRepository.create.mockReturnValue({
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });
      mockModuleRepository.save.mockResolvedValue({
        id: '123',
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });

      await service.discoverModules();

      // Call syncWithDatabase multiple times concurrently
      await Promise.all([
        service.syncWithDatabase(),
        service.syncWithDatabase(),
        service.syncWithDatabase(),
      ]);

      // Should complete without errors
      expect(service.getAllModules().length).toBe(1);
    });
  });

  describe('validation', () => {
    it('should reject invalid slug format', async () => {
      const invalidSlug = { ...mockModuleConfig, slug: 'Invalid_Slug!' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidSlug));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject invalid version format', async () => {
      const invalidVersion = { ...mockModuleConfig, version: '1.0' };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidVersion));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject empty permissions array', async () => {
      const noPermissions = { ...mockModuleConfig, permissions: [] };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(noPermissions));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });
});
