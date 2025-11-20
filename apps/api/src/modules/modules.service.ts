import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
  UserRole,
  ManageModulePermissionDto,
  PermissionTargetType,
} from '@accounting/common';
import { RBACService } from '@accounting/rbac';
import { CreateModuleDto, UpdateModuleDto, GrantModuleAccessDto } from './dto';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(CompanyModuleAccess)
    private companyModuleAccessRepository: Repository<CompanyModuleAccess>,
    @InjectRepository(UserModulePermission)
    private userModulePermissionRepository: Repository<UserModulePermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private rbacService: RBACService,
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
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

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

  async getCompanyModules(companyId: string) {
    // Verify company exists
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return this.companyModuleAccessRepository.find({
      where: { companyId: company.id },
      relations: ['module'],
    });
  }

  async grantModuleToCompany(companyId: string, moduleId: string) {
    // Verify company exists
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Verify module exists
    const module = await this.findById(moduleId);

    let access = await this.companyModuleAccessRepository.findOne({
      where: { companyId: company.id, moduleId: module.id },
    });

    if (access) {
      access.isEnabled = true;
    } else {
      access = this.companyModuleAccessRepository.create({
        companyId: company.id,
        moduleId: module.id,
        isEnabled: true,
      });
    }

    return this.companyModuleAccessRepository.save(access);
  }

  async revokeModuleFromCompany(companyId: string, moduleId: string) {
    // Verify company exists
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Verify module exists
    const module = await this.findById(moduleId);

    const access = await this.companyModuleAccessRepository.findOne({
      where: { companyId: company.id, moduleId: module.id },
    });

    if (!access) {
      throw new NotFoundException('Module access not found');
    }

    // Use transaction to ensure atomicity
    return this.companyModuleAccessRepository.manager.transaction(async (manager: EntityManager) => {
      // 1. Disable the module access for the company
      access.isEnabled = false;
      await manager.save(CompanyModuleAccess, access);

      // 2. Find all employees in the company
      const employees = await manager.find(User, {
        where: {
          companyId: company.id,
          role: UserRole.EMPLOYEE,
        },
        select: ['id'],
      });

      // 3. If there are employees, delete their permissions for this module
      if (employees.length > 0) {
        const employeeIds = employees.map((emp) => emp.id);

        await manager
          .createQueryBuilder()
          .delete()
          .from(UserModulePermission)
          .where('moduleId = :moduleId', { moduleId: module.id })
          .andWhere('userId IN (:...userIds)', { userIds: employeeIds })
          .execute();
      }

      return access;
    });
  }

  /**
   * Cleanup orphaned employee permissions for modules that companies no longer have access to
   * This method can be called manually to fix existing data inconsistencies
   * Returns the number of orphaned permissions that were removed
   */
  async cleanupOrphanedPermissions(): Promise<{ deletedCount: number; companies: any[] }> {
    const result = await this.companyModuleAccessRepository.manager.transaction(
      async (manager: EntityManager) => {
        // Find all disabled company module accesses
        const disabledAccesses = await manager.find(CompanyModuleAccess, {
          where: { isEnabled: false },
          relations: ['company', 'module'],
        });

        let totalDeleted = 0;
        const cleanupResults = [];

        for (const access of disabledAccesses) {
          // Find all employees in this company
          const employees = await manager.find(User, {
            where: {
              companyId: access.companyId,
              role: UserRole.EMPLOYEE,
            },
            select: ['id'],
          });

          if (employees.length > 0) {
            const employeeIds = employees.map((emp) => emp.id);

            // Delete orphaned permissions for this module and these employees
            const deleteResult = await manager
              .createQueryBuilder()
              .delete()
              .from(UserModulePermission)
              .where('moduleId = :moduleId', { moduleId: access.moduleId })
              .andWhere('userId IN (:...userIds)', { userIds: employeeIds })
              .execute();

            if (deleteResult.affected && deleteResult.affected > 0) {
              totalDeleted += deleteResult.affected;
              cleanupResults.push({
                companyId: access.companyId,
                companyName: access.company?.name,
                moduleId: access.moduleId,
                moduleName: access.module?.name,
                deletedPermissions: deleteResult.affected,
              });
            }
          }
        }

        return {
          deletedCount: totalDeleted,
          companies: cleanupResults,
        };
      }
    );

    return result;
  }

  // ==================== Employee Module Permissions ====================

  async getEmployeeModules(companyId: string, employeeId: string) {
    // Verify employee exists and belongs to company
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get all permissions for the employee
    const permissions = await this.userModulePermissionRepository.find({
      where: { userId: employeeId },
      relations: ['module'],
    });

    // Get all enabled modules for the company
    const companyModules = await this.companyModuleAccessRepository.find({
      where: {
        companyId: companyId,
        isEnabled: true,
      },
      select: ['moduleId'],
    });

    // Create a set of enabled module IDs for faster lookup
    const enabledModuleIds = new Set(companyModules.map((cm) => cm.moduleId));

    // Filter permissions to only include modules that are enabled for the company
    const filteredPermissions = permissions.filter(
      (permission) => permission.moduleId && enabledModuleIds.has(permission.moduleId)
    );

    return filteredPermissions;
  }

  async grantModuleToEmployee(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto
  ) {
    // Use transaction to prevent race conditions
    return this.userModulePermissionRepository.manager.transaction(async (manager: EntityManager) => {
      return this.grantModuleToEmployeeWithTransaction(
        companyId,
        employeeId,
        moduleSlug,
        grantModuleAccessDto,
        manager
      );
    });
  }

  async updateEmployeeModulePermissions(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto
  ) {
    // Verify company still has access to this module
    const companyHasAccess = await this.rbacService.companyHasModule(companyId, moduleSlug);
    if (!companyHasAccess) {
      throw new ForbiddenException('Your company no longer has access to this module');
    }

    // Verify the permission exists (this is an update, not a grant)
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const module = await this.getModuleBySlugDirect(moduleSlug);

    const existingPermission = await this.userModulePermissionRepository.findOne({
      where: {
        userId: employee.id,
        moduleId: module.id,
      },
    });

    if (!existingPermission) {
      throw new NotFoundException('Employee does not have access to this module. Use grant endpoint instead.');
    }

    // Update the permissions
    return this.grantModuleToEmployee(companyId, employeeId, moduleSlug, grantModuleAccessDto);
  }

  async revokeModuleFromEmployee(companyId: string, employeeId: string, moduleSlug: string) {
    // Use transaction for consistency
    return this.userModulePermissionRepository.manager.transaction(async (manager: EntityManager) => {
      const employee = await this.userRepository.findOne({
        where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const module = await this.getModuleBySlugDirect(moduleSlug);

      const permission = await manager.findOne(UserModulePermission, {
        where: {
          userId: employee.id,
          moduleId: module.id,
        },
      });

      if (permission) {
        await manager.remove(UserModulePermission, permission);
      }

      return { message: 'Module access revoked successfully' };
    });
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

      if (!dto.permissions) {
        throw new BadRequestException('Permissions are required for granting company access');
      }

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

      return this.grantModuleToEmployee(
        user.companyId,
        dto.targetId,
        dto.moduleSlug,
        grantDto
      );
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

      return this.revokeModuleFromEmployee(
        user.companyId,
        dto.targetId,
        dto.moduleSlug
      );
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

  /**
   * Internal method that handles the actual grant logic within a transaction
   */
  private async grantModuleToEmployeeWithTransaction(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto,
    manager: EntityManager
  ) {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const module = await this.getModuleBySlugDirect(moduleSlug);

    // Check if company has access to this module (more efficient than checking owner's access)
    // This check happens within the transaction to prevent race conditions
    const companyHasAccess = await this.rbacService.companyHasModule(companyId, moduleSlug);
    if (!companyHasAccess) {
      throw new ForbiddenException('Your company does not have access to this module');
    }

    // Get company owner ID for grantedById field
    const company = await manager.findOne(Company, {
      where: { id: companyId },
      relations: ['owner'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Use transaction manager for all database operations
    let permission = await manager.findOne(UserModulePermission, {
      where: {
        userId: employee.id,
        moduleId: module.id,
      },
    });

    if (permission) {
      permission.permissions = grantModuleAccessDto.permissions;
      permission.grantedById = company.ownerId;
    } else {
      permission = manager.create(UserModulePermission, {
        userId: employee.id,
        moduleId: module.id,
        permissions: grantModuleAccessDto.permissions,
        grantedById: company.ownerId,
      });
    }

    return manager.save(UserModulePermission, permission);
  }
}
