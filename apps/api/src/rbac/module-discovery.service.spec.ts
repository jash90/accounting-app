import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, beforeEach, mock, spyOn, Mock } from 'bun:test';
import { ModuleDiscoveryService, ModuleConfig } from '@accounting/rbac';
import { Module, ModuleSource } from '@accounting/common';
import * as fs from 'fs';

describe('ModuleDiscoveryService', () => {
  let service: ModuleDiscoveryService;

  const mockModuleRepository = {
    findOne: mock(() => {}),
    find: mock(() => {}),
    create: mock(() => {}),
    save: mock(() => {}),
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

  // Spies for fs module
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readdirSyncSpy: ReturnType<typeof spyOn>;
  let readFileSyncSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    // Reset mocks
    (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockReset();
    (mockModuleRepository.find as Mock<typeof mockModuleRepository.find>).mockReset();
    (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockReset();
    (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockReset();

    // Create spies for fs module
    existsSyncSpy = spyOn(fs, 'existsSync');
    readdirSyncSpy = spyOn(fs, 'readdirSync');
    readFileSyncSpy = spyOn(fs, 'readFileSync');

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
      existsSyncSpy.mockReturnValue(false);

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should discover modules from valid module.json files', async () => {
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

      const result = await service.discoverModules();

      expect(result.length).toBe(1);
      expect(result[0].slug).toBe('test-module');
      expect(result[0].name).toBe('Test Module');
      expect(result[0].permissions).toEqual(['read', 'write']);
    });

    it('should skip directories without module.json', async () => {
      existsSyncSpy.mockImplementation((filePath: unknown) => {
        if (typeof filePath === 'string' && filePath.endsWith('module.json')) {
          return false;
        }
        return true;
      });
      readdirSyncSpy.mockReturnValue([
        { name: 'empty-module', isDirectory: () => true },
      ] as any);

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should skip modules with invalid configuration', async () => {
      const invalidConfig = { ...mockModuleConfig, slug: '' };
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(invalidConfig));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'bad-json', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue('{ invalid json }');

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });

  describe('getModuleBySlug', () => {
    beforeEach(async () => {
      // Simulate discovery
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
    });

    it('should create new module in database if not exists', async () => {
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(null);
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
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(existingModule);
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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockImplementation((filePath: unknown) => {
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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      const stats = service.getDiscoveryStats();

      expect(stats.discoveredCount).toBe(1);
      expect(stats.modulesList).toContain('test-module');
    });
  });

  describe('reloadModules', () => {
    it('should clear cache and rediscover modules', async () => {
      // Initial discovery
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));

      await service.discoverModules();
      expect(service.getAllModules().length).toBe(1);

      // Add new module and reload
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
        { name: 'new-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockImplementation((filePath: unknown) => {
        if (typeof filePath === 'string' && filePath.includes('new-module')) {
          return JSON.stringify({ ...mockModuleConfig, slug: 'new-module', name: 'New Module' });
        }
        return JSON.stringify(mockModuleConfig);
      });
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(null);
      (mockModuleRepository.create as Mock<typeof mockModuleRepository.create>).mockImplementation((dto: unknown) => dto);
      (mockModuleRepository.save as Mock<typeof mockModuleRepository.save>).mockImplementation((dto: unknown) => Promise.resolve(dto));

      await service.reloadModules();
      expect(service.getAllModules().length).toBe(2);
    });
  });

  describe('concurrent discoverModules', () => {
    it('should handle concurrent discovery calls without race conditions', async () => {
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'module-a', isDirectory: () => true },
        { name: 'module-b', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockImplementation((filePath: unknown) => {
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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'test-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockModuleConfig));
      (mockModuleRepository.findOne as Mock<typeof mockModuleRepository.findOne>).mockResolvedValue(null);
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
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(invalidSlug));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject invalid version format', async () => {
      const invalidVersion = { ...mockModuleConfig, version: '1.0' };
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(invalidVersion));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });

    it('should reject empty permissions array', async () => {
      const noPermissions = { ...mockModuleConfig, permissions: [] };
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue([
        { name: 'invalid-module', isDirectory: () => true },
      ] as any);
      readFileSyncSpy.mockReturnValue(JSON.stringify(noPermissions));

      const result = await service.discoverModules();

      expect(result).toEqual([]);
    });
  });
});
