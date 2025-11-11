import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@accounting/common';
import { OWNER_OR_ADMIN_KEY } from '../decorators/owner-or-admin.decorator';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOwnerOrAdminRequired = this.reflector.getAllAndOverride<boolean>(
      OWNER_OR_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isOwnerOrAdminRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.COMPANY_OWNER) {
      return true;
    }

    throw new ForbiddenException('Only company owners or admins can access this resource');
  }
}

