# Mission Brief: Dynamic Component Engine R&D

## Mission Statement

Design and build a **Mujarrad-native dynamic component engine** that eliminates the cost of change in SIA's UX layer by making all forms, flows, stages, notifications, and matching criteria configurable at runtime — without code changes or deployments.

## The Problem We're Solving

SIA facilitates B2B deal matching across the Saudi Arabia-Malaysia investment corridor. The fundamental challenge:

1. **We don't know the matching criteria at build time** — they're extracted from big-data files (financial reports, regulatory documents, company profiles)
2. **The schema of structured data is discovered, not predefined** — new corridors/sectors introduce new dimensions
3. **The frontend can't present what it doesn't know exists** — hardcoded UIs are structurally incapable of evolving with the data
4. **Deal interaction stages must grow dynamically** — as matches deepen, new steps (due diligence, compliance, negotiation) emerge from context

## Success Criteria

| Metric | Target |
|--------|--------|
| Time to add a new form field | < 2 minutes (Control Board config, zero code) |
| Time to add a new flow stage | < 5 minutes (Control Board config, zero code) |
| Time for schema-discovered data to surface in UI | Automatic (< 30 seconds after extraction) |
| Component definition update propagation | < 2 seconds to all active clients |
| Notification attachment to new event | < 1 minute (Control Board config) |
| New corridor onboarding (full UX) | Hours, not weeks |
| Runtime resolution overhead | < 50ms per component |

## Deliverables

### Phase: Design (Current)
1. Architecture Decision Records (ADRs) for each major decision
2. C4 Diagrams (Level 1: System Context, Level 2: Container, Level 3: Component)
3. Sequence diagrams for key runtime flows
4. Data model specifications (Mujarrad node schemas)
5. Hiring briefs for each role
6. Executive summary for stakeholder presentation

### Phase: Implementation (Post-Approval)
7. Component Registry + Resolver (Foundation)
8. Flow Engine + Stage Orchestrator
9. Conditional Branching Engine
10. Control Board Admin UI
11. Dynamic Notification Engine
12. Complex Filter Engine
13. Experience Builder

## Team Composition

| Role | Responsibility | Key Deliverables |
|------|---------------|-----------------|
| **Software Architect** | System design, integration patterns, runtime engine architecture | ADRs, C4 diagrams, component resolution design |
| **Software Engineer** | React runtime, WebSocket propagation, Control Board UI, caching | Sequence diagrams, API contracts, performance design |
| **Data Architect** | Mujarrad schema design, knowledge graph modeling, query optimization | Node schemas, relationship catalog, migration strategy |
| **Agentic Teams Lead** | AI-driven schema discovery, auto-component suggestion, matching inference | Agent interaction diagrams, human-in-loop workflows |

## Technology Foundation

- **Mujarrad Knowledge Graph** — all definitions, instances, flows, rules stored as typed nodes with relationships
- **Node Types**: TEMPLATE (blueprints), REGULAR (instances), CONTEXT (active sessions), ASSUMPTION (drafts)
- **React 19 + TypeScript** — dynamic import for component resolution
- **WebSocket** — real-time propagation from Control Board to all clients
- **JSON Schema 7** — component data shape declarations, filter dimension derivation
- **refine.dev** — data provider pattern for Mujarrad CRUD

## Constraints

- Must maintain bilingual (EN/AR) + RTL support at every layer
- Must integrate with existing Mujarrad SDK (not replace it)
- Must preserve SIA design system (Gold/Charcoal/Silver, Playfair/Inter/IBM Plex Arabic)
- Must work within refine.dev patterns (data provider, auth provider, resource routing)
- Performance budget: < 50ms component resolution, < 2s propagation
- Security: role-based Control Board access, renderer allowlist, config sandboxing

## Timeline Context

This is foundational R&D — the engine enables everything else (matching, deal rooms, document workflows, OKR alignment) to be built dynamically rather than hardcoded. Prioritize correctness of design over speed of delivery.
