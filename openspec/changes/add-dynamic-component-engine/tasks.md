# Tasks: Dynamic Component Engine

## Design Phase (Hire & Deliver)

### 0. Team Assembly & Mission Brief
- [ ] 0.1 Define hiring brief for Software Architect (component engine + Mujarrad integration specialist)
- [ ] 0.2 Define hiring brief for Software Engineer (React runtime resolver + WebSocket propagation)
- [ ] 0.3 Define hiring brief for Data Architect (schema evolution, unknown-schema handling, big-data extraction → Mujarrad mapping)
- [ ] 0.4 Define hiring brief for Agentic Teams lead (AI-driven schema discovery, auto-component generation)
- [ ] 0.5 Create mission document with success criteria, timeline, and deliverables

### 1. Architecture Design (Software Architect)
- [ ] 1.1 Design Component Registry data model (TEMPLATE nodes, relationships, versioning)
- [ ] 1.2 Design Flow Engine state machine (stages, transitions, branch evaluation)
- [ ] 1.3 Design Component Resolver pipeline (definition lookup → config merge → React render)
- [ ] 1.4 Design real-time propagation protocol (Mujarrad events → WebSocket → cache invalidation)
- [ ] 1.5 Design Control Board interaction model (CRUD operations on registry/flows)
- [ ] 1.6 Design schema-unknown handling: how to present/filter data whose structure is discovered at runtime
- [ ] 1.7 Design Kanban stage management for deal progression with dynamic columns
- [ ] 1.8 Produce architecture decision records (ADRs) for each major decision
- [ ] 1.9 Deliver system context diagram (C4 Level 1)
- [ ] 1.10 Deliver container diagram (C4 Level 2)
- [ ] 1.11 Deliver component diagram (C4 Level 3) for engine internals

### 2. Data Architecture (Data Architect)
- [ ] 2.1 Design Mujarrad node schema for component definitions (TEMPLATE type extensions)
- [ ] 2.2 Design Mujarrad node schema for component instances (REGULAR type with instance_of)
- [ ] 2.3 Design Mujarrad node schema for flow definitions and stage ordering
- [ ] 2.4 Design branch rule storage and evaluation model
- [ ] 2.5 Design schema evolution strategy: how new fields auto-surface in UI
- [ ] 2.6 Design big-data extraction → structured node pipeline (unknown schema → discovered schema → component mapping)
- [ ] 2.7 Design complex component filtering data model (schema → filter dimensions)
- [ ] 2.8 Design matching criteria discovery model: how extracted data becomes matchable attributes
- [ ] 2.9 Define relationship types catalog (instance_of, belongs_to, branches_to, etc.)
- [ ] 2.10 Deliver ERD / knowledge graph schema diagrams

### 3. Engineering Design (Software Engineer)
- [ ] 3.1 Design React component resolver with dynamic imports and lazy loading
- [ ] 3.2 Design caching strategy (definition cache, instance cache, invalidation protocol)
- [ ] 3.3 Design Control Board UI architecture (admin panels, editors, preview)
- [ ] 3.4 Design bilingual support for dynamic components (i18n in TEMPLATE nodes)
- [ ] 3.5 Design migration path: hardcoded components → engine-driven components
- [ ] 3.6 Design schema-adaptive UI: render appropriate controls for unknown/evolving data shapes
- [ ] 3.7 Design Kanban board component with dynamic columns from flow stages
- [ ] 3.8 Design complex filter UI generation from JSON Schema
- [ ] 3.9 Produce sequence diagrams for key flows (render, update, branch)
- [ ] 3.10 Produce API contract for Control Board ↔ Mujarrad interactions

### 4. Agentic Teams Design
- [ ] 4.1 Design AI agent for schema discovery (extract structure from unstructured/semi-structured data)
- [ ] 4.2 Design AI agent for component suggestion (given discovered schema → suggest UI components)
- [ ] 4.3 Design AI agent for matching criteria inference (given two org profiles → suggest matchable dimensions)
- [ ] 4.4 Design AI agent for flow optimization (analyze user drop-offs → suggest stage modifications)
- [ ] 4.5 Design human-in-the-loop workflow for agent-suggested changes (propose → review → approve → deploy)
- [ ] 4.6 Produce agent interaction diagrams

### 4B. Notification Engine Design (Cross-Team)
- [ ] 4B.1 Design notification definition data model (TEMPLATE nodes: triggers, channels, templates, escalation)
- [ ] 4B.2 Design notification trigger attachment model (how notifications bind to flow events, stage transitions, component actions, data changes, matches)
- [ ] 4B.3 Design multi-channel dispatch architecture (in-app, email, push, SMS, webhook, Slack) with fallback chains
- [ ] 4B.4 Design bilingual template interpolation engine (variable resolution from event context + Mujarrad node data)
- [ ] 4B.5 Design escalation chain state machine (timeout tracking, level progression, acknowledgment handling)
- [ ] 4B.6 Design notification analytics pipeline (delivery metrics, engagement tracking, escalation frequency)
- [ ] 4B.7 Design Control Board UI for notification management (definition CRUD, attachment matrix, channel config, escalation editor, test/preview)
- [ ] 4B.8 Design notification + dynamic engine integration points (event bus, context propagation, schema-adaptive variables)
- [ ] 4B.9 Design notification growth model (how new notification types can be added without code, agentic suggestions for underperforming notifications)
- [ ] 4B.10 Design recipient resolution strategies (role-based, relationship-based, dynamic resolver)
- [ ] 4B.11 Produce notification engine sequence diagrams (trigger → evaluate → dispatch → escalate)
- [ ] 4B.12 Produce notification channel architecture diagram

### 4C. Authorization Model Design (Cross-Team)
- [ ] 4C.1 Design RBAC role definitions (superadmin, architect, operator, publisher, viewer, analyst)
- [ ] 4C.2 Design ReBAC relationship model (owns, can_edit, can_configure, can_publish, delegates_to)
- [ ] 4C.3 Design scope constraint system (corridor-scoped, flow-scoped, category-scoped permissions)
- [ ] 4C.4 Design publish gate (maker-checker pattern: ASSUMPTION draft → approval → TEMPLATE promotion)
- [ ] 4C.5 Design authorization check pipeline (RBAC → ReBAC → Scope → Publish Gate)
- [ ] 4C.6 Design permission grant Mujarrad schema (node type, relationships, expiry, conditions)
- [ ] 4C.7 Design delegation model (owner grants sub-permissions without superadmin)
- [ ] 4C.8 Design audit trail schema and queryability
- [ ] 4C.9 Design Control Board UI for authorization management (roles, grants, approvals, audit)
- [ ] 4C.10 Design permission caching strategy (avoid per-action API calls)
- [ ] 4C.11 Produce authorization flow diagrams (check pipeline, publish gate, delegation)

### 5. Integration Design
- [ ] 5.1 Design how existing matching-system change integrates with dynamic engine
- [ ] 5.2 Design how existing refactor-mujarrad-data-layer change enables this system
- [ ] 5.3 Design rollback and versioning strategy for production safety
- [ ] 5.4 Design performance budget and monitoring for dynamic resolution overhead
- [ ] 5.5 Design security model for Control Board access and component sandboxing

### 6. Deliverable Compilation
- [ ] 6.1 Compile all diagrams into a single architecture document
- [ ] 6.2 Create executive summary showing value proposition and cost-of-change reduction
- [ ] 6.3 Create technical specification for implementation handoff
- [ ] 6.4 Create hiring rubrics aligned to design deliverables
- [ ] 6.5 Present to stakeholders for approval

## Implementation Phase (Post-Approval)

### 7. Foundation (Phase 0)
- [ ] 7.1 Implement Component Registry (Mujarrad TEMPLATE CRUD)
- [ ] 7.2 Implement Component Resolver (lookup → merge → render)
- [ ] 7.3 Implement basic renderer registry (string → React component map)
- [ ] 7.4 Implement schema-adaptive field renderer (JSON Schema → appropriate input)

### 8. Simple Fields (Phase 1)
- [ ] 8.1 Migrate text/number/select fields to registry-backed instances
- [ ] 8.2 Implement instance override mechanism
- [ ] 8.3 Implement bilingual label resolution

### 9. Flow Engine (Phase 2)
- [ ] 9.1 Implement Flow Definition CRUD
- [ ] 9.2 Implement Stage orchestrator (ordered rendering, transitions)
- [ ] 9.3 Implement flow session tracking (CONTEXT nodes)
- [ ] 9.4 Implement Kanban view for flow stage management

### 10. Branching (Phase 3)
- [ ] 10.1 Implement Branch Rule evaluator
- [ ] 10.2 Implement conditional stage routing
- [ ] 10.3 Implement branch selection UI component

### 11. Control Board (Phase 4)
- [ ] 11.1 Implement Component Registry admin UI
- [ ] 11.2 Implement Flow Designer admin UI
- [ ] 11.3 Implement Branch Rule editor
- [ ] 11.4 Implement real-time preview
- [ ] 11.5 Implement WebSocket propagation

### 12. Complex Filters (Phase 5)
- [ ] 12.1 Implement schema-to-filter-dimension mapper
- [ ] 12.2 Implement dynamic filter UI generator
- [ ] 12.3 Implement filter query builder for Mujarrad

### 13. Notification Engine (Phase 5B)
- [ ] 13.1 Implement Notification Definition CRUD (Mujarrad TEMPLATE nodes)
- [ ] 13.2 Implement trigger attachment system (bind notifications to flow/stage/component events)
- [ ] 13.3 Implement event bus for notification triggers (listen to engine events)
- [ ] 13.4 Implement multi-channel dispatcher (in-app, email, push, SMS, webhook)
- [ ] 13.5 Implement bilingual template interpolation with context variable resolution
- [ ] 13.6 Implement escalation chain state machine (timeout, level progression, ack)
- [ ] 13.7 Implement recipient resolution (role-based, relationship-based, dynamic)
- [ ] 13.8 Implement Control Board: notification definition manager
- [ ] 13.9 Implement Control Board: attachment matrix UI (visual bind to events)
- [ ] 13.10 Implement Control Board: escalation chain editor
- [ ] 13.11 Implement Control Board: test/preview notification
- [ ] 13.12 Implement notification analytics dashboard (delivery, engagement, escalation metrics)
- [ ] 13.13 Implement cooldown and deduplication logic
- [ ] 13.14 Implement notification preferences (user opt-in/out per channel/category)

### 14. Authorization Module (Phase 4B)
- [ ] 14.1 Implement RBAC role assignment and checking
- [ ] 14.2 Implement ReBAC relationship-based permission checks (graph traversal)
- [ ] 14.3 Implement scope constraint evaluation (corridor, flow, category)
- [ ] 14.4 Implement publish gate workflow (draft → request publish → approve/reject → promote)
- [ ] 14.5 Implement permission grant CRUD (grant, revoke, delegate, expire)
- [ ] 14.6 Implement permission caching (session-scoped, invalidate on grant changes)
- [ ] 14.7 Implement Control Board: role & member management UI
- [ ] 14.8 Implement Control Board: resource permission matrix UI
- [ ] 14.9 Implement Control Board: pending approvals queue UI
- [ ] 14.10 Implement Control Board: audit trail viewer with filters
- [ ] 14.11 Implement authorization middleware (wraps all Control Board actions)
- [ ] 14.12 Implement UI-level permission gates (hide/disable actions user can't perform)

### 15. Experience Builder (Phase 6)
- [ ] 14.1 Implement full-page composition from registry components
- [ ] 14.2 Implement experience templates (pre-configured flow + component sets)
- [ ] 14.3 Implement agentic suggestions integration
