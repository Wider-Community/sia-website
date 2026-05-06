# ADR-001: Mujarrad-Native Component Storage

## Status
Proposed

## Context

The dynamic component engine needs a persistent store for component definitions, flow configurations, notification rules, and branch conditions. Options:

1. **Mujarrad Knowledge Graph** — store everything as typed nodes with relationships
2. **Separate relational database** — PostgreSQL/MySQL for config data
3. **JSON config files** — static files deployed with the app
4. **Headless CMS** — Strapi, Contentful, or similar

## Decision

**Use Mujarrad Knowledge Graph as the sole storage layer for all engine configuration.**

All component definitions, instances, flows, stages, branch rules, and notification definitions are stored as Mujarrad nodes with typed relationships.

## Rationale

### Why Mujarrad

1. **Already the system of record** — SIA's data layer is Mujarrad. Adding another store fragments the data model and requires synchronization.

2. **Relationship-first model** — The engine's core operations are relationship queries:
   - "What components does this stage use?" → traverse `uses_component`
   - "What definition does this instance reference?" → traverse `instance_of`
   - "What stage comes next if user selects X?" → traverse `branches_to`
   - "What notifications fire on this event?" → traverse `triggered_by`

3. **Type system alignment** — Mujarrad's TEMPLATE/REGULAR/CONTEXT/ASSUMPTION types map perfectly:
   - TEMPLATE = blueprint (component definition, flow definition)
   - REGULAR = concrete instance (placed component, active notification rule)
   - CONTEXT = session state (user's current flow progress)
   - ASSUMPTION = draft (unpublished configuration changes)

4. **Unified query layer** — One SDK, one auth model, one API for both business data and UI configuration. Components can reference business entities directly via relationships.

5. **Real-time capable** — Mujarrad's event system can broadcast node changes for WebSocket propagation.

### Why NOT alternatives

| Alternative | Rejection Reason |
|-------------|-----------------|
| Separate DB | Adds infrastructure, requires sync, fragments data model, duplicates auth |
| JSON files | No real-time updates, no relationship queries, requires deployment for changes |
| Headless CMS | External dependency, doesn't model relationships, overkill for structured config |

## Consequences

### Positive
- Single data model for business logic AND UI configuration
- Relationship queries enable powerful cross-cutting features (e.g., "show all flows affected by this component change")
- No additional infrastructure to operate
- Auth and access control inherited from Mujarrad

### Negative
- Mujarrad becomes a critical dependency — if it's down, the UI can't resolve components
- Query performance must be validated (graph traversal for every component render)
- Schema complexity increases in Mujarrad (more node types, more relationships)

### Mitigations
- Client-side caching with version-keyed invalidation (most renders hit cache, not API)
- Service worker fallback with last-known-good definitions for offline/degraded mode
- Clear documentation of Mujarrad schema extensions for the engine

## Related
- ADR-002: Component Resolution Caching Strategy
- ADR-003: Real-Time Propagation Protocol
