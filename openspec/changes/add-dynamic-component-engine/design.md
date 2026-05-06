# Design: Dynamic Component Engine

## Context

SIA operates in a regulated, bilingual, multi-stakeholder environment where deal workflows differ by corridor, deal size, partner type, and regulatory regime. The current hardcoded approach cannot scale without proportional engineering cost. The Mujarrad knowledge graph already models entities as typed nodes with relationships — this proposal extends that abstraction to the UX layer itself.

**Stakeholders**: Business operators, deal facilitators, platform engineers, data architects
**Constraints**: Must work with existing Mujarrad SDK, maintain bilingual support, preserve SIA design system, minimize runtime performance overhead

## Goals / Non-Goals

### Goals
- Zero-code UX flow modification for business operators
- Real-time propagation of component changes across all instances
- Conditional branching in multi-step flows based on user input
- Component composability (simple → complex → composite)
- Advanced filtering leveraging complex component data structures
- Mujarrad-native storage (components as nodes, flows as relationships)
- Design task deliverables for architect/engineer/data-architect hiring

### Non-Goals
- Visual drag-and-drop page builder (phase 2, not phase 1)
- Custom CSS/styling per instance (use design tokens only)
- Third-party form builder integration (we build native)
- AI-generated components (future capability)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTROL BOARD (Admin UI)                   │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │Component │  │ Flow Designer│  │  Branch Rule Editor   │  │
│  │ Registry │  │ (Stages)     │  │  (Conditions)         │  │
│  └────┬─────┘  └──────┬───────┘  └───────────┬───────────┘  │
└───────┼────────────────┼──────────────────────┼──────────────┘
        │                │                      │
        ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              MUJARRAD KNOWLEDGE GRAPH                         │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  TEMPLATE   │    │  TEMPLATE   │    │    CONTEXT       │  │
│  │  Nodes      │    │  Nodes      │    │    Nodes         │  │
│  │ (Component  │    │ (Flow       │    │  (Active Flow    │  │
│  │  Defs)      │    │  Defs)      │    │   Instances)     │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬─────────┘  │
│         │                  │                     │            │
│         │    RELATIONSHIPS (has_stage,           │            │
│         │    branches_to, uses_component,        │            │
│         │    instance_of, next_stage)            │            │
│         └──────────────────┼─────────────────────┘            │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              DYNAMIC COMPONENT ENGINE (Runtime)               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Component   │  │    Flow      │  │    Branch        │   │
│  │  Resolver    │  │  Orchestrator│  │    Evaluator     │   │
│  │              │  │              │  │                   │   │
│  │ Registry →   │  │ Stage order  │  │ User input →     │   │
│  │ React render │  │ + transitions│  │ next stage calc  │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                  │                    │             │
│         ▼                  ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           REACT RENDER TREE (UI Output)                  │ │
│  │  Components rendered dynamically from resolved configs   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Component Definition (TEMPLATE Node)

```typescript
interface ComponentDefinition {
  id: string;                          // Mujarrad node ID
  type: 'TEMPLATE';                    // Mujarrad node type
  slug: string;                        // Human-readable identifier
  category: 'field' | 'composite' | 'layout' | 'action' | 'navigation';
  renderer: string;                    // React component key
  schema: JSONSchema7;                 // Data shape this component produces
  config: Record<string, unknown>;     // Default configuration
  validations: ValidationRule[];       // Built-in validation rules
  i18n: { en: Labels; ar: Labels };   // Bilingual labels
  composedOf?: string[];              // Child component definition IDs
  version: number;                     // For cache invalidation
}
```

### 2. Component Instance (REGULAR Node)

```typescript
interface ComponentInstance {
  id: string;                          // Instance node ID
  type: 'REGULAR';
  definitionId: string;                // → ComponentDefinition.id
  overrides: Partial<ComponentDefinition['config']>; // Instance-level overrides
  placement: {
    flowId: string;                    // Which flow this belongs to
    stageId: string;                   // Which stage
    order: number;                     // Position within stage
  };
}
```

### 3. Flow Definition (TEMPLATE Node)

```typescript
interface FlowDefinition {
  id: string;
  type: 'TEMPLATE';
  slug: string;                        // e.g., 'org-matching-flow'
  stages: StageDefinition[];           // Ordered stages
  entryConditions?: BranchRule[];      // Who can enter this flow
  metadata: { purpose: string; owner: string; };
}

interface StageDefinition {
  id: string;
  slug: string;                        // e.g., 'basic-info', 'sector-selection'
  components: string[];                // ComponentInstance IDs (ordered)
  exitBranches: BranchRule[];          // Conditional next-stage rules
  isTerminal: boolean;                 // End of flow?
}
```

### 4. Branch Rules (Conditional Routing)

```typescript
interface BranchRule {
  id: string;
  condition: {
    field: string;                     // Component output field path
    operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'contains' | 'matches';
    value: unknown;                    // Expected value
  }[];
  logic: 'AND' | 'OR';               // How to combine conditions
  targetStageId: string;              // Where to go if true
  priority: number;                   // Evaluation order (first match wins)
}
```

### 5. Mujarrad Node Mapping

| Concept | Mujarrad Node Type | Relationships |
|---------|-------------------|---------------|
| Component Definition | TEMPLATE | `composes` → child TEMPLATE nodes |
| Component Instance | REGULAR | `instance_of` → TEMPLATE, `belongs_to` → Stage |
| Flow Definition | TEMPLATE | `has_stage` → Stage TEMPLATEs |
| Stage Definition | TEMPLATE | `uses_component` → REGULAR instances, `branches_to` → Stage |
| Active Flow Session | CONTEXT | `executing` → Flow TEMPLATE, `at_stage` → current Stage |
| Branch Rule | ASSUMPTION | `evaluates` → Component output, `routes_to` → Stage |
| User Selection | REGULAR | `selected_branch` → next Stage |
| Notification Definition | TEMPLATE | `triggered_by` → Event, `delivers_via` → Channel |
| Notification Rule | REGULAR | `instance_of` → Notification TEMPLATE, `attached_to` → Stage/Component/Flow |
| Notification Channel | TEMPLATE | Configuration for delivery (email, in-app, push, SMS, webhook) |
| Escalation Chain | TEMPLATE | `escalates_to` → next Notification Rule after timeout |

### 6. Dynamic Notification Engine

```typescript
interface NotificationDefinition {
  id: string;                          // Mujarrad TEMPLATE node ID
  type: 'TEMPLATE';
  slug: string;                        // e.g., 'deal-stage-advancement'
  trigger: NotificationTrigger;        // What fires this notification
  channels: ChannelConfig[];           // Where to deliver (multi-channel)
  template: {
    en: MessageTemplate;               // English template with variables
    ar: MessageTemplate;               // Arabic template with variables
  };
  recipients: RecipientRule;           // Who receives it
  conditions: BranchRule[];            // Optional: only fire if conditions met
  escalation?: EscalationConfig;       // Optional: escalate if no action taken
  cooldown?: number;                   // Minimum ms between re-fires
  enabled: boolean;                    // Kill switch
  metadata: { category: string; priority: 'critical' | 'high' | 'medium' | 'low' };
}

interface NotificationTrigger {
  type: 'flow_event' | 'stage_transition' | 'component_action' |
        'data_change' | 'schedule' | 'threshold' | 'match_found';
  source: {
    flowId?: string;                   // Which flow (optional = all flows)
    stageId?: string;                  // Which stage
    componentId?: string;              // Which component
    eventName: string;                 // e.g., 'submitted', 'value_changed', 'entered'
  };
  filter?: BranchRule[];              // Additional conditions on event payload
}

interface ChannelConfig {
  channel: 'in_app' | 'email' | 'push' | 'sms' | 'webhook' | 'slack';
  templateOverride?: MessageTemplate;  // Channel-specific template
  config: Record<string, unknown>;     // Channel-specific settings
  fallback?: string;                   // Next channel if this one fails
}

interface MessageTemplate {
  subject?: string;                    // For email/push
  body: string;                        // Supports {{variable}} interpolation
  actionUrl?: string;                  // Deep link to relevant page
  actionLabel?: string;                // CTA button text
  variables: string[];                 // Available template variables
}

interface RecipientRule {
  type: 'role' | 'user' | 'relationship' | 'dynamic';
  roles?: string[];                    // e.g., ['deal_owner', 'counterparty']
  userIds?: string[];                  // Specific users
  relationship?: string;               // Mujarrad relationship to derive recipients
  dynamicResolver?: string;            // Custom resolver function key
}

interface EscalationConfig {
  timeout: number;                     // ms before escalation
  maxEscalations: number;              // How many times to escalate
  escalationChain: {
    level: number;
    recipientRule: RecipientRule;       // Who to escalate to
    channelOverride?: string;          // Switch channel on escalation
    templateOverride?: MessageTemplate;
  }[];
}
```

## Notification Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION CONTROL BOARD                                          │
│                                                                      │
│  ┌──────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │ Definition       │  │ Channel        │  │ Escalation          │  │
│  │ Manager          │  │ Configuration  │  │ Chain Editor        │  │
│  │                  │  │                │  │                     │  │
│  │ • Create/Edit    │  │ • Email (SMTP) │  │ • Timeout rules     │  │
│  │ • Trigger config │  │ • In-App       │  │ • Level progression │  │
│  │ • Template edit  │  │ • Push (FCM)   │  │ • Channel switching │  │
│  │ • Condition sets │  │ • SMS (Twilio) │  │ • Max attempts      │  │
│  │ • Enable/Disable │  │ • Webhook      │  │                     │  │
│  │ • Test/Preview   │  │ • Slack        │  │                     │  │
│  └──────────────────┘  └────────────────┘  └─────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ATTACHMENT MATRIX                                              │  │
│  │                                                                 │  │
│  │  Flow: [Org Matching ▼]                                         │  │
│  │  ┌────────────┬───────────────────────────────────────────────┐ │  │
│  │  │ Stage      │ Attached Notifications                        │ │  │
│  │  ├────────────┼───────────────────────────────────────────────┤ │  │
│  │  │ Basic Info │ ⚡ stage_entered → welcome_email              │ │  │
│  │  │            │ ⚡ submitted → admin_review_alert             │ │  │
│  │  ├────────────┼───────────────────────────────────────────────┤ │  │
│  │  │ Due Dilig. │ ⚡ stage_entered → counterparty_notify        │ │  │
│  │  │            │ ⚡ 48h_no_action → escalate_to_manager        │ │  │
│  │  ├────────────┼───────────────────────────────────────────────┤ │  │
│  │  │ Match Made │ ⚡ match_found → both_parties_notify          │ │  │
│  │  │            │ ⚡ match_found → kanban_card_created           │ │  │
│  │  └────────────┴───────────────────────────────────────────────┘ │  │
│  │                                                                 │  │
│  │  [+ Attach Notification]  [Bulk Assign]  [Import Template]      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Notification Event Flow

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  EVENT       │     │  NOTIFICATION    │     │  CHANNEL         │
│  SOURCE      │     │  ENGINE          │     │  DISPATCHER      │
│              │     │                  │     │                  │
│ • Stage      │     │ 1. Match event   │     │ • In-App toast   │
│   transition │────►│    to triggers   │────►│ • Email queue    │
│ • Component  │     │ 2. Eval          │     │ • Push (FCM)     │
│   action     │     │    conditions    │     │ • SMS gateway    │
│ • Data       │     │ 3. Resolve       │     │ • Webhook POST   │
│   change     │     │    recipients    │     │ • Slack message  │
│ • Threshold  │     │ 4. Interpolate   │     │                  │
│   breach     │     │    template      │     │                  │
│ • Schedule   │     │ 5. Dispatch to   │     │                  │
│   (cron)     │     │    channels      │     │                  │
└──────────────┘     └────────┬─────────┘     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  ESCALATION      │
                     │  MONITOR         │
                     │                  │
                     │ • Track delivery │
                     │ • Watch for ack  │
                     │ • Timeout →      │
                     │   escalate       │
                     │ • Log all events │
                     └──────────────────┘
```

## Notification + Component Engine Integration

```
┌─────────────────────────────────────────────────────────────┐
│  HOW NOTIFICATIONS ATTACH TO THE DYNAMIC ENGINE              │
│                                                              │
│  Component Instance                                          │
│  ┌─────────────────────┐                                     │
│  │ [Deal Size Field]   │──── on_value_change ────┐           │
│  └─────────────────────┘                         │           │
│                                                  ▼           │
│  Flow Stage                              Notification Rule   │
│  ┌─────────────────────┐                ┌────────────────┐   │
│  │ Stage: Due Diligence│── on_enter ───►│ Notify counter │   │
│  │                     │── on_exit ────►│ party + admin  │   │
│  │                     │── on_timeout ─►│ Escalate chain │   │
│  └─────────────────────┘                └────────────────┘   │
│                                                              │
│  Branch Selection                                            │
│  ┌─────────────────────┐                                     │
│  │ User chose: Energy  │── on_branch ───► Notify sector     │
│  │ sector path         │                   specialist team   │
│  └─────────────────────┘                                     │
│                                                              │
│  Match Event                                                 │
│  ┌─────────────────────┐                                     │
│  │ Criteria aligned    │── on_match ────► Notify both orgs  │
│  │ between Org A & B   │                  + create Kanban    │
│  └─────────────────────┘                  card + log event   │
│                                                              │
│  ATTACHMENT IS CONFIGURABLE:                                 │
│  Admin attaches notifications to ANY event from Control Board│
│  No code change needed. Add new notification → instant.      │
└─────────────────────────────────────────────────────────────┘
```

## Component Resolution Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Flow Stage │ ──► │  Instance    │ ──► │  Definition   │ ──► │   React      │
│  (ordered   │     │  Lookup      │     │  Resolve +    │     │   Render     │
│   instance  │     │  (REGULAR    │     │  Merge Config │     │   (dynamic   │
│   IDs)      │     │   nodes)     │     │  (overrides)  │     │    import)   │
└─────────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌───────────────┐
                                         │  Cache Layer  │
                                         │  (version-    │
                                         │   keyed)      │
                                         └───────────────┘
```

## Real-Time Propagation

```
Control Board Edit
        │
        ▼
┌──────────────────┐
│ Mujarrad Update  │ ──► Node version incremented
│ (TEMPLATE node)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ WebSocket Event  │ ──► Broadcast to all connected clients
│ (node.updated)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Component Cache  │ ──► Invalidate stale definitions
│ Invalidation     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ React Re-render  │ ──► All instances of updated component re-render
│ (automatic)      │
└──────────────────┘
```

## Conditional Branching Flow (User Experience)

```
┌─────────────────────────────────────────────────────────────┐
│  EXAMPLE: Organization Matching Flow                         │
│                                                              │
│  Stage 1: Basic Info Form                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Company Name]  [Sector]  [Deal Size Range]             │ │
│  └────────────────────────────────────────────────────────┬┘ │
│                                                           │   │
│  ═══════════════ BRANCH POINT ═══════════════════════════ │   │
│                                                           │   │
│  IF sector = "Technology"          IF sector = "Energy"    │   │
│         │                                  │               │   │
│         ▼                                  ▼               │   │
│  Stage 2A: Tech Due Diligence      Stage 2B: Energy       │   │
│  ┌────────────────────────┐        Compliance             │   │
│  │ [IP Portfolio]         │        ┌─────────────────┐    │   │
│  │ [Tech Stack]           │        │ [License Type]  │    │   │
│  │ [SaaS Metrics]         │        │ [ESG Score]     │    │   │
│  └────────────┬───────────┘        │ [Gov Approvals] │    │   │
│               │                    └────────┬────────┘    │   │
│               │                             │             │   │
│  ═════════════╪═════════════════════════════╪═════════════ │   │
│               └──────────────┬──────────────┘             │   │
│                              ▼                             │   │
│  Stage 3: Match Preferences (SHARED)                       │   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Target Geography]  [Investment Timeline]  [Deal Type] │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                             │   │
│                              ▼                             │   │
│  Stage 4: Review & Submit                                   │   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Summary View — all collected data rendered dynamically]│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Control Board UI Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONTROL BOARD                                            [SIA Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌───────────────────────────────────────────────┐ │
│  │ REGISTRY    │  │  COMPONENT EDITOR                              │ │
│  │             │  │                                                │ │
│  │ ▸ Fields    │  │  ┌─────────────────────────────────────────┐  │ │
│  │   • Text    │  │  │  Name: [Sector Selector]                │  │ │
│  │   • Number  │  │  │  Category: [composite ▼]                │  │ │
│  │   • Select  │  │  │  Renderer: [SectorTreeSelect]           │  │ │
│  │   • Date    │  │  │                                         │  │ │
│  │             │  │  │  Schema:                                 │  │ │
│  │ ▸ Composite │  │  │  ┌───────────────────────────────────┐  │  │ │
│  │   • Sector  │  │  │  │ { "type": "object",               │  │  │ │
│  │     Selector│  │  │  │   "properties": {                  │  │  │ │
│  │   • Address │  │  │  │     "primary": { "type": "string"},│  │  │ │
│  │     Block   │  │  │  │     "sub": { "type": "array" }     │  │  │ │
│  │   • Deal    │  │  │  │   }                                │  │  │ │
│  │     Metrics │  │  │  │ }                                   │  │  │ │
│  │             │  │  │  └───────────────────────────────────┘  │  │ │
│  │ ▸ Layouts   │  │  │                                         │  │ │
│  │   • Grid    │  │  │  Config:                                │  │ │
│  │   • Stack   │  │  │  [maxDepth: 3] [searchable: true]      │  │ │
│  │   • Tabs    │  │  │                                         │  │ │
│  │             │  │  │  Validations:                            │  │ │
│  │ ▸ Actions   │  │  │  [+ Add Rule]                           │  │ │
│  │   • Submit  │  │  │  • required: true                       │  │ │
│  │   • Branch  │  │  │  • minSelections: 1                     │  │ │
│  │     Select  │  │  │                                         │  │ │
│  │             │  │  │  i18n:                                  │  │ │
│  │             │  │  │  EN: [Select Sector]  AR: [اختر القطاع] │  │ │
│  └─────────────┘  │  └─────────────────────────────────────────┘  │ │
│                    │                                                │ │
│                    │  [Save Definition]  [Preview]  [Publish]       │ │
│                    └───────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  FLOW DESIGNER                                                 │  │
│  │                                                                │  │
│  │  Flow: [Organization Matching ▼]                               │  │
│  │                                                                │  │
│  │  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐│  │
│  │  │ Stage 1 │────►│ Stage 2 │────►│ Stage 3 │────►│ Stage 4 ││  │
│  │  │Basic    │     │Sector   │     │Match    │     │Review   ││  │
│  │  │Info     │     │Specific │     │Prefs    │     │& Submit ││  │
│  │  └─────────┘     └────┬────┘     └─────────┘     └─────────┘│  │
│  │                        │                                      │  │
│  │                   [+ Add Branch]                               │  │
│  │                   [+ Insert Stage]                             │  │
│  │                   [× Remove Stage]                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Complex Component Filtering Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  COMPLEX FILTER ENGINE                                       │
│                                                              │
│  Component: [Sector Selector]                                │
│  Data Structure:                                             │
│  {                                                           │
│    primary: "Technology",                                    │
│    sub: ["FinTech", "SaaS", "AI/ML"],                       │
│    tags: ["high-growth", "regulated"],                       │
│    metrics: { avgDealSize: 5000000, successRate: 0.72 }     │
│  }                                                           │
│                                                              │
│  Filter Capabilities (auto-derived from schema):             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ primary     │ eq, neq, in           │ dropdown         │  │
│  │ sub[]       │ contains, overlaps    │ multi-select     │  │
│  │ tags[]      │ contains, all_of      │ tag picker       │  │
│  │ metrics.*   │ gt, lt, between       │ range slider     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  The filter UI is GENERATED from the component schema.       │
│  Complex components = complex filterable dimensions.          │
│  New components automatically expose new filter criteria.     │
└─────────────────────────────────────────────────────────────┘
```

## Decisions

### Decision 1: Mujarrad-Native Component Storage
**What**: Store all component definitions, instances, flows, and rules as Mujarrad nodes with typed relationships.
**Why**: Leverages existing knowledge graph; enables relationship-based queries (e.g., "all flows using this component"); aligns with Mujarrad's abstraction philosophy where everything is a node.
**Alternatives considered**:
- JSON config files → No real-time propagation, no relationship queries
- Separate DB → Adds infrastructure, fragments data model
- Headless CMS → Doesn't model relationships, external dependency

### Decision 2: TEMPLATE Nodes for Definitions, REGULAR for Instances
**What**: Component/flow definitions are TEMPLATE nodes; placed instances are REGULAR nodes with `instance_of` relationships.
**Why**: Matches Mujarrad's existing type semantics — TEMPLATEs are blueprints, REGULARs are concrete. Update a TEMPLATE, all REGULAR instances inherit changes.
**Alternatives considered**:
- All as REGULAR nodes → Loses template/instance distinction
- ASSUMPTION for drafts → Used for draft components before publishing (kept as secondary)

### Decision 3: JSON Schema for Component Data Shapes
**What**: Each component definition declares its output schema in JSON Schema 7.
**Why**: Enables automatic validation, filter UI generation, type-safe data flow between stages, and documentation.

### Decision 4: WebSocket for Real-Time Propagation
**What**: Mujarrad node updates broadcast via WebSocket; clients invalidate cached definitions.
**Why**: Instant propagation without polling; aligns with refine's real-time provider pattern.

### Decision 5: Component Resolver with Dynamic Import
**What**: Runtime maps `renderer` string → lazy-loaded React component via a registry.
**Why**: Allows adding new renderers without rebuilding; keeps bundle size manageable.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Performance: dynamic resolution adds latency | Aggressive caching; pre-resolve on flow entry; lazy load renderers |
| Complexity: over-abstraction for simple forms | Provide "quick form" shortcut that still uses engine underneath |
| Consistency: broken flows from bad config | Validation rules in Control Board; preview mode; rollback capability |
| Migration: existing hardcoded forms | Gradual migration; compatibility adapter renders old components via engine |
| Security: arbitrary component injection | Renderer allowlist; sandboxed config; role-based Control Board access |

## Migration Plan

1. **Phase 0 (Foundation)**: Build Component Registry, Resolver, and basic TEMPLATE/REGULAR node structure
2. **Phase 1 (Simple Fields)**: Migrate existing form fields to registry-backed instances
3. **Phase 2 (Flows)**: Add Flow Engine and stage orchestration
4. **Phase 3 (Branching)**: Add conditional routing and branch rules
5. **Phase 4 (Control Board)**: Build admin UI for real-time configuration
6. **Phase 5 (Complex Filters)**: Schema-derived filter engine
7. **Phase 6 (Experience Builder)**: Compose entire new experiences from existing components

Each phase is independently deployable and adds value.

## Open Questions

- What is the WebSocket infrastructure status in Mujarrad? Do we need to add real-time event support?
- Should branch rules support external API calls (e.g., check regulatory compliance before routing)?
- What is the maximum acceptable latency for component resolution (target: <50ms)?
- Should we support component versioning with rollback, or is "latest always wins" acceptable?
- How do we handle offline/degraded mode — cache last-known-good definitions?
