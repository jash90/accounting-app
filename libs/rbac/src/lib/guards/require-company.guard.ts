import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_COMPANY_KEY } from '../decorators/require-company.decorator';

/**
 * Guard that ensures the authenticated user is associated with a company.
 * Use with @RequireCompany() decorator to enforce company association.
 *
 * This guard helps reduce repetitive `if (!user.companyId)` checks in controllers.
 */
@Injectable()
export class RequireCompanyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireCompany = this.reflector.getAllAndOverride<boolean>(REQUIRE_COMPANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireCompany) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!user.companyId) {
      throw new ForbiddenException('User is not associated with a company');
    }

    return true;
  }
}
