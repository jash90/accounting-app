import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { afterEach, beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';

import { Module, ModuleSource } from '@accounting/common';
import { ModuleDiscoveryService, type ModuleConfig } from '@accounting/rbac';

// Mock fs/promises at module level so the SWC-transpiled service picks it up
const mockAccess = mock(() => Promise.resolve());
const mockReaddir = mock(() => Promise.resolve([]));
const mockReadFile = mock(() => Promise.resolve('{}'));

mock.module('fs/promises', () => ({
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

describe('ModuleDiscoveryService', () => {
  let service: ModuleDiscoveryService;
  let testModule: TestingModule;

  const mockModuleRepository = {
    findOne: mock(() => {}),
    find: mock(() => Promise.resolve([])),
    create: mock(() => {}),
    save: mock(() => {}),
    remove: mock(() => {}),
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
    // Reset all mocks
    mockAccess.mockReset();
    mockReaddir.mockReset();
    mockReadFile.mockReset();
    (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockReset();
    (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>)
      .mockReset()
      .mockResolvedValue([]);
    (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockReset();
    (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockReset();
    (mockModuleRepository.remove as Mock<typeof mockModuleRepository.remove>).mockReset();

    // Default: modules directory doesn't exist (prevents onModuleInit from reading disk)
    mockAccess.mockRejectedValue(new Error('ENOENT'));
    mockReaddir.mockResolvedValue([]);

    testModule = await Test.createTestingModule({
      providers: [
        ModuleDiscoveryService,
        {
          provide: getRepositoryToken(Module),
          useValue: mockModuleRepository,
        },
      ],
    }).compile();

    // Initialize (triggers onModuleInit which calls discoverModules - mocked to find nothing)
    await testModule.init();

    service = testModule.get<ModuleDiscoveryService>(ModuleDiscoveryService);
  });

  afterEach(async () => {
    await testModule.close();
  });

  describe('discoverModules', () => {
    it('should return empty array when modules directory does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should discover modules from valid module.json files', async () => {
      // First call: check directory exists; second call: check module.json exists
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

      const result = await service.discoverModules();

      expect(result.length).toBe(1);
      expect(result[0].slug).toBe('test-module');
      expect(result[0].name).toBe('Test Module');
      expect(result[0].permissions).toEqual(['read', 'write']);
    });

    it('should skip directories without module.json', async () => {
      // Directory exists but module.json doesn't
      let callCount = 0;
      mockAccess.mockImplementation(() => {
        callCount++;
        // First call: base dir exists; second call: module.json doesn't
        if (callCount === 1) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([{ name: 'empty-module', isDirectory: () => true }] as any);

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should skip modules with invalid configuration', async () => {
      const invalidConfig = { ...mockModuleConfig, slug: '' };
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'invalid-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'bad-json', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue('{ invalid json }');

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });

  describe('getModuleBySlug', () => {
    beforeEach(async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

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
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

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
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

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
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

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
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should create new module in database if not exists', async () => {
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(
        null
      );
      (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>).mockResolvedValue([]);
      (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockReturnValue({
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });
      (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockResolvedValue({
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
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(
        existingModule
      );
      (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>).mockResolvedValue([]);
      (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockResolvedValue({
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
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      mockReadFile.mockImplementation((filePath: unknown) => {
        if (typeof filePath === 'string' && filePath.includes('module-a')) {
          return Promise.resolve(
            JSON.stringify({ ...mockModuleConfig, slug: 'module-a', name: 'Module A' })
          );
        }
        return Promise.resolve(
          JSON.stringify({ ...mockModuleConfig, slug: 'module-b', name: 'Module B' })
        );
      });

      await service.discoverModules();
      const modules = service.getAllModules();

      expect(modules.length).toBe(2);
    });
  });

  describe('getDiscoveryStats', () => {
    it('should return correct statistics', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      const stats = service.getDiscoveryStats();

      expect(stats.discoveredCount).toBe(1);
      expect(stats.modulesList).toContain('test-module');
    });
  });

  describe('reloadModules', () => {
    it('should clear cache and rediscover modules', async () => {
      // Initial discovery
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      expect(service.getAllModules().length).toBe(1);

      // Add new module and reload
      mockReaddir.mockResolvedValue([
        { name: 'test-module', isDirectory: () => true },
        { name: 'new-module', isDirectory: () => true },
      ] as any);
      mockReadFile.mockImplementation((filePath: unknown) => {
        if (typeof filePath === 'string' && filePath.includes('new-module')) {
          return Promise.resolve(
            JSON.stringify({ ...mockModuleConfig, slug: 'new-module', name: 'New Module' })
          );
        }
        return Promise.resolve(JSON.stringify(mockModuleConfig));
      });
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(
        null
      );
      (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>).mockResolvedValue([]);
      (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockImplementation(
        (dto: unknown) => dto
      );
      (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockImplementation(
        (dto: unknown) => Promise.resolve(dto)
      );

      await service.reloadModules();
      expect(service.getAllModules().length).toBe(2);
    });
  });

  describe('concurrent discoverModules', () => {
    it('should handle concurrent discovery calls without race conditions', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      mockReadFile.mockImplementation((filePath: unknown) => {
        if (typeof filePath === 'string' && filePath.includes('module-a')) {
          return Promise.resolve(
            JSON.stringify({ ...mockModuleConfig, slug: 'module-a', name: 'Module A' })
          );
        }
        return Promise.resolve(
          JSON.stringify({ ...mockModuleConfig, slug: 'module-b', name: 'Module B' })
        );
      });

      const results = await Promise.all([
        service.discoverModules(),
        service.discoverModules(),
        service.discoverModules(),
      ]);

      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0].length).toBe(2);

      const modules = service.getAllModules();
      expect(modules.length).toBe(2);
    });

    it('should handle concurrent sync operations gracefully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'test-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(mockModuleConfig));
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(
        null
      );
      (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>).mockResolvedValue([]);
      (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockReturnValue({
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });
      (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockResolvedValue({
        id: '123',
        ...mockModuleConfig,
        source: ModuleSource.FILE,
      });

      await service.discoverModules();

      await Promise.all([
        service.syncWithDatabase(),
        service.syncWithDatabase(),
        service.syncWithDatabase(),
      ]);

      expect(service.getAllModules().length).toBe(1);
    });
  });

  describe('validation', () => {
    it('should reject invalid slug format', async () => {
      const invalidSlug = { ...mockModuleConfig, slug: 'Invalid_Slug!' };
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'invalid-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidSlug));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject invalid version format', async () => {
      const invalidVersion = { ...mockModuleConfig, version: '1.0' };
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'invalid-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidVersion));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject empty permissions array', async () => {
      const noPermissions = { ...mockModuleConfig, permissions: [] };
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'invalid-module', isDirectory: () => true }] as any);
      mockReadFile.mockResolvedValue(JSON.stringify(noPermissions));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });
});
