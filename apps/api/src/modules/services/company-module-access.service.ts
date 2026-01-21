import { Injectable, NotFoundException } from '@nestjs/common';
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

/**
 * Service for managing company-level module access
 *
 * Handles granting/revoking module access to companies and
 * cleaning up orphaned employee permissions when modules are revoked.
 */
@Injectable()
export class CompanyModuleAccessService {
  constructor(
    @InjectRepository(ModuleEntity)
    private moduleRepository: Repository<ModuleEntity>,
    @InjectRepository(CompanyModuleAccess)
    private companyModuleAccessRepository: Repository<CompanyModuleAccess>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>
  ) {}

  /**
   * Get all modules for a specific company
   */
  async getCompanyModules(companyId: string) {
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

  /**
   * Grant module access to a company
   */
  async grantModuleToCompany(companyId: string, moduleId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

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

  /**
   * Revoke module access from a company
   *
   * Also cascades to remove all employee permissions for this module
   */
  async revokeModuleFromCompany(companyId: string, moduleId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const module = await this.moduleRepository.findOne({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    const access = await this.companyModuleAccessRepository.findOne({
      where: { companyId: company.id, moduleId: module.id },
    });

    if (!access) {
      throw new NotFoundException('Module access not found');
    }

    // Use transaction to ensure atomicity
    return this.companyModuleAccessRepository.manager.transaction(
      async (manager: EntityManager) => {
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
      }
    );
  }

  /**
   * Cleanup orphaned employee permissions for modules that companies no longer have access to
   *
   * This method can be called manually to fix existing data inconsistencies.
   * Returns the number of orphaned permissions that were removed.
   */
  async cleanupOrphanedPermissions(): Promise<{
    deletedCount: number;
    companies: Array<{
      companyId: string;
      companyName: string | undefined;
      moduleId: string;
      moduleName: string | undefined;
      deletedPermissions: number;
    }>;
  }> {
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
}
