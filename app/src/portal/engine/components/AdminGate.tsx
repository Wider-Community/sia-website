/**
 * Dynamic Component Engine — AdminGate
 *
 * Convenience wrapper around PermissionGate for admin-only content.
 * Checks `read` permission on `control_board` and renders nothing
 * when the user is not an admin.
 *
 * @example
 * ```tsx
 * <AdminGate>
 *   <SidebarLink to="/portal/control-board">Control Board</SidebarLink>
 * </AdminGate>
 * ```
 */

import type { ReactNode } from 'react';
import { PermissionGate } from './PermissionGate';

export interface AdminGateProps {
  children: ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  return (
    <PermissionGate
      action="read"
      resourceType="control_board"
      fallback={null}
    >
      {children}
    </PermissionGate>
  );
}
