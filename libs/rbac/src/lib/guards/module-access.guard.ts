import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ErrorMessages } from '@accounting/common';

import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';
import { ModuleDiscoveryService } from '../services/module-discovery.service';
import { RBACService } from '../services/rbac.service';
import type { RbacRequest } from '../types/rbac-request.types';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  constructor(
    private readonly rbacService: RBACService,
    private readonly reflector: Reflector,
    @Optional()
    private readonly moduleDiscoveryService?: ModuleDiscoveryService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RbacRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN.NOT_AUTHENTICATED);
    }

    // SECURITY: every `@RequireModule(...)` controller is tenant-scoped.
    // RolesGuard alone only matches role; downstream services rely on every
    // call site filtering `WHERE companyId = ?`. To cover the case where a
    // service forgets that filter (or returns data via an unscoped query),
    // we enforce here that the caller is associated with a company.
    //
    // Convention: ADMIN / COMPANY_OWNER / EMPLOYEE all have a `companyId` —
    // even system admins operate within their own admin company. A `null`
    // companyId means a half-registered user (auth.service.register sets it
    // to null until onboarding completes), which must NEVER reach a tenant
    // route.
    if (!user.companyId) {
      this.logger.warn(
        `User ${user.id} (role=${user.role ?? 'unknown'}) hit @RequireModule('${requiredModule}') without a companyId`
      );
      throw new ForbiddenException(ErrorMessages.FORBIDDEN.MODULE_ACCESS_DENIED(requiredModule));
    }

    // Fast check: verify module exists before doing full RBAC check
    // This prevents unnecessary database queries for non-existent modules
    if (this.moduleDiscoveryService && !this.moduleDiscoveryService.moduleExists(requiredModule)) {
      // Module not found in file discovery, check if it exists in DB
      const moduleExists = await this.rbacService.moduleExists(requiredModule);
      if (!moduleExists) {
        this.logger.warn(`Module not found: ${requiredModule}`);
        throw new ForbiddenException(ErrorMessages.FORBIDDEN.MODULE_NOT_FOUND(requiredModule));
      }
    }

    // Use optimized combined check and cache the result for PermissionGuard
    const rbacResult = await this.rbacService.checkModulePermission(user, requiredModule);
    request._rbacResult = rbacResult;

    if (!rbacResult.hasAccess) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN.MODULE_ACCESS_DENIED(requiredModule));
    }

    return true;
  }
}
