## ADDED Requirements

### Requirement: Component Registry
The system SHALL maintain a centralized registry of component definitions stored as Mujarrad TEMPLATE nodes, where each definition declares its renderer, data schema, configuration, validations, and bilingual labels.

#### Scenario: Register new component definition
- **WHEN** an administrator creates a new component definition in the Control Board
- **THEN** a TEMPLATE node is created in Mujarrad with the component's schema, config, renderer key, and i18n labels
- **AND** the component becomes immediately available for placement in any flow

#### Scenario: Update component definition propagates to all instances
- **WHEN** an administrator modifies a component definition (e.g., adds a validation rule)
- **THEN** all instances referencing that definition inherit the change
- **AND** all active UIs rendering those instances re-render with the updated definition

#### Scenario: Component categories
- **WHEN** querying the registry
- **THEN** components SHALL be categorized as: field, composite, layout, action, or navigation

---

### Requirement: Component Instance Resolution
The system SHALL resolve component instances by looking up their TEMPLATE definition, merging instance-level overrides, and rendering the appropriate React component dynamically.

#### Scenario: Render a component instance
- **WHEN** the engine encounters a component instance ID in a flow stage
- **THEN** it SHALL resolve the instance's definition via `instance_of` relationship
- **AND** merge instance overrides with definition defaults
- **AND** dynamically import and render the React component identified by the `renderer` key

#### Scenario: Cache invalidation on definition update
- **WHEN** a component definition's version is incremented
- **THEN** all cached resolutions for instances of that definition SHALL be invalidated
- **AND** subsequent renders SHALL use the new definition

---

### Requirement: Dynamic Flow Engine
The system SHALL orchestrate multi-stage UX flows where stages are ordered sequences of component instances, configurable in real-time without code changes.

#### Scenario: Execute a linear flow
- **WHEN** a user enters a flow
- **THEN** stages SHALL be presented in configured order
- **AND** each stage renders its component instances in their configured positions

#### Scenario: Add a new stage to an existing flow
- **WHEN** an administrator inserts a new stage into a flow via the Control Board
- **THEN** all future flow sessions SHALL include the new stage
- **AND** no code deployment is required

#### Scenario: Remove a stage from a flow
- **WHEN** an administrator removes a stage from a flow
- **THEN** active sessions past that stage are unaffected
- **AND** new sessions skip the removed stage

---

### Requirement: Conditional Branching
The system SHALL support conditional routing between stages based on user input, where branch rules evaluate component output data to determine the next stage.

#### Scenario: Branch based on user selection
- **WHEN** a user completes a stage containing a branch-triggering component
- **AND** the component's output matches a branch rule condition
- **THEN** the flow SHALL route to the target stage specified by the matching rule

#### Scenario: Default branch when no conditions match
- **WHEN** no branch rule conditions match the user's input
- **THEN** the flow SHALL proceed to the default next stage (linear order)

#### Scenario: Multiple branch rules with priority
- **WHEN** multiple branch rules could match
- **THEN** the rule with the highest priority (lowest number) SHALL win

---

### Requirement: Control Board Administration
The system SHALL provide a centralized admin dashboard (Control Board) for managing component definitions, flow configurations, stage ordering, and branch rules in real-time.

#### Scenario: Create component definition
- **WHEN** an admin accesses the Control Board component registry
- **THEN** they SHALL be able to create new definitions with schema, config, renderer, validations, and i18n

#### Scenario: Design flow stages
- **WHEN** an admin accesses the Flow Designer
- **THEN** they SHALL be able to add, remove, reorder stages and assign component instances

#### Scenario: Configure branch rules
- **WHEN** an admin accesses a stage's exit configuration
- **THEN** they SHALL be able to define conditional branch rules with field paths, operators, values, and target stages

#### Scenario: Preview before publish
- **WHEN** an admin makes changes in the Control Board
- **THEN** they SHALL be able to preview the effect before publishing to production

---

### Requirement: Schema-Adaptive Rendering
The system SHALL automatically generate appropriate UI controls for data whose schema is discovered at runtime (from big-data extraction or evolving Mujarrad node structures), without requiring pre-built component definitions.

#### Scenario: Render unknown schema fields
- **WHEN** a Mujarrad node contains fields not covered by an existing component definition
- **THEN** the system SHALL infer appropriate renderers from the JSON Schema type (string → text input, number → number input, array → multi-select, object → nested form)

#### Scenario: Schema evolution surfaces new fields
- **WHEN** a data extraction pipeline adds new attributes to a node type
- **THEN** those fields SHALL automatically appear in relevant flows/forms using schema-adaptive rendering
- **AND** an admin MAY later promote them to full component definitions with custom renderers

---

### Requirement: Complex Component Filtering
The system SHALL auto-derive filterable dimensions from component schemas, enabling advanced queries that leverage the full data structure of complex components.

#### Scenario: Generate filter UI from schema
- **WHEN** a user accesses a list/search view containing complex component data
- **THEN** the system SHALL present filter controls derived from the component's JSON Schema
- **AND** each schema property type maps to an appropriate filter operator set

#### Scenario: Filter by nested component data
- **WHEN** a component schema defines nested objects or arrays
- **THEN** the filter engine SHALL support dot-path queries into nested structures

---

### Requirement: Dynamic Matching Criteria
The system SHALL support matching criteria that are not predefined but discovered through data extraction and schema analysis, enabling the platform to match organizations on dimensions that emerge from their data rather than hardcoded attributes.

#### Scenario: Discover matchable dimensions
- **WHEN** structured data is extracted from organization documents and stored in Mujarrad
- **THEN** the system SHALL analyze the schema to identify potential matching dimensions
- **AND** surface them as configurable matching criteria in the Control Board

#### Scenario: Grow interaction stages based on match
- **WHEN** two organizations are matched on discovered criteria
- **THEN** the system SHALL dynamically generate appropriate next-step flows (due diligence, document exchange, negotiation)
- **AND** these stages SHALL be manageable via a Kanban board interface

---

### Requirement: Kanban Stage Management
The system SHALL provide a Kanban board view for managing deal/opportunity progression through dynamically configured flow stages.

#### Scenario: Visualize deal stages as Kanban columns
- **WHEN** a user views their active deals/opportunities
- **THEN** each flow stage SHALL appear as a Kanban column
- **AND** deals appear as cards in their current stage column

#### Scenario: Dynamic columns from flow configuration
- **WHEN** an admin adds or removes stages from a flow via the Control Board
- **THEN** the Kanban board SHALL reflect the updated columns without code changes

---

### Requirement: Dynamic Notification Definitions
The system SHALL maintain notification definitions as Mujarrad TEMPLATE nodes, where each definition declares its trigger, channels, message templates, recipient rules, conditions, and escalation chains — all configurable from the Control Board without code changes.

#### Scenario: Create notification definition
- **WHEN** an administrator creates a new notification definition in the Control Board
- **THEN** a TEMPLATE node is created in Mujarrad with trigger config, channel list, bilingual templates, and recipient rules
- **AND** the notification becomes immediately available for attachment to flows/stages/components

#### Scenario: Update notification definition propagates
- **WHEN** an administrator modifies a notification definition (e.g., changes template text or adds a channel)
- **THEN** all attached instances of that notification inherit the change immediately
- **AND** subsequent triggers use the updated definition

#### Scenario: Disable notification without removal
- **WHEN** an administrator sets a notification definition's `enabled` flag to false
- **THEN** the notification SHALL stop firing for all attached instances
- **AND** the attachment configuration is preserved for re-enabling

---

### Requirement: Notification Trigger Attachment
The system SHALL allow notifications to be attached to any event source in the dynamic engine — flow events, stage transitions, component actions, data changes, thresholds, schedule, or match events — via configurable trigger rules.

#### Scenario: Attach notification to stage transition
- **WHEN** an administrator attaches a notification to a stage's `on_enter` event
- **THEN** the notification SHALL fire whenever any user enters that stage in any active flow session

#### Scenario: Attach notification to component action
- **WHEN** an administrator attaches a notification to a component's `on_value_change` event with a condition (e.g., deal_size > 10M)
- **THEN** the notification SHALL fire only when the component value changes AND the condition is met

#### Scenario: Attach notification to match event
- **WHEN** an administrator attaches a notification to the `match_found` system event
- **THEN** the notification SHALL fire when the matching engine discovers a new alignment between organizations
- **AND** both parties receive notifications through their configured channels

#### Scenario: Attach multiple notifications to same event
- **WHEN** multiple notification rules are attached to the same event source
- **THEN** all attached notifications SHALL evaluate independently and fire based on their own conditions

---

### Requirement: Multi-Channel Notification Delivery
The system SHALL support delivering notifications through multiple configurable channels (in-app, email, push, SMS, webhook, Slack) with per-channel templates and fallback chains.

#### Scenario: Deliver via primary channel
- **WHEN** a notification is triggered and the recipient's preferred channel is available
- **THEN** the notification SHALL be delivered via the configured primary channel

#### Scenario: Fallback to secondary channel
- **WHEN** the primary channel delivery fails (e.g., email bounces)
- **THEN** the system SHALL attempt delivery via the configured fallback channel

#### Scenario: Multi-channel simultaneous delivery
- **WHEN** a notification definition specifies multiple channels (e.g., in-app AND email)
- **THEN** the notification SHALL be delivered to all specified channels simultaneously

---

### Requirement: Notification Template Interpolation
The system SHALL support bilingual (EN/AR) message templates with variable interpolation, where variables are resolved from the triggering event's context data (component values, user info, flow state).

#### Scenario: Interpolate template variables
- **WHEN** a notification fires with template "{{org_name}} has entered {{stage_name}}"
- **THEN** the system SHALL resolve org_name and stage_name from the event context
- **AND** deliver the interpolated message in the recipient's preferred language

#### Scenario: Dynamic variables from discovered schema
- **WHEN** a notification template references a variable that maps to a schema-adaptive field
- **THEN** the system SHALL resolve the variable from the Mujarrad node's current data
- **AND** handle missing fields gracefully with configurable fallback text

---

### Requirement: Notification Escalation Chains
The system SHALL support configurable escalation chains that progressively notify higher-authority recipients and/or switch channels when a notification is not acknowledged within a timeout period.

#### Scenario: Escalate on timeout
- **WHEN** a notification requiring acknowledgment is not acknowledged within the configured timeout
- **THEN** the system SHALL escalate to the next level in the chain (e.g., notify the manager)
- **AND** optionally switch to a more urgent channel (e.g., email → SMS)

#### Scenario: Maximum escalation reached
- **WHEN** the escalation chain reaches its maximum configured level without acknowledgment
- **THEN** the system SHALL mark the notification as `escalation_exhausted`
- **AND** log the event for audit purposes

#### Scenario: Acknowledge stops escalation
- **WHEN** a recipient acknowledges a notification at any escalation level
- **THEN** the escalation chain SHALL halt immediately
- **AND** the acknowledgment is recorded with timestamp and user

---

### Requirement: Notification Analytics and Growth
The system SHALL track notification delivery, open rates, acknowledgment rates, and escalation frequency, enabling data-driven growth of the notification module.

#### Scenario: Track delivery metrics
- **WHEN** a notification is dispatched
- **THEN** the system SHALL record: trigger time, delivery time, channel used, recipient, delivery status

#### Scenario: Identify underperforming notifications
- **WHEN** an administrator views notification analytics in the Control Board
- **THEN** they SHALL see open rates, click-through rates, acknowledgment rates, and escalation frequency per notification definition

#### Scenario: Suggest notification improvements
- **WHEN** a notification shows consistently low engagement (configurable threshold)
- **THEN** the system SHALL flag it for review in the Control Board
- **AND** optionally surface agentic suggestions for template/channel/timing improvements

---

### Requirement: Engine Authorization Model
The system SHALL enforce a hybrid RBAC + ReBAC authorization model that controls who can create, modify, delete, publish, and configure engine resources (component definitions, flows, stages, notifications) — with role-based coarse access, relationship-based resource ownership, scope constraints, and a maker-checker publish gate.

#### Scenario: Role-based action control
- **WHEN** a user attempts an action in the Control Board (e.g., create a component definition)
- **THEN** the system SHALL check if the user's assigned role permits that action type
- **AND** deny with a clear reason if the role is insufficient

#### Scenario: Resource ownership (ReBAC)
- **WHEN** a user with `engine_operator` role attempts to modify a flow
- **THEN** the system SHALL verify the user has an `owns` or `can_edit` relationship to that specific flow
- **AND** deny if no relationship exists, even though the role permits the action type in general

#### Scenario: Scope constraint enforcement
- **WHEN** a user has permissions scoped to a specific corridor (e.g., KSA-MY)
- **THEN** the system SHALL deny actions on resources belonging to other corridors
- **AND** only show in-scope resources in the Control Board UI

#### Scenario: Publish gate (maker-checker separation)
- **WHEN** a user creates or modifies a configuration (saved as ASSUMPTION/draft)
- **AND** requests publication to production
- **THEN** a different user with `can_publish` or `engine_publisher` role MUST approve
- **AND** the maker SHALL NOT be able to self-approve (except engine_superadmin)

#### Scenario: Permission delegation
- **WHEN** a resource owner grants `can_edit` or `can_configure` to another user
- **THEN** the delegated user SHALL be able to perform those actions on that specific resource
- **AND** the delegation SHALL be recorded in the audit trail

#### Scenario: Authorization audit trail
- **WHEN** any authorization check occurs (allow or deny)
- **THEN** the system SHALL log: user, action, resource, result, timestamp
- **AND** make the audit trail queryable from the Control Board

---

### Requirement: Real-Time Propagation
The system SHALL propagate configuration changes from the Control Board to all active clients in real-time via WebSocket events, ensuring immediate consistency without page reload.

#### Scenario: Component definition update propagates
- **WHEN** a component definition is updated in the Control Board
- **THEN** all connected clients rendering instances of that component SHALL receive a WebSocket event
- **AND** re-render with the updated definition within 2 seconds

#### Scenario: Flow structure change propagates
- **WHEN** a flow's stage structure is modified
- **THEN** clients currently in that flow SHALL be notified
- **AND** new navigation reflects the updated structure (without losing current stage progress)
