import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ErrorMessages } from '@accounting/common';

import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RBACService } from '../services/rbac.service';
import type { RbacRequest } from '../types/rbac-request.types';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly rbacService: RBACService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionData = this.reflector.getAllAndOverride<{
      module: string;
      permission: string;
    }>(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!permissionData) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RbacRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN.NOT_AUTHENTICATED);
    }

    // Use cached result from ModuleAccessGuard if available (avoids duplicate queries)
    let hasPermission: boolean;
    const cachedResult = request._rbacResult;

    if (cachedResult?.hasPermission) {
      // ADMIN/COMPANY_OWNER already resolved as having full permissions
      hasPermission = true;
    } else if (cachedResult && !cachedResult.hasPermission) {
      // EMPLOYEE case — need granular permission check with specific permission
      const result = await this.rbacService.checkModulePermission(
        user,
        permissionData.module,
        permissionData.permission
      );
      hasPermission = result.hasPermission;
    } else {
      // Fallback — no cached result from ModuleAccessGuard
      hasPermission = await this.rbacService.hasPermission(
        user.id,
        permissionData.module,
        permissionData.permission
      );
    }

    if (!hasPermission) {
      // Log detailed information for debugging (only visible server-side)
      this.logger.warn(
        `Permission denied for user ${user.id}: ${permissionData.permission} on module ${permissionData.module}`
      );
      // Return generic message to client to prevent information disclosure
      throw new ForbiddenException(ErrorMessages.FORBIDDEN.NO_PERMISSION);
    }

    return true;
  }
}
