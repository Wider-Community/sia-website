# Executive Summary: Dynamic Component Engine

## The Problem

SIA facilitates B2B deal matching between Saudi Arabia and Malaysia. The matching criteria — the exact attributes that determine if two organizations are compatible — **are not known until data is extracted from real documents**. New sectors, new corridors, and new regulatory regimes introduce new dimensions constantly.

Today's hardcoded frontend cannot:
- Present matching criteria it wasn't built to display
- Add deal stages without developer intervention
- Grow user interactions based on discovered opportunity dimensions
- Notify stakeholders about events from unknown workflows

**Every UX change = code change = developer time = deployment = risk.**

---

## The Solution: Dynamic Component Engine

A **Mujarrad-native runtime** that resolves UI components, orchestrates multi-stage flows, and dispatches notifications — all from configuration, not code.

### How It Works

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  Control    │        │  Mujarrad    │        │  User sees  │
│  Board      │───────►│  Knowledge   │───────►│  updated UI │
│  (Admin)    │ config │  Graph       │ render │  instantly  │
└─────────────┘        └──────────────┘        └─────────────┘
     │                                              │
     │  No code. No deploy. No developer.           │
     └──────────────────────────────────────────────┘
```

---

## Value Proposition

### Cost of Change Reduction

| Action | Today | With Engine |
|--------|-------|-------------|
| Add a form field | 2-5 days (dev cycle) | 2 minutes (admin config) |
| Add a flow stage | 1-2 weeks | 5 minutes |
| New notification type | 3-5 days | 1 minute |
| New corridor onboarding | 4-8 weeks | Hours |
| Branch logic change | 1-3 days | 3 minutes |
| Schema-discovered data in UI | Impossible (requires dev) | Automatic |

### Scalability Model

| Dimension | How It Scales |
|-----------|--------------|
| **New corridors** | Configure new flows + matching criteria. Zero code. |
| **New sectors** | Data extraction → schema discovery → auto-surface in UI |
| **New deal types** | Compose stages from existing components. New flow, existing parts. |
| **New regulations** | Add compliance stage to flows via Control Board |
| **Team size** | Business operators self-serve. Developers focus on engine, not features. |

### Competitive Advantage

The engine turns SIA from a **platform that serves known deal types** into a **platform that adapts to any deal type it encounters**. This is fundamentally different from competitors who must rebuild for each new market.

---

## Architecture at a Glance

### Five Pillars

| Pillar | What It Does | Value |
|--------|-------------|-------|
| **Component Registry** | Catalog of all UI building blocks (fields, composites, layouts) | Reusability, single-source-of-truth |
| **Flow Engine** | Orchestrates multi-step journeys with conditional branching | Dynamic deal progression, Kanban management |
| **Notification Engine** | Configurable alerts across channels with escalation | Engagement, compliance, no missed actions |
| **Schema-Adaptive Renderer** | Auto-generates UI from discovered data schemas | Unknown criteria become visible instantly |
| **Control Board** | Admin dashboard for all configuration | Business self-service, zero developer dependency |

### Mujarrad Abstraction Leverage

Everything is a node. Everything has relationships. This isn't bolted on — it's native:

- **Component Definitions** = TEMPLATE nodes (blueprints)
- **Component Instances** = REGULAR nodes (placed in stages, with overrides)
- **Flow Sessions** = CONTEXT nodes (user's progress through a journey)
- **Draft Configs** = ASSUMPTION nodes (proposed changes, pending approval)
- **Matching Criteria** = Relationships between node attributes

Update a TEMPLATE → every REGULAR instance inherits the change → every user sees it in real-time.

---

## AI-Powered Growth (Agentic Teams)

The engine doesn't just reduce cost of manual change — it enables **AI-driven evolution**:

1. **Schema Discovery Agent** — extracts structured data from documents, proposes component definitions
2. **Component Suggestion Agent** — given discovered schema, suggests appropriate UI rendering
3. **Matching Inference Agent** — identifies alignment dimensions between organizations
4. **Flow Optimization Agent** — analyzes user behavior, suggests stage improvements

All with **human-in-the-loop governance**: AI proposes → human reviews → one-click publish.

---

## Notification System

Not a bolt-on. Notifications are first-class citizens of the engine:

- **Definable**: Create notification types from Control Board (trigger + channels + template + escalation)
- **Configurable**: Attach to ANY engine event (stage transitions, branch selections, match discoveries)
- **Growable**: Add new notification types without code changes
- **Intelligent**: Escalation chains, multi-channel fallback, analytics-driven optimization
- **Bilingual**: EN/AR templates with variable interpolation from event context

---

## Team & Delivery

### R&D Phase (Design)

| Role | Focus | Status |
|------|-------|--------|
| Software Architect | Engine architecture, integration patterns | Briefs ready |
| Software Engineer | React runtime, Control Board, WebSocket | Briefs ready |
| Data Architect | Mujarrad schemas, query optimization, evolution | Briefs ready |
| Agentic Teams Lead | AI agents, schema discovery, matching inference | Briefs ready |

### Implementation Phases

| Phase | Scope | Enables |
|-------|-------|---------|
| 0: Foundation | Registry + Resolver + Cache | Components from config |
| 1: Fields | Migrate existing fields to engine | Configurable forms |
| 2: Flows | Stage orchestrator + sessions | Multi-step journeys |
| 3: Branching | Conditional routing + DAG | Adaptive deal paths |
| 4: Control Board | Admin UI for all config | Business self-service |
| 5A: Filters | Schema → filter dimensions | Advanced search/matching |
| 5B: Notifications | Full notification engine | Configurable alerts |
| 6: Experience Builder | Full page composition | Zero-code new experiences |

Each phase independently deployable. Value accrues incrementally.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Performance overhead | Layered caching (<5ms warm, <200ms cold) |
| Over-abstraction | "Quick form" shortcut for simple cases |
| Broken configs | DAG validation, preview mode, rollback |
| Mujarrad dependency | Service Worker offline fallback |
| Migration disruption | Gradual; compatibility adapter for old components |

---

## Bottom Line

The Dynamic Component Engine transforms SIA from a **build-it-each-time platform** to a **configure-once-adapt-forever platform**. It eliminates the developer bottleneck for UX changes, enables business operators to self-serve, and — critically — allows SIA to present and operate on data dimensions **it didn't know existed when the code was written**.

This is the architectural foundation that makes everything else possible: matching, deal progression, notifications, compliance, new corridors, new sectors — all without code changes.
