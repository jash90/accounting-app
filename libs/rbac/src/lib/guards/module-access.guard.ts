import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Optional, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBACService } from '../services/rbac.service';
import { ModuleDiscoveryService } from '../services/module-discovery.service';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  constructor(
    private rbacService: RBACService,
    private reflector: Reflector,
    @Optional()
    private moduleDiscoveryService?: ModuleDiscoveryService,
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

    // Fast check: verify module exists before doing full RBAC check
    // This prevents unnecessary database queries for non-existent modules
    if (this.moduleDiscoveryService && !this.moduleDiscoveryService.moduleExists(requiredModule)) {
      // Module not found in file discovery, check if it exists in DB
      const moduleExists = await this.rbacService.moduleExists(requiredModule);
      if (!moduleExists) {
        this.logger.warn(`Module not found: ${requiredModule}`);
        throw new ForbiddenException(`Module not found: ${requiredModule}`);
      }
    }

    const hasAccess = await this.rbacService.canAccessModule(user.id, requiredModule);

    if (!hasAccess) {
      throw new ForbiddenException(`Access denied to module: ${requiredModule}`);
    }

    return true;
  }
}

