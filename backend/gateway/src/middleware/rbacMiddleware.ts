/**
 * GymDeck Cloud Backend - Role-Based Access Control (RBAC) & Permission Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors';

export const ALL_PERMISSIONS = [
  'members.read',
  'members.write',
  'members.delete',
  'attendance.read',
  'attendance.write',
  'payments.read',
  'payments.write',
  'memberships.read',
  'memberships.write',
  'trainers.read',
  'trainers.write',
  'reports.read',
  'settings.read',
  'settings.write',
  'staff.read',
  'staff.write',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

/**
 * Enforces that the authenticated user possesses one of the allowed roles.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(AppError.unauthorized('Authentication required.'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        AppError.forbidden(`Forbidden: Role '${user.role}' is not authorized for this resource.`)
      );
    }

    next();
  };
}

/**
 * Enforces that the authenticated user has a specific granular permission.
 * OWNER role automatically possesses all permissions.
 */
export function requirePermission(permission: Permission | string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(AppError.unauthorized('Authentication required.'));
    }

    // OWNER has absolute authority within their gym tenant
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      return next();
    }

    const userPermissions = user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return next(
        AppError.forbidden(`Forbidden: Missing required permission '${permission}'.`)
      );
    }

    next();
  };
}
