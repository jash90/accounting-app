import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACService } from '../services/rbac.service';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private rbacService: RBACService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasAccess = await this.rbacService.canAccessModule(user.id, requiredModule);

    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to module: ${requiredModule}`);
    }

    return true;
  }
}

