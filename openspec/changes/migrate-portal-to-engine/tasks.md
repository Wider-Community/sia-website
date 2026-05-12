# Tasks: Migrate Portal Modules to Dynamic Engine Flows

## Phase 1: Foundation Fixes

### 1A. Fix Signature Feature
- [ ] Verify Vite proxy config forwards `/api/*` to upload server (port 4000)
- [ ] Replace hardcoded `userId = "user-1"` with `useGetIdentity()` in NewSigningRequestPage.tsx
- [ ] Verify `/upload`, `/download`, `/send-email` endpoints work in upload-server.ts
- [ ] Test full signing flow: upload PDF → place fields → add signers → send → sign via public link
- [ ] Fix any broken imports or missing dependencies

### 1B. Add "Delete All Data" Button
- [ ] Add `clearAllData()` function to seed.ts that deletes every record in every registered resource
- [ ] Iterate all keys from ENTITY_REGISTRY, delete all records in each
- [ ] Add "Delete All Data" button in Control Board with double confirmation (type DELETE)
- [ ] After deletion, reload the page

### 1C. Clean Up Noise
- [ ] Remove OrganizationDynamicForm.tsx
- [ ] Remove EngagementFlowForm.tsx
- [ ] Remove MatchFlowPage.tsx
- [ ] Remove DynamicPipelinePage.tsx
- [ ] Remove corresponding routes from router.tsx
- [ ] Remove debug console.log from component-resolver.ts and hooks.ts
- [ ] Verify build still compiles after cleanup

## Phase 2: Core Module Flows

### 2A. Organization Creation Flow
- [ ] Define flow `create-organization` in seed with 3 stages (Basic Info, Location, Description)
- [ ] Stage 1: Name (text-input, required), Type (select, ref: organization-types), Status (select, ref: organization-statuses)
- [ ] Stage 2: Country (select, ref: countries), City (text-input), Website (text-input)
- [ ] Stage 3: Description (textarea), Tags (text-input)
- [ ] Update route: `/portal/organizations/create` → FlowRunnerPage with slug
- [ ] Test: complete flow, verify data saved in submissions

### 2B. Contact Creation Flow
- [ ] Define flow `create-contact` in seed with 2 stages
- [ ] Stage 1: First Name, Last Name (required), Email, Phone, Role
- [ ] Stage 2: Organization (select, entity: organizations)
- [ ] Update route
- [ ] Test

### 2C. Engagement Creation Flow
- [ ] Define flow `create-engagement` in seed with 3 stages
- [ ] Stage 1: Title (required), Organization (entity: organizations, required), Category (ref: engagement-categories)
- [ ] Stage 2: Stage (ref: engagement-stages), Priority (ref: priority-levels), Description
- [ ] Stage 3: Start Date, Target Date, Value, Tags
- [ ] Update route
- [ ] Test

### 2D. Task Creation Flow
- [ ] Define flow `create-task` in seed with 2 stages
- [ ] Stage 1: Title (required), Description, Due Date (required), Priority (ref: priority-levels)
- [ ] Stage 2: Organization (entity: organizations), Engagement (entity: engagements)
- [ ] Update route
- [ ] Test

### 2E. Match Creation Flow
- [ ] Define flow `create-match` in seed with 3 stages
- [ ] Stage 1: Organization A (entity: organizations, required), Organization B (entity: organizations, required)
- [ ] Stage 2: Score (number, required), Reason (textarea, required), Category (ref: match-categories), Sector (ref: sectors)
- [ ] Stage 3: Expiration Date (date)
- [ ] Update route
- [ ] Test

## Phase 3: Flow Completion → Entity Creation

### 3A. Flow-Entity Bridge
- [ ] Create `flow-entity-bridge.ts` module
- [ ] Subscribe to `flow.completed` events
- [ ] Define FLOW_ENTITY_MAP registry: flow slug → resource + field mapping
- [ ] On flow completion: create entity in Mujarrad from collected data
- [ ] Log activity event for audit trail
- [ ] Initialize bridge in PortalApp.tsx alongside notification bridge

### 3B. Verify End-to-End
- [ ] Complete "Create Organization" flow → verify org appears in org list
- [ ] Complete "Create Contact" flow → verify contact appears in contact list
- [ ] Complete "Create Engagement" flow → verify engagement appears in list and pipeline
- [ ] Complete "Create Task" flow → verify task appears in task list and board
- [ ] Complete "Create Match" flow → verify match appears in match list

## Phase 4: Dynamic Matching Criteria
- [ ] Make match creation flow's criteria stage admin-configurable
- [ ] Add ability to add custom criteria components to the match flow from Control Board
- [ ] Store individual criterion values alongside composite score
- [ ] Document how admins add new matching dimensions

## Phase 5: Lucid Quick-Add Migration
- [ ] Replace Lucid hardcoded Task form with inline flow renderer
- [ ] Replace Lucid hardcoded Engagement form with inline flow renderer
- [ ] Replace Lucid hardcoded Contact form with inline flow renderer
- [ ] Replace Lucid hardcoded Match form with inline flow renderer
- [ ] Keep Note form hardcoded (simple, no flow needed)
