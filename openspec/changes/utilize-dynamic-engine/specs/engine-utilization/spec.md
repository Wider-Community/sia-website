## ADDED Requirements

### Requirement: Flow Runner Page
The system SHALL provide a user-facing page at `/portal/flows/:flowId` that renders a dynamic multi-stage flow, allowing users to fill forms, navigate between stages, and experience conditional branching — all driven by the engine's flow definitions.

#### Scenario: Start a new flow session
- **WHEN** a user navigates to `/portal/flows/:flowId`
- **THEN** the system SHALL create a new flow session (CONTEXT node)
- **AND** render the entry stage with its component instances resolved as interactive form fields
- **AND** display a stage progress indicator showing all stages and current position

#### Scenario: Submit a stage and advance
- **WHEN** a user fills all required fields and clicks "Next"
- **THEN** the system SHALL validate all fields against their validation rules
- **AND** save the stage data to the flow session's collectedData
- **AND** evaluate branch transitions to determine the next stage
- **AND** render the next stage's components

#### Scenario: Conditional branching at runtime
- **WHEN** a stage has multiple outgoing transitions with conditions
- **AND** the user's data matches a conditional transition
- **THEN** the system SHALL route to the matching target stage (not the default)
- **AND** display the BranchSelector component if user choice is required

#### Scenario: Navigate back
- **WHEN** a user clicks "Back" during a flow
- **THEN** the system SHALL return to the previous stage with previously entered data preserved

#### Scenario: Complete a flow
- **WHEN** a user submits the terminal stage
- **THEN** the system SHALL mark the session as completed
- **AND** display a summary of all collected data
- **AND** emit a `flow.completed` event on the engine event bus

#### Scenario: Resume an abandoned flow
- **WHEN** a user returns to a flow they previously started but didn't finish
- **THEN** the system SHALL resume from the last visited stage with all collected data intact

---

### Requirement: Flow Launcher
The system SHALL provide a page at `/portal/flows` listing all available flows, allowing users to start new sessions or resume existing ones.

#### Scenario: List available flows
- **WHEN** a user navigates to `/portal/flows`
- **THEN** the system SHALL display all active flow definitions with name, description, stage count, and a "Start" button

#### Scenario: Show existing sessions
- **WHEN** a user has active (non-completed) sessions
- **THEN** the system SHALL display them with status, current stage, last activity, and a "Resume" button

---

### Requirement: Seed Component Definitions
The system SHALL provide a seed utility that pre-creates component definitions for SIA's core entity fields (organizations, contacts, engagements, matches) so the engine is immediately useful without manual definition creation.

#### Scenario: Seed from existing Zod schemas
- **WHEN** an administrator triggers seeding from the Control Board or on first engine initialization
- **THEN** the system SHALL use `migrateZodSchema()` to convert existing Zod schemas into component definitions
- **AND** create them in the Mujarrad registry if they don't already exist

#### Scenario: Seed experience templates
- **WHEN** seeding is triggered
- **THEN** the system SHALL instantiate the 3 built-in experience templates (Organization Onboarding, Deal Matching, Due Diligence) as ready-to-use flows

---

### Requirement: Dynamic Kanban Integration
The system SHALL integrate the DynamicKanban component into the portal to visualize flow sessions as a Kanban board with columns representing flow stages.

#### Scenario: Pipeline view with dynamic columns
- **WHEN** a user navigates to `/portal/pipeline` or a flow's Kanban view
- **THEN** the system SHALL render the DynamicKanban with columns from the flow's stage definitions
- **AND** display active sessions as cards in their current stage column

#### Scenario: Click card to view session
- **WHEN** a user clicks a session card in the Kanban
- **THEN** the system SHALL navigate to the flow runner at the session's current stage

---

### Requirement: Dynamic Filter Integration
The system SHALL integrate the DynamicFilterPanel into list pages, enabling schema-driven advanced filtering on any entity whose component definitions have data schemas.

#### Scenario: Advanced filter on organization list
- **WHEN** a user clicks "Advanced Filters" on a list page
- **THEN** the system SHALL derive filter dimensions from the entity's component schemas
- **AND** render the DynamicFilterPanel with appropriate filter controls
- **AND** apply selected filters to the Mujarrad query

---

### Requirement: Notification Center Integration
The system SHALL display engine notifications in the portal's existing notification UI so users see real-time alerts from the notification engine.

#### Scenario: In-app notification appears
- **WHEN** the notification engine dispatches an `in_app` notification
- **THEN** a toast notification SHALL appear in the portal UI via the existing sonner/notification provider
- **AND** the notification SHALL be added to the notification center

#### Scenario: Notification links to context
- **WHEN** a notification includes an `actionUrl`
- **THEN** clicking the notification SHALL navigate the user to the relevant page (e.g., the flow runner at the stage that triggered it)

---

### Requirement: Portal Navigation Integration
The system SHALL add engine-related pages to the portal sidebar navigation so users can discover and access flows, the Kanban view, and the Control Board.

#### Scenario: Sidebar shows engine pages
- **WHEN** the portal sidebar renders
- **THEN** it SHALL include navigation items for: Flows (flow launcher), Pipeline (Kanban), and Control Board (admin)

#### Scenario: Control Board restricted to admins
- **WHEN** a non-admin user views the sidebar
- **THEN** the Control Board link SHALL be hidden (using PermissionGate)

---

### Requirement: Engine Playground
The system SHALL provide a Playground tab in the Control Board where administrators can select any component definition and interact with a live preview, testing different locales and seeing the rendered output with real-time value tracking.

#### Scenario: Preview a component definition
- **WHEN** an admin selects a component definition in the Playground
- **THEN** the system SHALL render it with the correct renderer, default config, and i18n labels
- **AND** show the current value as the admin interacts with it

#### Scenario: Test Arabic locale
- **WHEN** an admin switches the locale to AR in the Playground
- **THEN** the component SHALL re-render with Arabic labels, RTL direction, and Arabic placeholder text

---

### Requirement: Organization Module Integration
The system SHALL provide engine-powered alternatives for the Organization module — a dynamic form driven by component definitions and advanced schema-driven filtering on the list page.

#### Scenario: Dynamic organization creation form
- **WHEN** a user navigates to `/portal/organizations/dynamic-create`
- **THEN** the system SHALL render organization fields using engine component definitions (if seeded)
- **AND** each field SHALL use the renderer assigned in its component definition
- **AND** on submit, create the organization via the existing refine data provider

#### Scenario: Fallback when engine not seeded
- **WHEN** no component definitions exist for organization fields
- **THEN** the system SHALL display a message directing the user to seed the engine from the Control Board

#### Scenario: Advanced filtering on organization list
- **WHEN** a user clicks "Advanced Filters" on the organization list page
- **THEN** the system SHALL show a DynamicFilterPanel with dimensions derived from the organization schema (name, type, status)
- **AND** applying filters SHALL update the list results

---

### Requirement: Matching Module Integration
The system SHALL integrate the engine's Deal Matching flow template into the Matches module, providing a flow-driven matching experience with conditional branching and a Kanban view of match progress.

#### Scenario: Start a matching flow
- **WHEN** a user navigates to `/portal/matches/flow`
- **AND** the Deal Matching flow template has been seeded
- **THEN** the system SHALL render the matching flow with 4 stages (org profile, matching criteria, preferences, review)
- **AND** conditional branching based on sector (e.g., energy → energy-specific compliance stage)

#### Scenario: Match Kanban view
- **WHEN** a user navigates to `/portal/matches/kanban`
- **THEN** the system SHALL display all matching sessions as a Kanban board with flow stages as columns
- **AND** clicking a card SHALL navigate to the flow runner to resume that session

#### Scenario: Match detail shows flow progress
- **WHEN** a user views a match detail page
- **THEN** the system SHALL show which flow stage the match is at and what data was collected per stage

---

### Requirement: Engagement Pipeline Integration
The system SHALL provide a Kanban pipeline view for engagements where columns represent engagement lifecycle stages, and an engine-driven form for creating engagements.

#### Scenario: Engagement pipeline Kanban
- **WHEN** a user navigates to `/portal/engagements/pipeline`
- **THEN** the system SHALL display all engagements as cards grouped by their stage field (introduction, engagement, negotiation, formalization, active)
- **AND** clicking a card SHALL navigate to the engagement detail page

#### Scenario: Dynamic engagement creation
- **WHEN** a user navigates to `/portal/engagements/dynamic-create`
- **THEN** the system SHALL render engagement fields using engine component definitions (if seeded)
- **AND** on submit, create the engagement via the existing refine data provider

---

### Requirement: Cross-Module Consistency
The system SHALL ensure that dynamic engine features are additive — they do NOT replace existing hardcoded pages but provide parallel engine-driven alternatives accessible via dedicated routes and buttons.

#### Scenario: Existing pages unchanged
- **WHEN** a user navigates to any existing portal page (e.g., `/portal/organizations/create`)
- **THEN** the original hardcoded form SHALL continue to work exactly as before

#### Scenario: Discovery of dynamic alternatives
- **WHEN** a user views a list page for organizations, matches, or engagements
- **THEN** the page SHALL show buttons/links to the engine-powered alternatives (e.g., "Create (Dynamic)", "Pipeline View", "Match Flow")

---

### Requirement: Error Resilience
The system SHALL gracefully handle cases where the engine is not seeded, Mujarrad is unreachable, or component definitions are missing — never showing a blank page or unhandled crash.

#### Scenario: Engine not seeded
- **WHEN** a user accesses an engine-driven page before seeding
- **THEN** the system SHALL display a clear message with a link to the Control Board to seed the engine

#### Scenario: Mujarrad API failure
- **WHEN** the Mujarrad API is unreachable during flow execution
- **THEN** the system SHALL display an error message with a retry option
- **AND** previously collected data in the session SHALL NOT be lost

#### Scenario: Missing component definition
- **WHEN** a flow stage references a component instance whose definition no longer exists
- **THEN** the system SHALL render the FallbackRenderer for that field instead of crashing
