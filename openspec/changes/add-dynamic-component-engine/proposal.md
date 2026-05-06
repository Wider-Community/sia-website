# Change: Add Dynamic Component Engine (Mujarrad-Powered)

## Why

### The Core Problem: Unknown Schema at Build Time

SIA facilitates matches between organizations, but **we don't know the matching criteria at build time**. The actual structured data that defines matchability is:
1. **Extracted from big-data files** (financial reports, company profiles, regulatory documents)
2. **Stored in Mujarrad's knowledge graph** with schemas that emerge from the data itself
3. **Evolving** — new corridors, new sectors, new regulatory regimes introduce new dimensions

This means the frontend **cannot be pre-built** to present matching criteria, filter by them, or grow the interaction between matched parties. A hardcoded UI is structurally incapable of:
- Presenting matching criteria it doesn't know exist yet
- Growing the deal interaction stages based on discovered opportunity dimensions
- Managing steps in a Kanban board when the steps themselves are data-driven

### The Cost & Scalability Imperative

Every UX change currently requires developer intervention → PR → deploy. This creates:
- **High cost of change** — simple field additions require full dev cycles
- **Low scalability** — can't adapt to new corridor requirements, regulatory changes, or partner needs in real-time
- **Fragile coupling** — components tightly bound to code rather than configuration
- **Impossible extensibility** — can't add stages to a deal journey without code

We need a **zero-code-change runtime** where:
- Data schemas discovered from big-data extraction **automatically surface** as UI components
- Matching criteria **emerge from the data** and are immediately filterable/presentable
- Business operators can reconfigure UX flows, add/remove/replace stages, swap simple fields for complex components, and create conditional branching
- Deal progression stages are **dynamically manageable** via Kanban without hardcoded columns
- All changes reflect instantly from a centralized control board across every instance

## What Changes

- **BREAKING**: Form/field rendering moves from static JSX to a dynamic component resolution engine
- Add a **Component Registry** — Mujarrad-backed catalog of all renderable components (simple fields → complex composites)
- Add a **Flow Engine** — configurable multi-stage journey orchestrator with conditional branching
- Add a **Control Board** (Admin Dashboard) — centralized UI for configuring components, flows, fields, and stages in real-time
- Add a **Component Instance Protocol** — every placed component is an instance referencing a registry definition; update the definition → all instances update
- Add **Conditional Branching** — user selections at runtime determine which stage/form/page comes next
- Add **Complex Component Filtering** — leverage component data structure for advanced filtering/querying
- Add a **Dynamic Notification Engine** — configurable notification definitions (triggers, channels, templates, escalation) stored as Mujarrad nodes, attachable to any flow event/stage/component action, growable in real-time from the Control Board
- Leverage **Mujarrad Abstraction Technology** — nodes (TEMPLATE, CONTEXT, REGULAR) model component definitions, instances, and configurations as knowledge graph relationships

## Impact

- Affected specs: New capability (`dynamic-component-engine`)
- Affected code: All form components, page builders, wizard flows, matching workflows, admin panel
- Affected architecture: Introduces runtime component resolution layer between React render tree and Mujarrad data
- Team requirements: Software Architect, Software Engineer, Data Architect, Agentic Teams

## Cost-of-Change Analysis

| Current State | Target State |
|--------------|--------------|
| Code change + PR + deploy per field | Config change in Control Board, instant propagation |
| Developer required for any UX tweak | Business operator self-service |
| Weeks to add a new deal stage | Minutes to configure new stage |
| Hardcoded conditional logic | Visual branching rules |
| Duplicated components across views | Single-source component definitions |

## Scalability Model

- **Horizontal**: New corridors/verticals = new flow configurations, zero new code
- **Vertical**: Complex components compose from simple ones; complexity is additive not multiplicative
- **Temporal**: Changes propagate instantly; no deployment pipeline bottleneck
