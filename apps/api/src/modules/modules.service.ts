import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  ManageModulePermissionDto,
  Module as ModuleEntity,
  PermissionTargetType,
  User,
  UserRole,
} from '@accounting/common';
import { DiscoveredModule, ModuleDiscoveryService, RBACService } from '@accounting/rbac';

import { CreateModuleDto, GrantModuleAccessDto, UpdateModuleDto } from './dto';
import { CompanyModuleAccessService } from './services/company-module-access.service';
import { EmployeeModulePermissionsService } from './services/employee-module-permissions.service';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    private rbacService: RBACService,
    private companyModuleAccessService: CompanyModuleAccessService,
    private employeePermissionsService: EmployeeModulePermissionsService,
    @Optional()
    private moduleDiscoveryService?: ModuleDiscoveryService
  ) {}

  // ==================== Module CRUD Operations ====================

  async findAll() {
    return this.moduleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Unified method to get modules based on user role from JWT token
   * - ADMIN: returns all modules
   * - COMPANY_OWNER: returns modules available to their company
   * - EMPLOYEE: returns modules they have explicit permissions for
   */
  async getModulesForUser(user: User) {
    if (user.role === UserRole.ADMIN) {
      return this.findAll();
    }

    return this.getAvailableModules(user.id);
  }

  async findById(id: string) {
    const module = await this.moduleRepository.findOne({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  /**
   * Unified method to get a module by ID or slug based on user role
   * Auto-detects whether identifier is UUID (ID) or string (slug)
   * - ADMIN: returns full module data
   * - COMPANY_OWNER/EMPLOYEE: returns module if they have access
   */
  async getModuleByIdentifier(user: User, identifier: string) {
    // Check if identifier is UUID (ID) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier
    );

    if (user.role === UserRole.ADMIN) {
      if (isUUID) {
        return this.findById(identifier);
      } else {
        return this.getModuleBySlugDirect(identifier);
      }
    }

    // For non-admin users, check access through RBAC
    if (isUUID) {
      // Get module first to get its slug
      const module = await this.findById(identifier);
      // Then verify access
      const hasAccess = await this.canUserAccess(user.id, module.slug);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this module');
      }
      return module;
    } else {
      // For slug, use existing getModuleBySlug which checks access
      return this.getModuleBySlug(user.id, identifier);
    }
  }

  async create(createModuleDto: CreateModuleDto) {
    const existingModule = await this.moduleRepository.findOne({
      where: { slug: createModuleDto.slug },
    });

    if (existingModule) {
      throw new ConflictException('Module with this slug already exists');
    }

    const module = this.moduleRepository.create(createModuleDto);
    return this.moduleRepository.save(module);
  }

  async update(id: string, updateModuleDto: UpdateModuleDto) {
    const module = await this.findById(id);
    Object.assign(module, updateModuleDto);
    return this.moduleRepository.save(module);
  }

  async delete(id: string) {
    const module = await this.findById(id);
    module.isActive = false;
    return this.moduleRepository.save(module);
  }

  // ==================== Module Access Validation ====================

  async getAvailableModules(userId: string) {
    // RBACService handles role-based filtering
    // - EMPLOYEE: returns only modules they have explicit permissions for
    // - COMPANY_OWNER: returns all modules for their company
    return this.rbacService.getAvailableModules(userId);
  }

  async getModuleBySlug(userId: string, slug: string) {
    const modules = await this.getAvailableModules(userId);
    const module = modules.find((m) => m.slug === slug);

    if (!module) {
      throw new NotFoundException('Module not found or not available for your company');
    }

    return module;
  }

  async canUserAccess(userId: string, moduleSlug: string): Promise<boolean> {
    return this.rbacService.canAccessModule(userId, moduleSlug);
  }

  // ==================== Company Module Access Management ====================
  // Delegated to CompanyModuleAccessService

  async getCompanyModules(companyId: string) {
    return this.companyModuleAccessService.getCompanyModules(companyId);
  }

  async grantModuleToCompany(companyId: string, moduleId: string) {
    return this.companyModuleAccessService.grantModuleToCompany(companyId, moduleId);
  }

  async revokeModuleFromCompany(companyId: string, moduleId: string) {
    return this.companyModuleAccessService.revokeModuleFromCompany(companyId, moduleId);
  }

  /**
   * Cleanup orphaned employee permissions for modules that companies no longer have access to
   * This method can be called manually to fix existing data inconsistencies
   * Returns the number of orphaned permissions that were removed
   */
  async cleanupOrphanedPermissions() {
    return this.companyModuleAccessService.cleanupOrphanedPermissions();
  }

  // ==================== Employee Module Permissions ====================
  // Delegated to EmployeeModulePermissionsService

  async getEmployeeModules(companyId: string, employeeId: string) {
    return this.employeePermissionsService.getEmployeeModules(companyId, employeeId);
  }

  async grantModuleToEmployee(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto
  ) {
    return this.employeePermissionsService.grantModuleToEmployee(
      companyId,
      employeeId,
      moduleSlug,
      grantModuleAccessDto
    );
  }

  async updateEmployeeModulePermissions(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto
  ) {
    return this.employeePermissionsService.updateEmployeeModulePermissions(
      companyId,
      employeeId,
      moduleSlug,
      grantModuleAccessDto
    );
  }

  async revokeModuleFromEmployee(companyId: string, employeeId: string, moduleSlug: string) {
    return this.employeePermissionsService.revokeModuleFromEmployee(
      companyId,
      employeeId,
      moduleSlug
    );
  }

  // ==================== Unified Permission Management ====================

  /**
   * Unified method to grant/update module permissions
   * Handles both company and employee targets based on DTO
   */
  async managePermission(user: User, dto: ManageModulePermissionDto) {
    if (dto.targetType === PermissionTargetType.COMPANY) {
      // Only ADMIN can manage company permissions
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can manage company module access');
      }

      // NOTE: permissions field is not used for company-level access
      // Company module access is controlled by the isEnabled flag in CompanyModuleAccess entity
      // The permissions field is only relevant for employee-level access (UserModulePermission)

      // Find module by slug
      const module = await this.getModuleBySlugDirect(dto.moduleSlug);

      // Grant module to company
      return this.grantModuleToCompany(dto.targetId, module.id);
    } else {
      // COMPANY_OWNER can manage employee permissions
      if (user.role !== UserRole.COMPANY_OWNER) {
        throw new ForbiddenException('Only company owners can manage employee permissions');
      }

      if (!dto.permissions || dto.permissions.length === 0) {
        throw new BadRequestException('Permissions array is required for employee access');
      }

      // Verify employee belongs to owner's company
      if (!user.companyId) {
        throw new ForbiddenException('Company owner must belong to a company');
      }

      const grantDto: GrantModuleAccessDto = {
        permissions: dto.permissions,
      };

      return this.grantModuleToEmployee(user.companyId, dto.targetId, dto.moduleSlug, grantDto);
    }
  }

  /**
   * Unified method to revoke module permissions
   * Handles both company and employee targets based on DTO
   */
  async revokePermission(user: User, dto: ManageModulePermissionDto) {
    if (dto.targetType === PermissionTargetType.COMPANY) {
      // Only ADMIN can revoke company permissions
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can revoke company module access');
      }

      // Find module by slug
      const module = await this.getModuleBySlugDirect(dto.moduleSlug);

      return this.revokeModuleFromCompany(dto.targetId, module.id);
    } else {
      // COMPANY_OWNER can revoke employee permissions
      if (user.role !== UserRole.COMPANY_OWNER) {
        throw new ForbiddenException('Only company owners can revoke employee permissions');
      }

      // Verify employee belongs to owner's company
      if (!user.companyId) {
        throw new ForbiddenException('Company owner must belong to a company');
      }

      return this.revokeModuleFromEmployee(user.companyId, dto.targetId, dto.moduleSlug);
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Helper method to get a module directly by slug without user context
   * Used internally when we already have validated company access separately
   */
  private async getModuleBySlugDirect(moduleSlug: string): Promise<ModuleEntity> {
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug, isActive: true },
    });

    if (!module) {
      throw new NotFoundException(`Module '${moduleSlug}' not found or is not active`);
    }

    return module;
  }

  // ==================== Module Discovery Methods ====================

  /**
   * Get discovered modules from file system
   * Returns modules discovered from libs/modules/{module-name}/module.json files
   */
  getDiscoveredModules(): DiscoveredModule[] {
    if (!this.moduleDiscoveryService) {
      return [];
    }
    return this.moduleDiscoveryService.getAllModules();
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): {
    discoveredCount: number;
    modulesList: string[];
    modulesBasePath: string;
    isDiscoveryComplete: boolean;
  } | null {
    if (!this.moduleDiscoveryService) {
      return null;
    }

    const stats = this.moduleDiscoveryService.getDiscoveryStats();
    return {
      ...stats,
      isDiscoveryComplete: this.moduleDiscoveryService.isDiscoveryComplete(),
    };
  }

  /**
   * Reload modules from file system
   * Triggers re-discovery and database sync
   */
  async reloadModules(): Promise<DiscoveredModule[]> {
    if (!this.moduleDiscoveryService) {
      throw new BadRequestException('Module discovery service is not available');
    }
    return this.moduleDiscoveryService.reloadModules();
  }

  /**
   * Get available permissions for a module
   */
  async getModulePermissions(moduleSlug: string): Promise<string[]> {
    return this.rbacService.getModulePermissions(moduleSlug);
  }

  /**
   * Get default permissions for a module
   */
  async getDefaultModulePermissions(moduleSlug: string): Promise<string[]> {
    return this.rbacService.getDefaultModulePermissions(moduleSlug);
  }
}
