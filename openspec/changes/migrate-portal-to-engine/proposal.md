# Change: Migrate Portal Modules to Dynamic Engine Flows

## Why

The dynamic component engine is built — reference data, data source bindings, renderers, flow runner, submissions. But every user-facing module still renders through hardcoded React pages. We built the infrastructure but the actual application doesn't use it. The engine sits beside the portal instead of being the portal.

The core problem SIA solves — matching organizations across criteria that evolve — requires a system where the data structure itself is dynamic. Hardcoded forms assume fixed schemas. The matching dimensions will change as data arrives. The engine was built for exactly this. Time to wire it in.

Additionally: the signature feature is broken (missing API proxy config), and there's no way to clear all Mujarrad data to start fresh.

## What Changes

### Phase 1: Foundation Fixes (Day 1)

#### 1A. Fix Signature Feature
The signing feature is 95% complete. Three issues:
- **Vite proxy**: `/api/upload`, `/api/download`, `/api/send-email` need to proxy to the upload server (port 4000). Check `vite.config.ts` proxy rules.
- **Hardcoded userId**: `NewSigningRequestPage.tsx` line 234 uses `"user-1"` instead of `useGetIdentity()`.
- **Email endpoint**: Verify `scripts/upload-server.ts` has the `/send-email` handler wired to Resend.

#### 1B. Add "Delete All Data" Button
A nuclear reset button in the Control Board that deletes ALL Mujarrad data in the space — not just engine data, but organizations, contacts, engagements, matches, tasks, signing requests, files, notes, activity events, alerts, SLA rules, users. Everything. For development/staging cleanup.

Must require double confirmation ("Type DELETE to confirm").

#### 1C. Clean Up Noise
Remove duplicate/experimental pages that were created but never finished:
- `OrganizationDynamicForm.tsx` (replaced by engine flows)
- `EngagementFlowForm.tsx` (replaced by engine flows)
- `MatchFlowPage.tsx` (replaced by engine flows)
- `DynamicPipelinePage.tsx` (replaced by engine flows)
- `EngagementPipelinePage.tsx` (if redundant with PipelinePage)

Remove debug `console.log` statements from the resolver and hooks.

### Phase 2: Core Module Flows (Day 2-3)

Replace each hardcoded create/edit form with an engine-driven flow. The detail pages and list pages STAY hardcoded (they're display/analytics — not form collection). Only the data-entry paths migrate.

#### 2A. Organization Creation Flow
**Flow slug:** `create-organization`
**Stages:**
1. **Basic Info** — Name (text-input, required), Type (select, entity source: `organization-types`), Status (select, entity source: `organization-statuses`)
2. **Location** — Country (select, reference: `countries`), City (text-input), Website (text-input)
3. **Description** — Description (textarea), Tags (text-input)

**On completion:** Creates an `organizations` entity in Mujarrad with the collected data.

**Route change:** `/portal/organizations/create` renders `FlowRunnerPage` with `flowSlug="create-organization"` instead of `OrganizationFormPage`.

#### 2B. Contact Creation Flow
**Flow slug:** `create-contact`
**Stages:**
1. **Contact Info** — First Name (text-input, required), Last Name (text-input, required), Email (email-input), Phone (phone-input), Role (text-input)
2. **Organization** — Organization (select, entity source: `organizations`)

**On completion:** Creates a `contacts` entity.

**Route change:** `/portal/contacts/create` renders flow.

#### 2C. Engagement Creation Flow
**Flow slug:** `create-engagement`
**Stages:**
1. **Basics** — Title (text-input, required), Organization (select, entity source: `organizations`, required), Category (select, reference: `engagement-categories`)
2. **Details** — Stage (select, reference: `engagement-stages`), Priority (select, reference: `priority-levels`), Description (textarea)
3. **Timeline** — Start Date (date), Target Date (date), Value (text-input), Tags (text-input)

**On completion:** Creates an `engagements` entity.

#### 2D. Task Creation Flow
**Flow slug:** `create-task`
**Stages:**
1. **Task** — Title (text-input, required), Description (textarea), Due Date (date, required), Priority (select, reference: `priority-levels`)
2. **Context** — Organization (select, entity source: `organizations`), Engagement (select, entity source: `engagements`)

**On completion:** Creates a `tasks` entity.

#### 2E. Match Creation Flow
**Flow slug:** `create-match`
**Stages:**
1. **Organizations** — Organization A (select, entity source: `organizations`, required), Organization B (select, entity source: `organizations`, required)
2. **Match Details** — Score (number, 0-100, required), Reason (textarea, required), Category (select, reference: `match-categories`), Sector (select, reference: `sectors`)
3. **Timeline** — Expiration Date (date, optional)

**On completion:** Creates a `matches` entity.

### Phase 3: Flow Completion → Entity Creation (Day 3-4)

The critical missing piece: when a user completes a flow, the collected data must create/update the actual entity in Mujarrad.

#### 3A. Flow Completion Handler
A new module `flow-entity-bridge.ts` that:
- Subscribes to `flow.completed` events on the engine event bus
- Looks up a mapping: flow slug → target resource + field mapping
- Creates the entity in Mujarrad using the collected data
- Emits an activity event for the audit trail

#### 3B. Flow-Entity Mapping Registry
```typescript
const FLOW_ENTITY_MAP: Record<string, {
  resource: string;
  fieldMap: Record<string, string>; // flow field → entity field
  defaults?: Record<string, unknown>;
}> = {
  'create-organization': {
    resource: 'organizations',
    fieldMap: { name: 'name', type: 'type', status: 'status', ... },
    defaults: { status: 'prospect' },
  },
  'create-contact': { resource: 'contacts', ... },
  'create-engagement': { resource: 'engagements', ... },
  'create-task': { resource: 'tasks', ... },
  'create-match': { resource: 'matches', ... },
};
```

#### 3C. Activity Event Logging
Each entity creation from a flow logs an activity event:
```
{ action: 'created', entityType: 'organizations', entityId: '...', performedBy: userId, source: 'flow:create-organization' }
```

### Phase 4: Dynamic Matching Criteria (Day 4-5)

This is the strategic value. The matching system must be able to match on fields that don't exist yet.

#### 4A. Match Criteria as Dynamic Components
Instead of hardcoded `matchScore + matchReason + category + sector`, the match creation flow has:
- A base stage with the two organization selectors
- A **dynamic criteria stage** where the admin has added whatever dimensions matter now
- The criteria components can be added/removed by admins as the business discovers new matching dimensions

#### 4B. Match Scoring Engine
A configurable scoring function that:
- Reads the dynamic criteria from the completed flow
- Weights each criterion (configurable per component)
- Produces a composite match score
- Stores both the score and the individual criterion values

#### 4C. Match Discovery Flow
An advanced flow where:
- User selects criteria (what matters for this match search)
- System queries organizations matching those criteria
- Results displayed as potential matches
- User confirms/adjusts matches

### Phase 5: Lucid Quick-Add Migration (Day 5)

The Lucid dialog (universal add button) currently has hardcoded forms for Task, Engagement, Note, Contact, Match. Replace each with a mini flow runner that renders the first stage of the corresponding creation flow inline in the dialog.

## Impact

- **Routes:** Create routes for orgs, contacts, engagements, tasks, matches change to render FlowRunnerPage
- **Data:** Flow submissions create real entities (organizations, contacts, etc.) in Mujarrad
- **Signing:** Fixed and working end-to-end
- **Cleanup:** Nuclear delete button for dev/staging
- **Matching:** Dynamic criteria system replaces fixed schema

## Risks

- **Migration scope:** 5 modules migrated simultaneously. Mitigated by keeping list/detail pages hardcoded — only create paths change.
- **Flow completion:** Entity creation must handle validation failures gracefully. Mitigated by validating at the flow level before the completion handler fires.
- **Performance:** Entity data source dropdowns fetch all records. For 1000+ orgs, need pagination/search. Deferred — current scale is under 100.

## Open Questions

1. Should the edit path also be a flow (pre-filled from existing entity), or stay hardcoded for now?
2. Should Lucid quick-add render the full flow or just the first stage?
3. Should match scoring weights be configurable per-component in the Control Board?
