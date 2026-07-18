import { Request } from 'express';
import { ForbiddenException, UnauthorizedException } from '../types/error.types';

export interface CenterScopeActor {
  id: string;
  centerId: string | null;
  roles: Array<{ name: string; centerId: string | null }>;
}

export function isSuperAdmin(actor: CenterScopeActor | undefined): boolean {
  return Boolean(
    actor?.roles.some((role) => role.name === 'super_admin' && role.centerId === null)
  );
}

/**
 * Resolve center filter for list/query operations.
 * Non–super_admin users are always scoped to their center.
 * super_admin may pass ?centerId= to query another center, or omit for all centers.
 */
export function resolveScopedCenterId(
  req: Request,
  requestedCenterId?: string | null
): string | undefined {
  const user = req.user;
  if (!user) {
    return undefined;
  }

  const requested = requestedCenterId?.trim() || undefined;

  if (isSuperAdmin(user)) {
    return requested ?? user.centerId ?? undefined;
  }

  const userCenterId = user.centerId;
  if (!userCenterId) {
    throw new ForbiddenException('User is not assigned to a center');
  }

  if (requested && requested !== userCenterId) {
    throw new ForbiddenException('Access denied to this center');
  }

  return userCenterId;
}

/**
 * Ensure a resource belongs to the caller's center (super_admin bypasses).
 */
export function assertCenterAccess(
  req: Request,
  resourceCenterId: string | null | undefined
): void {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedException('Authentication required');
  }

  if (isSuperAdmin(user)) {
    return;
  }

  const userCenterId = user.centerId;
  if (!userCenterId) {
    throw new ForbiddenException('User is not assigned to a center');
  }

  if (!resourceCenterId || resourceCenterId !== userCenterId) {
    throw new ForbiddenException('Access denied to this resource');
  }
}

export function resolveScopedCenterIdFromQuery(req: Request): string | undefined {
  return resolveScopedCenterId(req, req.query.centerId as string | undefined);
}
