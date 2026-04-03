import { type Request } from 'express';

import { type User } from '@accounting/common';

/**
 * Result of the RBAC module access + permission check.
 * Cached on the request object by ModuleAccessGuard and consumed by PermissionGuard
 * to avoid duplicate database queries in the guard chain.
 */
export interface RbacResult {
  hasAccess: boolean;
  hasPermission: boolean;
}

/**
 * Express request extended with RBAC-specific properties.
 * Use this instead of raw `Request` in RBAC guards to get type-safe access.
 */
export interface RbacRequest extends Request {
  user: User;
  /** Cached RBAC result set by ModuleAccessGuard, consumed by PermissionGuard */
  _rbacResult?: RbacResult;
}
