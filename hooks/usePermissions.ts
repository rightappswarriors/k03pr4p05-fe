import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { ResolvedPagePermission, User } from '@/types';

export type PermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

const DENIED_PERMISSION: ResolvedPagePermission = {
  key: '',
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
};

export function hasPrivilegedPageAccess(user: User | null | undefined) {
  return user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';
}

export function resolvePagePermission(user: User | null | undefined, pageKey: string): ResolvedPagePermission {
  if (hasPrivilegedPageAccess(user)) {
    return { key: pageKey, canView: true, canCreate: true, canEdit: true, canDelete: true };
  }

  const resolved = user?.resolvedPermissions?.find((permission) => permission.key === pageKey);
  if (resolved) return resolved;

  const base = user?.position?.permissions?.find((permission) => permission.page?.key === pageKey);
  return base ? { key: pageKey, ...base } : { ...DENIED_PERMISSION, key: pageKey };
}

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const permissions = useMemo(
    () => new Map((user?.resolvedPermissions ?? []).map((permission) => [permission.key, permission])),
    [user?.resolvedPermissions],
  );

  const permissionFor = useCallback(
    (pageKey: string) => {
      if (hasPrivilegedPageAccess(user)) {
        return { key: pageKey, canView: true, canCreate: true, canEdit: true, canDelete: true };
      }
      return permissions.get(pageKey) ?? resolvePagePermission(user, pageKey);
    },
    [permissions, user],
  );

  const can = useCallback(
    (pageKey: string, action: PermissionAction = 'canView') => permissionFor(pageKey)[action],
    [permissionFor],
  );

  return { can, permissionFor, permissionsLoading: isLoading, user };
}
