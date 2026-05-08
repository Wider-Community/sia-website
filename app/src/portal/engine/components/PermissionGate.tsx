/**
 * Dynamic Component Engine — PermissionGate
 *
 * A declarative React component that conditionally renders its children
 * based on an authorization check via useAuthorization(). Shows a loading
 * skeleton while the check is in flight, and either renders children
 * (allowed) or the fallback (denied).
 *
 * @example
 * ```tsx
 * <PermissionGate action="update" resourceType="component_definition" resourceId={defId}>
 *   <Button>Edit</Button>
 * </PermissionGate>
 *
 * <PermissionGate
 *   action="delete"
 *   resourceType="flow_definition"
 *   resourceId={flowId}
 *   userId={currentUserId}
 *   fallback={<span className="text-muted-foreground text-xs">No access</span>}
 * >
 *   <Button variant="destructive">Delete Flow</Button>
 * </PermissionGate>
 * ```
 */

import { useState, useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthorization } from '../hooks';
import type { PermissionAction, PermissionResourceType } from '../types';

export interface PermissionGateProps {
  /** The action to check (e.g. 'create', 'read', 'update', 'delete', 'publish'). */
  action: PermissionAction;
  /** The resource type to check against. */
  resourceType: PermissionResourceType;
  /** Optional specific resource ID. Defaults to '*' (any). */
  resourceId?: string;
  /** The user ID to authorize. When omitted, defaults to 'current_user'. */
  userId?: string;
  /** Content to render when permission is denied. Defaults to null (render nothing). */
  fallback?: ReactNode;
  /** Content to render while the authorization check is loading. Defaults to a skeleton. */
  loadingSkeleton?: ReactNode;
  /** Children to render when permission is allowed. */
  children: ReactNode;
}

export function PermissionGate({
  action,
  resourceType,
  resourceId,
  userId = 'current_user',
  fallback = null,
  loadingSkeleton,
  children,
}: PermissionGateProps) {
  const { authorize } = useAuthorization();
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    authorize({
      userId,
      action,
      resourceType,
      resourceId: resourceId ?? '*',
    })
      .then((result) => {
        if (!cancelled) {
          setState(result.allowed ? 'allowed' : 'denied');
        }
      })
      .catch(() => {
        if (!cancelled) setState('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [authorize, userId, action, resourceType, resourceId]);

  if (state === 'loading') {
    return (
      <>
        {loadingSkeleton ?? (
          <Skeleton className="h-8 w-20 rounded" />
        )}
      </>
    );
  }

  if (state === 'denied') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
