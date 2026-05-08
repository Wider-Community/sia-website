/**
 * Dynamic Component Engine — Authorization Middleware
 *
 * Higher-order functions and React HOC for enforcing authorization
 * checks before executing operations or rendering components.
 */

import { useState, useEffect, createElement, type FC, type ComponentType } from 'react';
import type {
  PermissionAction,
  PermissionResourceType,
  AuthorizationResult,
} from './types';
import { getAuthEngine } from './hooks-internal';

// ---------------------------------------------------------------------------
// AuthorizationError
// ---------------------------------------------------------------------------

export class AuthorizationError extends Error {
  public readonly action: PermissionAction;
  public readonly resourceType: PermissionResourceType;
  public readonly resourceId?: string;
  public readonly result: AuthorizationResult;

  constructor(
    action: PermissionAction,
    resourceType: PermissionResourceType,
    result: AuthorizationResult,
    resourceId?: string,
  ) {
    const msg = `Authorization denied: "${action}" on ${resourceType}${resourceId ? ` (${resourceId})` : ''} — ${result.reason ?? 'no matching permission'}`;
    super(msg);
    this.name = 'AuthorizationError';
    this.action = action;
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.result = result;
  }
}

// ---------------------------------------------------------------------------
// withAuthorization — HOF for async functions
// ---------------------------------------------------------------------------

/**
 * Wraps an async function with an authorization check.
 * The wrapped function receives a `userId` as its first argument.
 * If the user is not authorized, an `AuthorizationError` is thrown
 * before the wrapped function executes.
 *
 * @example
 * ```ts
 * const protectedCreate = withAuthorization('create', 'component_definition')(
 *   async (userId: string, payload: CreatePayload) => { ... }
 * );
 * await protectedCreate('user_abc', payload); // throws if denied
 * ```
 */
export function withAuthorization<
  TArgs extends [string, ...unknown[]],
  TReturn,
>(
  action: PermissionAction,
  resourceType: PermissionResourceType,
  options?: {
    /** Extract the resource ID from the function arguments (defaults to '*'). */
    getResourceId?: (...args: TArgs) => string;
    /** Extract additional context for scope checks. */
    getContext?: (...args: TArgs) => Record<string, unknown>;
  },
) {
  return function wrap(
    fn: (...args: TArgs) => Promise<TReturn>,
  ): (...args: TArgs) => Promise<TReturn> {
    return async function authorized(...args: TArgs): Promise<TReturn> {
      const engine = getAuthEngine();

      const userId = args[0];
      const resourceId = options?.getResourceId?.(...args) ?? '*';
      const context = options?.getContext?.(...args);

      const result = await engine.authorize({
        userId,
        action,
        resourceType,
        resourceId,
        context,
      });

      if (!result.allowed) {
        throw new AuthorizationError(action, resourceType, result, resourceId);
      }

      return fn(...args);
    };
  };
}

// ---------------------------------------------------------------------------
// WithPermission — React HOC
// ---------------------------------------------------------------------------

export interface WithPermissionProps {
  action: PermissionAction;
  resourceType: PermissionResourceType;
  resourceId?: string;
}

/**
 * React HOC that conditionally renders a wrapped component based on
 * an authorization check. If the current user lacks permission the
 * component is not rendered (returns null).
 *
 * @example
 * ```tsx
 * const ProtectedEditButton = withPermission(EditButton, {
 *   action: 'update',
 *   resourceType: 'flow_definition',
 *   resourceId: flowId,
 * });
 * ```
 */
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  permProps: WithPermissionProps,
): FC<P & { userId: string }> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const Wrapper: FC<P & { userId: string }> = (props) => {
    const { userId, ...rest } = props as P & { userId: string };
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
      let cancelled = false;

      const engine = getAuthEngine();
      engine
        .authorize({
          userId,
          action: permProps.action,
          resourceType: permProps.resourceType,
          resourceId: permProps.resourceId ?? '*',
        })
        .then((result) => {
          if (!cancelled) setAllowed(result.allowed);
        })
        .catch(() => {
          if (!cancelled) setAllowed(false);
        });

      return () => {
        cancelled = true;
      };
    }, [userId]);

    if (allowed === null || !allowed) return null;

    return createElement(WrappedComponent, rest as P);
  };

  Wrapper.displayName = `withPermission(${displayName})`;
  return Wrapper;
}
