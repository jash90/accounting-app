import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '@accounting/common';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Role must match
    if (!requiredRoles.some((role) => user?.role === role)) {
      return false;
    }

    // SECURITY (defense-in-depth for P0-2): every `@Roles(...)` route is
    // tenant-scoped. Convention: ADMIN, COMPANY_OWNER and EMPLOYEE all have
    // a `companyId` — admins operate within their own admin company. Reject
    // any user that passed JWT auth but is not associated with a company,
    // because downstream services trust `user.companyId` to scope queries.
    //
    // Public endpoints (`@Public()`) skip JwtAuthGuard entirely so this
    // guard never runs for them. Half-registered users (companyId=null)
    // must complete onboarding before reaching `@Roles(...)` routes.
    if (!user?.companyId) {
      this.logger.warn(
        `User ${user?.id ?? '<no user>'} (role=${user?.role ?? 'unknown'}) hit @Roles route without a companyId`
      );
      throw new ForbiddenException('User is not associated with a company');
    }

    return true;
  }
}
