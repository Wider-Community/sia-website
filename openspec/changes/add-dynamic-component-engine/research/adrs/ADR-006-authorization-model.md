# ADR-006: Authorization Model for Dynamic Component Engine

## Status
Proposed

## Context

The Dynamic Component Engine gives powerful capabilities — creating/modifying component definitions, restructuring flows, attaching notifications, publishing changes that propagate to all users instantly. Without an authorization layer, any admin could:

- Break production flows by misconfiguring branch rules
- Expose sensitive fields to unauthorized users
- Modify notifications that affect compliance workflows
- Publish untested changes that impact live deal sessions

We need fine-grained access control that defines **who can do what** at every level of the engine — from the Control Board down to individual component instances.

Options:
1. **Role-Based Access Control (RBAC)** — predefined roles with fixed permission sets
2. **Attribute-Based Access Control (ABAC)** — policies evaluate attributes of user, resource, action, and context
3. **Relationship-Based Access Control (ReBAC)** — permissions derived from graph relationships (like Google Zanzibar/SpiceDB)
4. **Hybrid RBAC + ReBAC** — roles for coarse access, relationships for fine-grained ownership/delegation

## Decision

**Hybrid RBAC + ReBAC, stored as Mujarrad nodes and relationships.**

- **RBAC** for coarse-grained access (who can access the Control Board, who can publish)
- **ReBAC** for fine-grained ownership and delegation (who owns this flow, who can edit this specific component definition, who can configure notifications for this corridor)

This maps naturally to Mujarrad's relationship model — permissions ARE relationships.

## Design

### Permission Model

```typescript
// Coarse-grained: RBAC roles
type EngineRole =
  | 'engine_superadmin'      // Full access to everything
  | 'engine_architect'       // Create/modify definitions, flows, templates
  | 'engine_operator'        // Configure instances, attach notifications, manage stages
  | 'engine_publisher'       // Approve and publish changes (gate role)
  | 'engine_viewer'          // Read-only access to Control Board
  | 'engine_analyst'         // Read analytics, notification metrics, flow metrics
  | 'flow_owner'             // Full control over owned flows (ReBAC)
  | 'corridor_admin'         // Manage everything within a specific corridor scope

// Fine-grained: ReBAC relationships
type PermissionRelationship =
  | 'owns'                   // Full control (CRUD + publish)
  | 'can_edit'               // Modify but not publish or delete
  | 'can_configure'          // Change config/overrides but not structure
  | 'can_view'               // Read-only access
  | 'can_publish'            // Approve draft → live transition
  | 'can_attach_notifications' // Attach notification rules to this resource
  | 'delegates_to'           // Transfer own permissions to another user/role
```

### Authorization Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYERS                               │
│                                                                      │
│  Layer 1: PLATFORM ACCESS                                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Who can access the Control Board at all?                         │ │
│  │ → Role: engine_viewer, engine_operator, engine_architect,        │ │
│  │   engine_superadmin                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 2: ACTION PERMISSIONS                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ What actions can this role perform?                              │ │
│  │                                                                  │ │
│  │  Action              │ superadmin │ architect │ operator │ viewer │ │
│  │  ────────────────────┼───────────┼──────────┼─────────┼────────│ │
│  │  Create definitions  │     ✓     │    ✓     │    ✗    │   ✗    │ │
│  │  Modify definitions  │     ✓     │    ✓     │    ✗    │   ✗    │ │
│  │  Delete definitions  │     ✓     │    ✗     │    ✗    │   ✗    │ │
│  │  Create flows        │     ✓     │    ✓     │    ✗    │   ✗    │ │
│  │  Modify flow stages  │     ✓     │    ✓     │    ✓*   │   ✗    │ │
│  │  Configure instances │     ✓     │    ✓     │    ✓    │   ✗    │ │
│  │  Attach notif.       │     ✓     │    ✓     │    ✓    │   ✗    │ │
│  │  Publish changes     │     ✓     │    ✗**   │    ✗    │   ✗    │ │
│  │  View analytics      │     ✓     │    ✓     │    ✓    │   ✓    │ │
│  │  Manage auth rules   │     ✓     │    ✗     │    ✗    │   ✗    │ │
│  │                                                                  │ │
│  │  * Only for flows they own (ReBAC)                              │ │
│  │  ** Requires separate publisher role or superadmin approval      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 3: RESOURCE OWNERSHIP (ReBAC)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Who owns/controls this specific resource?                        │ │
│  │                                                                  │ │
│  │  User A ──[owns]──► Flow: "Org Matching"                        │ │
│  │  User A ──[delegates_to]──► User B (can_edit)                   │ │
│  │  Team "KSA-MY" ──[can_configure]──► All flows in corridor       │ │
│  │  User C ──[can_attach_notifications]──► Stage: "Due Diligence"  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 4: SCOPE CONSTRAINTS                                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ What scope is this permission limited to?                        │ │
│  │                                                                  │ │
│  │  Corridor scope: KSA-MY, KSA-UAE, MY-ASEAN, etc.               │ │
│  │  Flow scope: specific flow ID or all flows                       │ │
│  │  Component scope: specific definition or category                │ │
│  │  Notification scope: specific priority level or channel          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 5: PUBLISH GATE (Separation of Duties)                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Who made the change ≠ Who approves it for production             │ │
│  │                                                                  │ │
│  │  Maker ──[creates draft]──► ASSUMPTION node                      │ │
│  │  Publisher ──[approves]──► ASSUMPTION promotes to live TEMPLATE   │ │
│  │                                                                  │ │
│  │  Self-approval: Only engine_superadmin can approve own changes    │ │
│  │  All others require a different user with can_publish             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Mujarrad Node Schema: Permission

```typescript
interface PermissionGrant {
  nodeType: 'REGULAR';
  category: 'permission_grant';
  schema: {
    subjectType: 'user' | 'role' | 'team';
    subjectId: string;                    // User ID, role name, or team ID
    permission: PermissionRelationship;   // owns, can_edit, can_configure, etc.
    resourceType: 'component_definition' | 'flow_definition' | 'stage_definition' |
                  'notification_definition' | 'corridor' | 'control_board';
    resourceId: string;                   // Specific resource or '*' for all
    scope?: {
      corridor?: string;                  // Limit to specific corridor
      componentCategory?: string;         // Limit to category (field, composite, etc.)
      notificationPriority?: string;      // Limit to priority level
    };
    grantedBy: string;                    // Who granted this permission
    grantedAt: string;                    // When
    expiresAt?: string;                   // Optional time-limited access
    conditions?: BranchCondition[];       // Optional: contextual conditions
  };
  relationships: {
    granted_to: '→ user/team node';
    applies_to: '→ resource node';
    granted_by: '→ user node (grantor)';
  };
}
```

### Authorization Check Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │     │   RBAC       │     │   ReBAC      │     │   Scope      │
│   (user,     │────►│   Check      │────►│   Check      │────►│   Check      │
│   action,    │     │              │     │              │     │              │
│   resource)  │     │ Does user's  │     │ Does user    │     │ Is resource  │
│              │     │ role allow   │     │ have         │     │ within       │
│              │     │ this action  │     │ relationship │     │ user's       │
│              │     │ type?        │     │ to this      │     │ corridor/    │
│              │     │              │     │ resource?    │     │ scope?       │
└──────────────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │                     │
                      DENY ─┤─ ALLOW        DENY ─┤─ ALLOW       DENY ─┤─ ALLOW
                            │                     │                     │
                            ▼                     ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                     │   DENIED     │     │   DENIED     │     │  AUTHORIZED  │
                     │   (role      │     │ (no relation │     │  (proceed)   │
                     │   insufficient│    │  to resource)│     │              │
                     └──────────────┘     └──────────────┘     └──────────────┘
```

```typescript
interface AuthorizationRequest {
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'attach' | 'configure';
  resourceType: string;
  resourceId: string;
  context?: Record<string, unknown>;  // Additional context for conditional checks
}

interface AuthorizationResult {
  allowed: boolean;
  reason?: string;             // Why denied (for logging/debugging)
  effectivePermissions?: string[]; // What the user CAN do with this resource
  auditId: string;             // Every check is logged
}

async function authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
  // 1. RBAC: Check role allows action type
  const userRoles = await getUserRoles(request.userId);
  if (!roleAllowsAction(userRoles, request.action, request.resourceType)) {
    return { allowed: false, reason: 'role_insufficient' };
  }

  // 2. ReBAC: Check user has relationship to specific resource
  // (superadmin bypasses this — has implicit 'owns' to everything)
  if (!userRoles.includes('engine_superadmin')) {
    const hasRelationship = await checkRelationship(
      request.userId, request.action, request.resourceId
    );
    if (!hasRelationship) {
      return { allowed: false, reason: 'no_resource_relationship' };
    }
  }

  // 3. Scope: Check resource is within user's permitted scope
  const scope = await getUserScope(request.userId);
  if (!resourceInScope(request.resourceId, scope)) {
    return { allowed: false, reason: 'out_of_scope' };
  }

  // 4. Publish gate: Separation of duties
  if (request.action === 'publish') {
    const lastEditor = await getLastEditor(request.resourceId);
    if (lastEditor === request.userId && !userRoles.includes('engine_superadmin')) {
      return { allowed: false, reason: 'cannot_self_publish' };
    }
  }

  // 5. Log and allow
  await auditLog(request, { allowed: true });
  return { allowed: true };
}
```

### Publish Gate (Maker-Checker Pattern)

```
┌──────────────┐                    ┌──────────────┐
│  MAKER       │                    │  CHECKER     │
│  (architect/ │                    │  (publisher/ │
│   operator)  │                    │   superadmin)│
└──────┬───────┘                    └──────┬───────┘
       │                                    │
       │ 1. Creates/modifies                │
       │    config (saved as                │
       │    ASSUMPTION node                 │
       │    = draft state)                  │
       │                                    │
       │ 2. Clicks "Request                 │
       │    Publish"                        │
       │                                    │
       │ ──── Notification ────────────────►│
       │                                    │
       │                                    │ 3. Reviews changes
       │                                    │    (diff view in
       │                                    │    Control Board)
       │                                    │
       │                                    │ 4. Approves
       │                                    │    (ASSUMPTION →
       │                                    │    promotes to
       │                                    │    live TEMPLATE)
       │                                    │
       │ ◄──── Notification ───────────────│
       │    "Your change is live"           │
       │                                    │
       ▼                                    ▼

  Audit trail:
  - Who created the draft
  - Who approved the publish
  - When each action occurred
  - What changed (diff snapshot)
```

### Control Board UI: Authorization Management

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONTROL BOARD > Authorization                         [Superadmin]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  ROLES & MEMBERS                                                 ││
│  │                                                                  ││
│  │  engine_superadmin    │ Omar H.                                  ││
│  │  engine_architect     │ [+ Assign]                               ││
│  │  engine_operator      │ Sarah K., Ahmed M.                       ││
│  │  engine_publisher     │ Omar H., Sarah K.                        ││
│  │  engine_viewer        │ All platform admins                      ││
│  │  engine_analyst       │ Data team                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  RESOURCE PERMISSIONS                                            ││
│  │                                                                  ││
│  │  Resource: [Org Matching Flow ▼]                                 ││
│  │                                                                  ││
│  │  ┌──────────────┬───────────────┬───────────┬──────────────────┐││
│  │  │ User/Team    │ Permission    │ Scope     │ Granted By       │││
│  │  ├──────────────┼───────────────┼───────────┼──────────────────┤││
│  │  │ Sarah K.     │ owns          │ all       │ Omar H. (auto)   │││
│  │  │ Ahmed M.     │ can_configure │ KSA-MY    │ Sarah K.         │││
│  │  │ Team: Deals  │ can_view      │ all       │ System           │││
│  │  └──────────────┴───────────────┴───────────┴──────────────────┘││
│  │                                                                  ││
│  │  [+ Grant Permission]  [Audit Log]                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  PENDING APPROVALS (Publish Gate)                                ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────┬──────────┬──────────────┐ ││
│  │  │ Change                           │ By       │ Action       │ ││
│  │  ├──────────────────────────────────┼──────────┼──────────────┤ ││
│  │  │ Added "ESG Score" field to       │ Ahmed M. │ [Review]     │ ││
│  │  │ Energy Compliance stage          │          │ [Approve]    │ ││
│  │  │                                  │          │ [Reject]     │ ││
│  │  ├──────────────────────────────────┼──────────┼──────────────┤ ││
│  │  │ New notification: "Match found"  │ Sarah K. │ [Review]     │ ││
│  │  │ attached to matching-flow        │          │ [Approve]    │ ││
│  │  └──────────────────────────────────┴──────────┴──────────────┘ ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  AUDIT TRAIL (Recent)                                            ││
│  │                                                                  ││
│  │  2026-05-06 14:32  Omar H.   APPROVED  "ESG field" → published  ││
│  │  2026-05-06 14:10  Ahmed M.  CREATED   Draft: ESG field config  ││
│  │  2026-05-06 13:45  Sarah K.  MODIFIED  Flow: added branch rule  ││
│  │  2026-05-06 11:20  System    ESCALATED Notification timeout      ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Rationale

### Why Hybrid RBAC + ReBAC (not pure RBAC)

Pure RBAC can't express:
- "Sarah owns THIS flow but not THAT flow"
- "Ahmed can configure components ONLY in the KSA-MY corridor"
- "Team Deals can view but only for flows they're assigned to"

These require resource-level relationships — exactly what Mujarrad's graph model provides natively.

### Why NOT pure ABAC

ABAC (attribute-based) is powerful but:
- Policy language is complex to author and debug
- Business operators can't easily understand WHO has access to WHAT
- Harder to audit ("show me all permissions for user X")

RBAC + ReBAC gives clear answers: "User X has role Y, and owns resources Z1, Z2, Z3."

### Why Mujarrad-native (not external auth service)

- Permissions are relationships — Mujarrad already models relationships
- Single query: "traverse `owns` from user to resource" = permission check
- No external service to maintain (Zanzibar/SpiceDB is powerful but adds infrastructure)
- Consistent with ADR-001 (everything in Mujarrad)

### Why Publish Gate (Maker-Checker)

- **Safety**: Changes to live flows affect real users in real deal sessions
- **Compliance**: Audit trail of who approved what (important for regulated corridor)
- **Quality**: Second pair of eyes catches misconfigurations before they propagate
- **Reversibility**: Draft state (ASSUMPTION) can be discarded without impact

## Consequences

### Positive
- Fine-grained control: right people, right resources, right scope
- Native to Mujarrad: permissions are just another relationship type
- Audit everything: every check, every grant, every approval logged
- Publish gate prevents accidental production damage
- Delegation: owners can share access without superadmin intervention

### Negative
- Permission check on every Control Board action (must be fast — cache aggressively)
- Complexity for small teams (when there's only 2-3 people, feels like overhead)
- Permission management UI adds to Control Board scope

### Mitigations
- Cache permission grants per session (invalidate on change)
- "Quick setup" wizard for small teams (pre-configured role assignments)
- Permission checks are lightweight graph traversals (single hop in most cases)

## Related
- ADR-001: Mujarrad-Native Storage (permissions stored as nodes/relationships)
- ADR-003: Real-Time Propagation (permission changes propagate immediately)
- ADR-005: Notification Triggers (permission denials can trigger notifications)
