import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACService } from '../services/rbac.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private rbacService: RBACService,
    private reflector: Reflector,
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
      permissionData.permission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${permissionData.permission} on module ${permissionData.module}`,
      );
    }

    return true;
  }
}

