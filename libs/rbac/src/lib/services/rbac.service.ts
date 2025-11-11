import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class RBACService {
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

    // COMPANY_OWNER and EMPLOYEE see modules enabled for their company
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
}

