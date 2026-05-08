/**
 * Dynamic Component Engine — Authorization Engine
 *
 * ReBAC + RBAC authorization with maker-checker publish gates,
 * scope constraints, and audit logging. Permission grants and role
 * assignments are persisted as REGULAR nodes via the EntityControlLayer.
 */

import type {
  EngineRole,
  PermissionAction,
  PermissionGrant,
  PermissionRelationship,
  PermissionResourceType,
  AuthorizationRequest,
  AuthorizationResult,
} from './types';
import type { EntityControlLayer } from '../lib/entity-control-layer';

// ---------------------------------------------------------------------------
// Role → allowed actions mapping (RBAC)
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS: Record<EngineRole, PermissionAction[]> = {
  engine_superadmin: ['create', 'read', 'update', 'delete', 'publish', 'attach', 'configure'],
  engine_architect: ['create', 'read', 'update', 'attach', 'configure'],
  engine_operator: ['read', 'update', 'attach', 'configure'],
  engine_publisher: ['read', 'publish'],
  engine_viewer: ['read'],
  engine_analyst: ['read'],
  flow_owner: ['read', 'update', 'configure', 'attach'],
  corridor_admin: ['read', 'update', 'configure', 'attach'],
};

// ---------------------------------------------------------------------------
// Relationship → permitted actions mapping (ReBAC)
// ---------------------------------------------------------------------------

const RELATIONSHIP_ACTIONS: Record<PermissionRelationship, PermissionAction[]> = {
  owns: ['create', 'read', 'update', 'delete', 'publish', 'attach', 'configure'],
  can_edit: ['read', 'update'],
  can_configure: ['read', 'configure'],
  can_view: ['read'],
  can_publish: ['read', 'publish'],
  can_attach_notifications: ['read', 'attach'],
  delegates_to: ['read', 'update', 'configure'],
};

// ---------------------------------------------------------------------------
// Authorization Engine
// ---------------------------------------------------------------------------

export class AuthorizationEngine {
  private grantCache: Map<string, PermissionGrant[]> = new Map();

  constructor(private entityLayer: EntityControlLayer) {}

  // ---------------------------------------------------------------------------
  // Main authorization check
  // ---------------------------------------------------------------------------

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const auditId = this.generateAuditId();
    const { userId, action, resourceType, resourceId } = request;

    // 1. RBAC — check if any of the user's roles allow the action
    const roles = await this.getUserRoles(userId);
    const roleAllowed = roles.some((role) =>
      ROLE_PERMISSIONS[role]?.includes(action),
    );

    if (!roleAllowed) {
      const result: AuthorizationResult = {
        allowed: false,
        reason: `No role grants the "${action}" action`,
        auditId,
      };
      await this.logAudit(request, result);
      return result;
    }

    const isSuperadmin = roles.includes('engine_superadmin');

    // 2. ReBAC — unless superadmin, check relationship-based grants
    if (!isSuperadmin) {
      const grants = await this.getPermissionsForUser(userId);
      const matchingGrants = grants.filter(
        (g) =>
          (g.resourceId === resourceId || g.resourceId === '*') &&
          g.resourceType === resourceType &&
          RELATIONSHIP_ACTIONS[g.permission]?.includes(action),
      );

      if (matchingGrants.length === 0) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: `No permission grant relates user to resource "${resourceId}"`,
          auditId,
        };
        await this.logAudit(request, result);
        return result;
      }

      // 3. Scope constraints — check corridor / category if present
      const corridor = request.context?.['corridor'] as string | undefined;
      const category = request.context?.['componentCategory'] as string | undefined;

      const scopedGrants = matchingGrants.filter((g) => {
        if (g.scope?.corridor && corridor && g.scope.corridor !== corridor) {
          return false;
        }
        if (g.scope?.componentCategory && category && g.scope.componentCategory !== category) {
          return false;
        }
        return true;
      });

      if (scopedGrants.length === 0) {
        const result: AuthorizationResult = {
          allowed: false,
          reason: 'Permission grants exist but scope constraints do not match',
          auditId,
        };
        await this.logAudit(request, result);
        return result;
      }

      // 4. Maker-checker for publish action
      if (action === 'publish') {
        const lastEditor = request.context?.['lastEditor'] as string | undefined;
        if (lastEditor && lastEditor === userId) {
          const result: AuthorizationResult = {
            allowed: false,
            reason: 'Maker-checker: publisher cannot be the last editor',
            effectivePermissions: scopedGrants.map((g) => g.permission),
            auditId,
          };
          await this.logAudit(request, result);
          return result;
        }
      }

      // Authorized via ReBAC
      const result: AuthorizationResult = {
        allowed: true,
        effectivePermissions: scopedGrants.map((g) => g.permission),
        auditId,
      };
      await this.logAudit(request, result);
      return result;
    }

    // Superadmin — skip ReBAC, scope, and maker-checker
    const result: AuthorizationResult = {
      allowed: true,
      reason: 'Superadmin bypass',
      effectivePermissions: ['owns'],
      auditId,
    };
    await this.logAudit(request, result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Permission Grant CRUD
  // ---------------------------------------------------------------------------

  async grantPermission(
    grant: Omit<PermissionGrant, 'id' | 'nodeType'>,
  ): Promise<PermissionGrant> {
    const record = await this.entityLayer.createEntity('permission-grants', {
      ...grant,
      grantedAt: grant.grantedAt ?? new Date().toISOString(),
    });
    const created = this.toPermissionGrant(record);

    // Invalidate cache for the subject
    this.invalidateUserCache(grant.subjectId);

    return created;
  }

  async revokePermission(grantId: string): Promise<void> {
    // Read the grant first so we can invalidate the right cache entry
    try {
      const record = await this.entityLayer.getEntity('permission-grants', grantId);
      const subjectId = record.subjectId as string;
      await this.entityLayer.deleteEntity('permission-grants', grantId);
      if (subjectId) {
        this.invalidateUserCache(subjectId);
      }
    } catch {
      await this.entityLayer.deleteEntity('permission-grants', grantId);
    }
  }

  async getPermissionsForUser(userId: string): Promise<PermissionGrant[]> {
    // Check cache first
    const cached = this.grantCache.get(userId);
    if (cached) return cached;

    // Fetch from entity layer — grants where subjectId matches
    const result = await this.entityLayer.listEntities('permission-grants', {
      filters: [
        { field: 'subjectId', operator: 'eq' as const, value: userId },
      ],
    });

    const grants = result.data.map((r) => this.toPermissionGrant(r));
    this.grantCache.set(userId, grants);
    return grants;
  }

  async getPermissionsForResource(resourceId: string): Promise<PermissionGrant[]> {
    const result = await this.entityLayer.listEntities('permission-grants', {
      filters: [
        { field: 'resourceId', operator: 'eq' as const, value: resourceId },
      ],
    });
    return result.data.map((r) => this.toPermissionGrant(r));
  }

  // ---------------------------------------------------------------------------
  // Role Management
  // ---------------------------------------------------------------------------

  async assignRole(userId: string, role: EngineRole): Promise<void> {
    // Check if role is already assigned
    const existing = await this.entityLayer.listEntities('role-assignments', {
      filters: [
        { field: 'userId', operator: 'eq' as const, value: userId },
        { field: 'role', operator: 'eq' as const, value: role },
      ],
    });

    if (existing.data.length > 0) return; // Already assigned

    await this.entityLayer.createEntity('role-assignments', {
      userId,
      role,
      assignedAt: new Date().toISOString(),
    });

    // Invalidate grant cache since roles affect authorization
    this.invalidateUserCache(userId);
  }

  async getUserRoles(userId: string): Promise<EngineRole[]> {
    const result = await this.entityLayer.listEntities('role-assignments', {
      filters: [
        { field: 'userId', operator: 'eq' as const, value: userId },
      ],
    });
    return result.data.map((r) => r.role as EngineRole);
  }

  async removeRole(userId: string, role: EngineRole): Promise<void> {
    const result = await this.entityLayer.listEntities('role-assignments', {
      filters: [
        { field: 'userId', operator: 'eq' as const, value: userId },
        { field: 'role', operator: 'eq' as const, value: role },
      ],
    });

    for (const record of result.data) {
      await this.entityLayer.deleteEntity('role-assignments', record.id);
    }

    this.invalidateUserCache(userId);
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  invalidateUserCache(userId: string): void {
    this.grantCache.delete(userId);
  }

  clearCache(): void {
    this.grantCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Audit Trail
  // ---------------------------------------------------------------------------

  private async logAudit(
    request: AuthorizationRequest,
    result: AuthorizationResult,
  ): Promise<void> {
    try {
      await this.entityLayer.createEntity('activity-events', {
        action: 'auth_check',
        entityType: request.resourceType,
        entityId: request.resourceId,
        performedBy: request.userId,
        details: {
          requestedAction: request.action,
          allowed: result.allowed,
          reason: result.reason,
          auditId: result.auditId,
          effectivePermissions: result.effectivePermissions,
          context: request.context,
        },
      });
    } catch {
      // Audit logging is best-effort — do not block authorization
      console.warn('[AuthorizationEngine] Failed to log audit event');
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private generateAuditId(): string {
    // Use crypto.randomUUID when available, fall back to timestamp-based ID
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private toPermissionGrant(record: Record<string, unknown>): PermissionGrant {
    return {
      id: record.id as string,
      nodeType: 'REGULAR',
      subjectType: record.subjectType as PermissionGrant['subjectType'],
      subjectId: record.subjectId as string,
      permission: record.permission as PermissionRelationship,
      resourceType: record.resourceType as PermissionResourceType,
      resourceId: record.resourceId as string,
      scope: record.scope as PermissionGrant['scope'],
      grantedBy: record.grantedBy as string,
      grantedAt: record.grantedAt as string,
      expiresAt: record.expiresAt as string | undefined,
      conditions: record.conditions as PermissionGrant['conditions'],
    };
  }
}
