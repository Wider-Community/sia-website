# Hiring Brief: Software Architect — Dynamic Component Engine

## Role Summary

Design the runtime architecture for a Mujarrad-powered dynamic component engine that resolves, renders, and orchestrates UI components from a knowledge graph — eliminating hardcoded UX and enabling zero-code-change configuration.

## Context

SIA is a B2B deal facilitation platform where matching criteria, deal stages, and interaction flows are **not known at build time**. They emerge from data extraction. The architect designs the engine that makes this possible at the frontend layer.

## Core Responsibilities

### 1. Component Resolution Architecture
- Design the pipeline: Flow Stage → Instance Lookup → Definition Resolve → Config Merge → React Render
- Dynamic import strategy for renderer components (code splitting, lazy loading)
- Caching architecture (version-keyed, invalidation on TEMPLATE node updates)
- Performance optimization to meet <50ms resolution target

### 2. Flow Engine State Machine
- Multi-stage orchestration with configurable stage ordering
- Conditional branching evaluation engine (rule priority, AND/OR logic)
- Session state management (CONTEXT nodes tracking user progress)
- Stage insertion/removal without affecting active sessions

### 3. Real-Time Propagation Protocol
- WebSocket event architecture for Mujarrad node change broadcasts
- Client-side cache invalidation strategy
- Optimistic vs. confirmed update patterns
- Graceful degradation when WebSocket connection drops

### 4. Integration Patterns
- How the dynamic engine integrates with refine.dev's data provider pattern
- How existing hardcoded components migrate to engine-driven rendering
- How the notification engine hooks into flow events
- How schema-adaptive rendering handles unknown/evolving data shapes

### 5. Architecture Documentation
- C4 diagrams (System Context, Container, Component levels)
- Architecture Decision Records (ADRs) for each major choice
- Sequence diagrams for key runtime paths
- Performance budgets and monitoring strategy

## Required Experience

- **5+ years** designing frontend architectures for data-intensive B2B applications
- **Deep React knowledge** — dynamic imports, render optimization, state machines, context propagation
- **Knowledge graph / graph database** experience (understanding relationship-based data models)
- **Real-time systems** — WebSocket architecture, cache invalidation, eventual consistency
- **Config-driven UI** — experience with form builders, CMS systems, or dynamic rendering engines
- **Performance engineering** — profiling, code splitting, caching strategies

## Preferred Experience

- Headless CMS or form-builder architecture (Strapi, Contentful, Formio internals)
- refine.dev or similar meta-framework patterns
- JSON Schema-driven UI generation
- Multi-tenant / multi-configuration systems
- Bilingual/RTL application architecture

## Key Decisions This Role Owns

1. Component resolver pattern (registry lookup vs. convention-based vs. hybrid)
2. Caching strategy (client-only vs. edge cache vs. service worker)
3. Flow engine implementation (finite state machine vs. directed graph vs. workflow engine)
4. Real-time propagation granularity (full definition push vs. delta patches)
5. Migration strategy for existing hardcoded components

## Deliverables (First 4 Weeks)

| Week | Deliverable |
|------|------------|
| 1 | System Context (C4 L1) + Container (C4 L2) diagrams; ADR-001 through ADR-003 |
| 2 | Component diagram (C4 L3); resolver pipeline design; caching strategy |
| 3 | Flow engine state machine design; branching evaluation spec; sequence diagrams |
| 4 | Integration design (refine, Mujarrad, notifications); performance budget; review |

## Working Context

- **Stack**: React 19, TypeScript, Vite 7, Tailwind, shadcn/ui, refine.dev, Mujarrad SDK
- **Backend**: Mujarrad Knowledge Graph (node CRUD + relationships via REST API)
- **Collaboration**: Works with Data Architect (schema design), Software Engineer (implementation), Agentic Teams Lead (AI integration)
- **Location**: Remote, async-first
