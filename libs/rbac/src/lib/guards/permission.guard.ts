import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RBACService } from '../services/rbac.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private rbacService: RBACService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionData = this.reflector.getAllAndOverride<{
      module: string;
      permission: string;
    }>(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!permissionData) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPermission = await this.rbacService.hasPermission(
      user.id,
      permissionData.module,
      permissionData.permission
    );

    if (!hasPermission) {
      // Log detailed information for debugging (only visible server-side)
      this.logger.warn(
        `Permission denied for user ${user.id}: ${permissionData.permission} on module ${permissionData.module}`
      );
      // Return generic message to client to prevent information disclosure
      throw new ForbiddenException('Nie masz uprawnień do wykonania tej operacji');
    }

    return true;
  }
}
