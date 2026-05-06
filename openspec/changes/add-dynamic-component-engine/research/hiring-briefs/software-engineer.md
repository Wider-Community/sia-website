# Hiring Brief: Software Engineer — Dynamic Component Engine

## Role Summary

Build the React runtime that resolves components from Mujarrad definitions, orchestrates multi-stage flows, propagates real-time configuration changes, and delivers the Control Board admin interface.

## Context

SIA needs a frontend runtime where all UI components, forms, flow stages, and notifications are driven by configuration stored in a knowledge graph — not by hardcoded JSX. This engineer builds the runtime engine and the admin interface that controls it.

## Core Responsibilities

### 1. Component Resolver Implementation
- Build the resolution pipeline (instance ID → definition lookup → config merge → dynamic React render)
- Implement lazy-loaded renderer registry (string key → React component)
- Build version-keyed caching layer with WebSocket-driven invalidation
- Implement schema-adaptive rendering (JSON Schema type → appropriate input control)

### 2. Flow Engine Runtime
- Implement stage orchestrator (ordered rendering, transitions, progress tracking)
- Build branch rule evaluator (condition matching, priority resolution, AND/OR logic)
- Implement flow session management (create, resume, complete CONTEXT nodes)
- Build Kanban board component with dynamic columns from flow stage configuration

### 3. Control Board UI
- Build Component Registry admin (CRUD definitions, schema editor, config editor, i18n)
- Build Flow Designer (stage ordering, component assignment, branch rule editor)
- Build Notification Manager (definition CRUD, attachment matrix, escalation chain editor)
- Implement preview mode (test configurations before publishing)
- Implement real-time propagation indicator (show when changes are live)

### 4. Real-Time Propagation
- Implement WebSocket client integration with Mujarrad events
- Build cache invalidation and re-render triggers
- Implement optimistic updates with rollback on failure
- Handle reconnection and state reconciliation after connection drops

### 5. Notification Engine Frontend
- Build in-app notification delivery (toasts, notification center, badges)
- Implement notification preferences UI (per-channel, per-category opt-in/out)
- Build notification analytics dashboard (delivery metrics, engagement visualization)

## Required Experience

- **4+ years** React/TypeScript with complex state management
- **Dynamic component rendering** — React.lazy, Suspense, dynamic imports, render-from-config
- **WebSocket integration** — real-time updates, reconnection handling, event-driven architecture
- **Admin UI development** — data tables, form builders, tree editors, drag-and-drop
- **Performance optimization** — code splitting, memoization, virtualization, profiling
- **Testing** — React Testing Library, integration tests, snapshot testing for dynamic UIs

## Preferred Experience

- refine.dev or similar headless CRUD framework
- shadcn/ui component library (already used in project)
- JSON Schema form generation (react-jsonschema-form, formio concepts)
- Zustand or similar lightweight state management
- Bilingual/RTL applications
- Framer Motion animations

## Key Technical Challenges

1. Dynamic imports without bundle size explosion (tree-shaking, chunk strategy)
2. Re-rendering efficiency when definitions update (avoid cascade re-renders)
3. Flow state persistence across page navigations and session resumption
4. Control Board UX that's powerful enough for complex configs but intuitive for non-developers
5. Schema-adaptive rendering that produces clean, accessible forms from arbitrary JSON Schema

## Deliverables (First 6 Weeks)

| Week | Deliverable |
|------|------------|
| 1-2 | Component resolver + renderer registry + caching layer |
| 3 | Flow engine runtime (linear flows, stage transitions) |
| 4 | Branch evaluator + conditional routing |
| 5 | Control Board: Component Registry + Flow Designer |
| 6 | WebSocket propagation + notification frontend basics |

## Working Context

- **Stack**: React 19, TypeScript, Vite 7, Tailwind CSS, shadcn/ui, refine.dev, Zustand
- **Backend**: Mujarrad SDK (REST API, node CRUD, relationships)
- **Design System**: Gold #C8A951, Charcoal #1C1C1E, Silver #C0C0C0; Playfair Display + Inter
- **Collaboration**: Works from architect's designs; coordinates with Data Architect on schemas
- **Location**: Remote, async-first
