import { Injectable, ForbiddenException, NotFoundException, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  User,
  Company,
  Module,
  CompanyModuleAccess,
  UserModulePermission,
  UserRole,
} from '@accounting/common';
import { ModuleDiscoveryService } from './module-discovery.service';

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);

  /**
   * In-memory cache for module lookups
   * Key: slug, Value: { module, timestamp }
   */
  private moduleCache = new Map<string, { module: Module; timestamp: number }>();

  /**
   * Cache TTL in milliseconds (5 minutes)
   */
  private readonly cacheTTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Module)
    private moduleRepository: Repository<Module>,
    @InjectRepository(CompanyModuleAccess)
    private companyModuleAccessRepository: Repository<CompanyModuleAccess>,
    @InjectRepository(UserModulePermission)
    private userModulePermissionRepository: Repository<UserModulePermission>,
    @Optional()
    private moduleDiscoveryService?: ModuleDiscoveryService,
  ) {}

  async canAccessModule(userId: string, moduleSlug: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // ADMIN has access to everything (but not to business data)
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Find module
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (!module || !module.isActive) {
      return false;
    }

    // COMPANY_OWNER has access if module is enabled for their company
    if (user.role === UserRole.COMPANY_OWNER && user.companyId) {
      const companyAccess = await this.companyModuleAccessRepository.findOne({
        where: {
          companyId: user.companyId,
          moduleId: module.id,
          isEnabled: true,
        },
      });
      return !!companyAccess;
    }

    // EMPLOYEE has access if they have explicit permission
    if (user.role === UserRole.EMPLOYEE && user.companyId) {
      // First check if company has access
      const companyAccess = await this.companyModuleAccessRepository.findOne({
        where: {
          companyId: user.companyId,
          moduleId: module.id,
          isEnabled: true,
        },
      });

      if (!companyAccess) {
        return false;
      }

      // Then check if user has explicit permission
      const userPermission = await this.userModulePermissionRepository.findOne({
        where: {
          userId: user.id,
          moduleId: module.id,
        },
      });

      return !!userPermission;
    }

    return false;
  }

  async hasPermission(
    userId: string,
    moduleSlug: string,
    permission: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // ADMIN has all permissions (but not to business data)
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Find module
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (!module || !module.isActive) {
      return false;
    }

    // COMPANY_OWNER has full permissions to enabled modules
    if (user.role === UserRole.COMPANY_OWNER && user.companyId) {
      const companyAccess = await this.companyModuleAccessRepository.findOne({
        where: {
          companyId: user.companyId,
          moduleId: module.id,
          isEnabled: true,
        },
      });
      return !!companyAccess;
    }

    // EMPLOYEE permissions are based on explicit grants
    if (user.role === UserRole.EMPLOYEE && user.companyId) {
      const userPermission = await this.userModulePermissionRepository.findOne({
        where: {
          userId: user.id,
          moduleId: module.id,
        },
      });

      if (!userPermission) {
        return false;
      }

      return userPermission.permissions.includes(permission);
    }

    return false;
  }

  async grantModuleAccess(
    granterId: string,
    targetId: string,
    moduleSlug: string,
    permissions: string[],
  ): Promise<void> {
    const granter = await this.userRepository.findOne({
      where: { id: granterId },
    });

    if (!granter) {
      throw new NotFoundException('Granter user not found');
    }

    const target = await this.userRepository.findOne({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    // Find module
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // ADMIN can grant access to any company
    if (granter.role === UserRole.ADMIN) {
      // ADMIN grants access at company level
      if (target.companyId) {
        let companyAccess = await this.companyModuleAccessRepository.findOne({
          where: {
            companyId: target.companyId,
            moduleId: module.id,
          },
        });

        if (!companyAccess) {
          companyAccess = this.companyModuleAccessRepository.create({
            companyId: target.companyId,
            moduleId: module.id,
            isEnabled: true,
          });
          await this.companyModuleAccessRepository.save(companyAccess);
        } else if (!companyAccess.isEnabled) {
          companyAccess.isEnabled = true;
          await this.companyModuleAccessRepository.save(companyAccess);
        }
      }
      return;
    }

    // COMPANY_OWNER can grant access to employees in their company
    if (granter.role === UserRole.COMPANY_OWNER) {
      if (!granter.companyId || granter.companyId !== target.companyId) {
        throw new ForbiddenException('Cannot grant access to users outside your company');
      }

      // Check if company has access to this module
      const companyAccess = await this.companyModuleAccessRepository.findOne({
        where: {
          companyId: granter.companyId,
          moduleId: module.id,
          isEnabled: true,
        },
      });

      if (!companyAccess) {
        throw new ForbiddenException('Company does not have access to this module');
      }

      // Grant permission to employee
      let userPermission = await this.userModulePermissionRepository.findOne({
        where: {
          userId: target.id,
          moduleId: module.id,
        },
      });

      if (userPermission) {
        userPermission.permissions = permissions;
        userPermission.grantedById = granter.id;
      } else {
        userPermission = this.userModulePermissionRepository.create({
          userId: target.id,
          moduleId: module.id,
          permissions,
          grantedById: granter.id,
        });
      }

      await this.userModulePermissionRepository.save(userPermission);
      return;
    }

    throw new ForbiddenException('Insufficient permissions to grant access');
  }

  async revokeModuleAccess(granterId: string, targetId: string, moduleSlug: string): Promise<void> {
    const granter = await this.userRepository.findOne({
      where: { id: granterId },
    });

    if (!granter) {
      throw new NotFoundException('Granter user not found');
    }

    const target = await this.userRepository.findOne({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // ADMIN can revoke company-level access
    if (granter.role === UserRole.ADMIN) {
      if (target.companyId) {
        const companyAccess = await this.companyModuleAccessRepository.findOne({
          where: {
            companyId: target.companyId,
            moduleId: module.id,
          },
        });

        if (companyAccess) {
          companyAccess.isEnabled = false;
          await this.companyModuleAccessRepository.save(companyAccess);
        }
      }
      return;
    }

    // COMPANY_OWNER can revoke employee permissions
    if (granter.role === UserRole.COMPANY_OWNER) {
      if (!granter.companyId || granter.companyId !== target.companyId) {
        throw new ForbiddenException('Cannot revoke access from users outside your company');
      }

      const userPermission = await this.userModulePermissionRepository.findOne({
        where: {
          userId: target.id,
          moduleId: module.id,
        },
      });

      if (userPermission) {
        await this.userModulePermissionRepository.remove(userPermission);
      }
      return;
    }

    throw new ForbiddenException('Insufficient permissions to revoke access');
  }

  async getAvailableModules(userId: string): Promise<Module[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    // ADMIN sees all modules
    if (user.role === UserRole.ADMIN) {
      return this.moduleRepository.find({
        where: { isActive: true },
      });
    }

    if (!user.companyId) {
      return [];
    }

    // COMPANY_OWNER sees all modules enabled for their company
    if (user.role === UserRole.COMPANY_OWNER) {
      const companyAccesses = await this.companyModuleAccessRepository.find({
        where: {
          companyId: user.companyId,
          isEnabled: true,
        },
        relations: ['module'],
      });

      return companyAccesses
        .map((access) => access.module)
        .filter((module) => module.isActive);
    }

    // EMPLOYEE sees only modules they have explicit permissions for
    // AND their company has access to
    if (user.role === UserRole.EMPLOYEE) {
      // Get employee's module permissions
      const userPermissions = await this.userModulePermissionRepository.find({
        where: {
          userId: user.id,
        },
        relations: ['module'],
      });

      // Get company's enabled modules
      const companyAccesses = await this.companyModuleAccessRepository.find({
        where: {
          companyId: user.companyId,
          isEnabled: true,
        },
        relations: ['module'],
      });

      // Create set of company module IDs for fast lookup
      const companyModuleIds = new Set(
        companyAccesses.map((access) => access.module.id)
      );

      // Return only modules that employee has permissions for
      // AND company has enabled access to
      return userPermissions
        .map((permission) => permission.module)
        .filter((module) =>
          module.isActive && companyModuleIds.has(module.id)
        );
    }

    return [];
  }

  /**
   * Check if a company has access to a specific module
   * This is a more efficient check than canAccessModule for company-level validation
   */
  async companyHasModule(companyId: string, moduleSlug: string): Promise<boolean> {
    // Find module
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (!module || !module.isActive) {
      return false;
    }

    // Check if company has access to this module
    const companyAccess = await this.companyModuleAccessRepository.findOne({
      where: {
        companyId,
        moduleId: module.id,
        isEnabled: true,
      },
    });

    return !!companyAccess;
  }

  /**
   * Check if a company has access to a specific module by module ID
   * This is the most efficient check when module ID is already known
   */
  async companyHasModuleById(companyId: string, moduleId: string): Promise<boolean> {
    // Check if module is active
    const module = await this.moduleRepository.findOne({
      where: { id: moduleId, isActive: true },
    });

    if (!module) {
      return false;
    }

    // Check if company has access to this module
    const companyAccess = await this.companyModuleAccessRepository.findOne({
      where: {
        companyId,
        moduleId,
        isEnabled: true,
      },
    });

    return !!companyAccess;
  }

  // ==================== Module Discovery Integration ====================

  /**
   * Get module by slug with caching
   * Uses in-memory cache first, then falls back to database
   */
  async getModuleBySlug(moduleSlug: string): Promise<Module | null> {
    // Check in-memory cache first
    const cached = this.moduleCache.get(moduleSlug);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      return cached.module;
    }

    // Check if discovery service has the module (fast check without DB)
    if (this.moduleDiscoveryService?.moduleExists(moduleSlug)) {
      // Module exists in file system, fetch from DB for full entity
      const module = await this.moduleRepository.findOne({
        where: { slug: moduleSlug },
      });

      if (module) {
        this.moduleCache.set(moduleSlug, { module, timestamp: now });
        return module;
      }
    }

    // Fallback to direct DB lookup
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug },
    });

    if (module) {
      this.moduleCache.set(moduleSlug, { module, timestamp: now });
    }

    return module;
  }

  /**
   * Clear the module cache
   * Useful when modules are updated
   */
  clearModuleCache(): void {
    this.moduleCache.clear();
    this.logger.debug('Module cache cleared');
  }

  /**
   * Invalidate a specific module from cache
   */
  invalidateModuleCache(moduleSlug: string): void {
    this.moduleCache.delete(moduleSlug);
    this.logger.debug(`Cache invalidated for module: ${moduleSlug}`);
  }

  /**
   * Get available permissions for a module from discovery service
   * Falls back to checking the module's permissions column in DB
   */
  async getModulePermissions(moduleSlug: string): Promise<string[]> {
    // Try discovery service first
    if (this.moduleDiscoveryService) {
      const permissions = this.moduleDiscoveryService.getModulePermissions(moduleSlug);
      if (permissions) {
        return permissions;
      }
    }

    // Fallback to database
    const module = await this.getModuleBySlug(moduleSlug);
    if (module?.permissions) {
      return module.permissions;
    }

    // Default permissions if none found
    return ['read', 'write', 'delete', 'manage'];
  }

  /**
   * Get default permissions for a module
   */
  async getDefaultModulePermissions(moduleSlug: string): Promise<string[]> {
    // Try discovery service first
    if (this.moduleDiscoveryService) {
      const permissions = this.moduleDiscoveryService.getDefaultPermissions(moduleSlug);
      if (permissions) {
        return permissions;
      }
    }

    // Fallback to database
    const module = await this.getModuleBySlug(moduleSlug);
    if (module?.defaultPermissions) {
      return module.defaultPermissions;
    }

    // Default to read if none found
    return ['read'];
  }

  /**
   * Verify that a module exists (either in file system or database)
   */
  async moduleExists(moduleSlug: string): Promise<boolean> {
    // Fast check through discovery service
    if (this.moduleDiscoveryService?.moduleExists(moduleSlug)) {
      return true;
    }

    // Fallback to database check
    const module = await this.getModuleBySlug(moduleSlug);
    return module !== null && module.isActive;
  }

  /**
   * Get discovery service statistics
   */
  getDiscoveryStats(): {
    discoveredCount: number;
    modulesList: string[];
    cacheSize: number;
  } | null {
    if (!this.moduleDiscoveryService) {
      return null;
    }

    const stats = this.moduleDiscoveryService.getDiscoveryStats();
    return {
      ...stats,
      cacheSize: this.moduleCache.size,
    };
  }
}

