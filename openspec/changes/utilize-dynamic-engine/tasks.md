# Tasks: Utilize Dynamic Component Engine

## 1. Flow Runner Page
- [ ] 1.1 Create FlowRunnerPage.tsx at portal/pages/flows/FlowRunnerPage.tsx
- [ ] 1.2 Implement stage progress indicator (step bar showing all stages + current)
- [ ] 1.3 Implement dynamic form rendering per stage (resolve components via useDynamicForm)
- [ ] 1.4 Implement stage submission with validation
- [ ] 1.5 Implement branch evaluation and conditional routing
- [ ] 1.6 Implement BranchSelector integration when user choice is required
- [ ] 1.7 Implement back navigation with data preservation
- [ ] 1.8 Implement flow completion summary view
- [ ] 1.9 Implement session resume (detect existing active session, load collectedData)
- [ ] 1.10 Add route /portal/flows/:flowId to router.tsx

## 2. Flow Launcher Page
- [ ] 2.1 Create FlowLauncherPage.tsx at portal/pages/flows/FlowLauncherPage.tsx
- [ ] 2.2 List all active flow definitions with name, description, stage count
- [ ] 2.3 Show existing user sessions with status, current stage, resume button
- [ ] 2.4 Add route /portal/flows to router.tsx
- [ ] 2.5 Add "Flows" to sidebar navigation in PortalApp.tsx resources

## 3. Seed Data & Templates
- [ ] 3.1 Create portal/engine/seed.ts with seedEngine() function
- [ ] 3.2 Seed component definitions from existing Zod schemas (organizations, contacts, engagements, matches)
- [ ] 3.3 Seed the 3 built-in experience templates as ready-to-use flows
- [ ] 3.4 Add "Seed Engine" button to Control Board that triggers seeding
- [ ] 3.5 Guard against duplicate seeding (check if definitions already exist)

## 4. Kanban Integration
- [ ] 4.1 Create portal/pages/pipeline/DynamicPipelinePage.tsx
- [ ] 4.2 Integrate DynamicKanban component with flow definitions and sessions
- [ ] 4.3 Implement card click → navigate to flow runner at current stage
- [ ] 4.4 Add route /portal/pipeline/dynamic to router.tsx

## 5. Filter Integration
- [ ] 5.1 Create portal/engine/components/AdvancedFilterWrapper.tsx
- [ ] 5.2 Derive filter dimensions from component definitions for a given resource
- [ ] 5.3 Integrate with existing list pages (add "Advanced Filters" toggle)
- [ ] 5.4 Wire filter state to Mujarrad query via buildMujarradQuery

## 6. Notification Center Integration
- [ ] 6.1 Subscribe to engine notification.delivered events in the portal notification provider
- [ ] 6.2 Display in-app notifications as sonner toasts
- [ ] 6.3 Support actionUrl navigation on notification click

## 7. Navigation & Permissions
- [ ] 7.1 Add Flows and Pipeline to sidebar resources in PortalApp.tsx
- [ ] 7.2 Wrap Control Board sidebar link with PermissionGate (admin only)
- [ ] 7.3 Add Playground tab (already created, just needs commit)

## 8. Organization Module Integration
- [ ] 8.1 Create OrganizationDynamicForm.tsx — engine-driven form for org creation
- [ ] 8.2 Add advanced filters (DynamicFilterPanel) to OrganizationListPage
- [ ] 8.3 Add "Create (Dynamic)" button on org list page
- [ ] 8.4 Add route /portal/organizations/dynamic-create

## 9. Matching Module Integration
- [ ] 9.1 Create MatchFlowPage.tsx — Deal Matching flow with branching
- [ ] 9.2 Create MatchKanbanView.tsx — Kanban of match sessions
- [ ] 9.3 Add flow progress to match detail page
- [ ] 9.4 Add routes /portal/matches/flow and /portal/matches/kanban
- [ ] 9.5 Add "Match Flow" and "Kanban" links on match list page

## 10. Engagement Pipeline Integration
- [ ] 10.1 Create EngagementPipelinePage.tsx — Kanban by engagement stage
- [ ] 10.2 Create EngagementFlowForm.tsx — engine-driven engagement creation
- [ ] 10.3 Add routes /portal/engagements/pipeline and /portal/engagements/dynamic-create
- [ ] 10.4 Add "Pipeline View" and "Create (Dynamic)" buttons on engagement list page

## 11. Cross-Module Consistency & Error Resilience
- [ ] 11.1 Verify existing hardcoded pages still work unchanged
- [ ] 11.2 Add "Seed the engine" fallback message on all dynamic pages
- [ ] 11.3 Add error boundary with retry for Mujarrad API failures in engine pages
- [ ] 11.4 Ensure FallbackRenderer handles missing definitions gracefully
