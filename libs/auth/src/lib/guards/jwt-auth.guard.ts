import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const endpoint = `${request.method} ${request.url}`;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('🛡️  [JWT GUARD] Request intercepted:', endpoint);
    console.log('🔓 [JWT GUARD] Is public endpoint?', isPublic ? 'YES - Bypassing JWT check' : 'NO - Requires JWT authentication');

    if (isPublic) {
      console.log('✅ [JWT GUARD] Public endpoint - Access granted without token');
      return true;
    }

    console.log('🔒 [JWT GUARD] Protected endpoint - Validating JWT token...');
    return super.canActivate(context);
  }
}

