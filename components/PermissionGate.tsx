import type { ReactNode } from 'react';

import { usePermissions, type PermissionAction } from '@/hooks/usePermissions';

export function PermissionGate({
  pageKey,
  action = 'canView',
  children,
  fallback = null,
}: {
  pageKey: string;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, permissionsLoading } = usePermissions();
  if (permissionsLoading) return null;
  return can(pageKey, action) ? children : fallback;
}
