import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, EntityManager } from 'typeorm';

import {
  User,
  Company,
  Module as ModuleEntity,
  CompanyModuleAccess,
  UserModulePermission,
  UserRole,
} from '@accounting/common';
import { RBACService } from '@accounting/rbac';

import { GrantModuleAccessDto } from '../dto';

/**
 * Service for managing employee-level module permissions
 *
 * Handles granting/revoking/updating module permissions for individual employees.
 * All operations validate that the company still has access to the module.
 */
@Injectable()
export class EmployeeModulePermissionsService {
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
    private rbacService: RBACService
  ) {}

  /**
   * Get all module permissions for an employee
   *
   * Only returns permissions for modules that are enabled for the company.
   */
  async getEmployeeModules(companyId: string, employeeId: string) {
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
    return permissions.filter(
      (permission) => permission.moduleId && enabledModuleIds.has(permission.moduleId)
    );
  }

  /**
   * Grant module access to an employee
   */
  async grantModuleToEmployee(
    companyId: string,
    employeeId: string,
    moduleSlug: string,
    grantModuleAccessDto: GrantModuleAccessDto
  ) {
    return this.userModulePermissionRepository.manager.transaction(
      async (manager: EntityManager) => {
        return this.grantModuleToEmployeeWithTransaction(
          companyId,
          employeeId,
          moduleSlug,
          grantModuleAccessDto,
          manager
        );
      }
    );
  }

  /**
   * Update existing employee module permissions
   *
   * Throws if the employee doesn't already have access to the module.
   */
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

    const employee = await this.userRepository.findOne({
      where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const module = await this.getModuleBySlug(moduleSlug);

    const existingPermission = await this.userModulePermissionRepository.findOne({
      where: {
        userId: employee.id,
        moduleId: module.id,
      },
    });

    if (!existingPermission) {
      throw new NotFoundException(
        'Employee does not have access to this module. Use grant endpoint instead.'
      );
    }

    // Update by calling grant (which handles upsert)
    return this.grantModuleToEmployee(companyId, employeeId, moduleSlug, grantModuleAccessDto);
  }

  /**
   * Revoke module access from an employee
   */
  async revokeModuleFromEmployee(companyId: string, employeeId: string, moduleSlug: string) {
    return this.userModulePermissionRepository.manager.transaction(
      async (manager: EntityManager) => {
        const employee = await this.userRepository.findOne({
          where: { id: employeeId, companyId, role: UserRole.EMPLOYEE },
        });

        if (!employee) {
          throw new NotFoundException('Employee not found');
        }

        const module = await this.getModuleBySlug(moduleSlug);

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
      }
    );
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

    const module = await this.getModuleBySlug(moduleSlug);

    // Check if company has access to this module
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

  /**
   * Helper method to get a module by slug
   */
  private async getModuleBySlug(moduleSlug: string): Promise<ModuleEntity> {
    const module = await this.moduleRepository.findOne({
      where: { slug: moduleSlug, isActive: true },
    });

    if (!module) {
      throw new NotFoundException(`Module '${moduleSlug}' not found or is not active`);
    }

    return module;
  }
}
