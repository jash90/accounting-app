import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module, ModuleSource } from '@accounting/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for the module.json configuration file
 */
export interface ModuleConfig {
  slug: string;
  name: string;
  description?: string;
  version: string;
  isActive?: boolean;
  permissions: string[];
  defaultPermissions?: string[];
  icon?: string;
  category?: string;
  dependencies?: string[];
  config?: Record<string, unknown>;
}

/**
 * Discovered module with file path information
 */
export interface DiscoveredModule extends ModuleConfig {
  configPath: string;
  directoryPath: string;
}

@Injectable()
export class ModuleDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ModuleDiscoveryService.name);

  /**
   * In-memory cache of discovered modules
   * Key: module slug, Value: module config
   */
  private moduleCache = new Map<string, DiscoveredModule>();

  /**
   * Flag to track if discovery has been completed
   */
  private discoveryComplete = false;

  /**
   * Base path to search for modules
   * Can be configured via environment variable
   */
  private readonly modulesBasePath: string;

  constructor(
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>
  ) {
    // Default to libs/modules relative to project root
    // In production, this might be configured differently
    this.modulesBasePath =
      process.env['MODULES_PATH'] || path.resolve(process.cwd(), 'libs', 'modules');
  }

  /**
   * Called when NestJS module initializes
   * Performs initial module discovery and database sync
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Starting module discovery...');

    try {
      await this.discoverModules();
      await this.syncWithDatabase();
      this.discoveryComplete = true;
      this.logger.log(`Module discovery complete. Found ${this.moduleCache.size} modules.`);
    } catch (error) {
      this.logger.error('Failed to complete module discovery', error);
      // Don't throw - allow app to start with existing DB modules
      this.discoveryComplete = true;
    }
  }

  /**
   * Discover all modules from file system
   * Scans libs/modules/{module-name}/module.json files
   */
  async discoverModules(): Promise<DiscoveredModule[]> {
    const discovered: DiscoveredModule[] = [];

    // Check if modules directory exists
    if (!fs.existsSync(this.modulesBasePath)) {
      this.logger.warn(`Modules directory not found: ${this.modulesBasePath}`);
      return discovered;
    }

    // Get all directories in the modules folder
    const entries = fs.readdirSync(this.modulesBasePath, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory());

    for (const dir of directories) {
      const modulePath = path.join(this.modulesBasePath, dir.name);
      const configPath = path.join(modulePath, 'module.json');

      // Check if module.json exists
      if (!fs.existsSync(configPath)) {
        this.logger.debug(`No module.json found in ${dir.name}, skipping`);
        continue;
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: ModuleConfig = JSON.parse(configContent);

        // Validate required fields
        if (!this.validateModuleConfig(config, dir.name)) {
          continue;
        }

        // Validate slug matches directory name
        if (config.slug !== dir.name) {
          this.logger.warn(
            `Module slug "${config.slug}" doesn't match directory name "${dir.name}". Using directory name.`
          );
          config.slug = dir.name;
        }

        const discoveredModule: DiscoveredModule = {
          ...config,
          configPath,
          directoryPath: modulePath,
        };

        discovered.push(discoveredModule);
        this.moduleCache.set(config.slug, discoveredModule);

        this.logger.log(`Discovered module: ${config.name} (${config.slug}) v${config.version}`);
      } catch (error) {
        this.logger.error(`Failed to parse module.json in ${dir.name}:`, error);
      }
    }

    return discovered;
  }

  /**
   * Validate module configuration has required fields
   */
  private validateModuleConfig(config: ModuleConfig, directoryName: string): boolean {
    const errors: string[] = [];

    if (!config.slug) {
      errors.push('slug is required');
    } else if (!/^[a-z][a-z0-9-]*$/.test(config.slug)) {
      errors.push(
        'slug must start with lowercase letter and contain only lowercase letters, numbers, and hyphens'
      );
    }

    if (!config.name) {
      errors.push('name is required');
    }

    if (!config.version) {
      errors.push('version is required');
    } else if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('version must be in semver format (x.y.z)');
    }

    if (
      !config.permissions ||
      !Array.isArray(config.permissions) ||
      config.permissions.length === 0
    ) {
      errors.push('permissions array is required and must not be empty');
    }

    if (errors.length > 0) {
      this.logger.error(`Invalid module.json in ${directoryName}: ${errors.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Sync discovered modules with database
   * Creates new modules, updates existing ones
   */
  async syncWithDatabase(): Promise<void> {
    for (const [slug, discoveredModule] of this.moduleCache) {
      try {
        let existingModule = await this.moduleRepository.findOne({
          where: { slug },
        });

        if (existingModule) {
          // Update existing module
          existingModule.name = discoveredModule.name;
          existingModule.description = discoveredModule.description || null;
          existingModule.version = discoveredModule.version;
          existingModule.isActive = discoveredModule.isActive ?? true;
          existingModule.source = ModuleSource.FILE;
          existingModule.permissions = discoveredModule.permissions;
          existingModule.defaultPermissions = discoveredModule.defaultPermissions || null;
          existingModule.configPath = discoveredModule.configPath;
          existingModule.icon = discoveredModule.icon || null;
          existingModule.category = discoveredModule.category || null;
          existingModule.dependencies = discoveredModule.dependencies || null;
          existingModule.config = discoveredModule.config || null;

          await this.moduleRepository.save(existingModule);
          this.logger.log(`Updated module in database: ${slug}`);
        } else {
          // Create new module
          const newModule = this.moduleRepository.create({
            name: discoveredModule.name,
            slug: discoveredModule.slug,
            description: discoveredModule.description || null,
            version: discoveredModule.version,
            isActive: discoveredModule.isActive ?? true,
            source: ModuleSource.FILE,
            permissions: discoveredModule.permissions,
            defaultPermissions: discoveredModule.defaultPermissions || null,
            configPath: discoveredModule.configPath,
            icon: discoveredModule.icon || null,
            category: discoveredModule.category || null,
            dependencies: discoveredModule.dependencies || null,
            config: discoveredModule.config || null,
          });

          await this.moduleRepository.save(newModule);
          this.logger.log(`Created new module in database: ${slug}`);
        }
      } catch (error) {
        this.logger.error(`Failed to sync module ${slug} with database:`, error);
      }
    }
  }

  /**
   * Get a discovered module by slug from cache
   */
  getModuleBySlug(slug: string): DiscoveredModule | undefined {
    return this.moduleCache.get(slug);
  }

  /**
   * Get all discovered modules from cache
   */
  getAllModules(): DiscoveredModule[] {
    return Array.from(this.moduleCache.values());
  }

  /**
   * Check if a module exists (discovered from file)
   */
  moduleExists(slug: string): boolean {
    return this.moduleCache.has(slug);
  }

  /**
   * Get available permissions for a module
   */
  getModulePermissions(slug: string): string[] | null {
    const module = this.moduleCache.get(slug);
    return module?.permissions || null;
  }

  /**
   * Get default permissions for a module
   */
  getDefaultPermissions(slug: string): string[] | null {
    const module = this.moduleCache.get(slug);
    return module?.defaultPermissions || null;
  }

  /**
   * Get module dependencies
   */
  getModuleDependencies(slug: string): string[] | null {
    const module = this.moduleCache.get(slug);
    return module?.dependencies || null;
  }

  /**
   * Reload modules from file system
   * Useful for hot-reloading during development
   */
  async reloadModules(): Promise<DiscoveredModule[]> {
    this.logger.log('Reloading modules...');
    this.moduleCache.clear();
    this.discoveryComplete = false;

    const discovered = await this.discoverModules();
    await this.syncWithDatabase();
    this.discoveryComplete = true;

    this.logger.log(`Module reload complete. Found ${this.moduleCache.size} modules.`);
    return discovered;
  }

  /**
   * Check if initial discovery has been completed
   */
  isDiscoveryComplete(): boolean {
    return this.discoveryComplete;
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): {
    discoveredCount: number;
    modulesList: string[];
    modulesBasePath: string;
  } {
    return {
      discoveredCount: this.moduleCache.size,
      modulesList: Array.from(this.moduleCache.keys()),
      modulesBasePath: this.modulesBasePath,
    };
  }
}
