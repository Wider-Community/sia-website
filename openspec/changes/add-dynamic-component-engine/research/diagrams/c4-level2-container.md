# C4 Level 2: Container Diagram

## Dynamic Component Engine — Containers

```
┌───────────��─────────────────────────────────────────────────────────────────────────┐
│                           SIA PLATFORM (Browser)                                     │
│                                                                                      │
│  ┌─────��──────────────────────────────────���────────────────────────────────────────┐ │
│  │                         REACT APPLICATION (SPA)                                  �� │
│  │                                                                                  │ │
│  │  ┌───────��──────────┐  ┌──────────────────┐  ┌──────────────────────────────┐   │ │
│  │  │                  │  │                  │  │                              │   │ │
│  │  │  COMPONENT       │  │  FLOW            │  │  CONTROL BOARD              │   │ │
│  │  │  ENGINE          │  │  ENGINE          │  │  (Admin UI)                 │   │ │
│  │  │                  │  │                  │  │                              │   │ │
│  │  │  • Resolver      │  │  • Orchestrator  │  │  • Component Registry Mgr   │   │ │
│  │  │  • Renderer      │  │  • Branch Eval   │  │  • Flow Designer            │   │ │
│  │  │  • Cache (L1)    │  │  • Session Mgr   │  │  • Notification Manager     │   │ │
│  │  │  • Schema Adapt  │  │  • DAG Validator │  │  • Escalation Editor        │   │ │
│  │  │                  │  │                  │  │  • Preview Mode             │   │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └──────────────┬─────────────┘   │ │
│  │           │                      │                            │                  │ │
│  │           └──────────────────────┼────────────────────────────┘                  │ │
│  │                                  │                                               │ │
│  │  ┌─────────────────��┐  ┌────────┴─────────┐  ┌──────────────────────────────┐   │ │
│  │  │                  │  │                  │  │                              │   │ │
│  │  │  NOTIFICATION    │  │  EVENT BUS       │  │  REAL-TIME CLIENT           │   │ │
│  │  │  ENGINE          │  │  (Pub/Sub)       │  │  (WebSocket)                │   │ │
│  │  │                  │  │                  │  │                              │   │ │
│  │  │  • Trigger Eval  │  │  • Typed events  │  │  • Connection mgmt          │   │ │
│  │  │  • Template      │  │  • Subscriptions │  │  • Cache invalidation       │   │ │
│  │  │    Interpolation │  │  • Decoupled     │  │  • Subscription filtering   │   │ │
│  │  │  • Channel Route │  │    components    │  │  • Reconnection + recovery  │   │ │
│  │  │  • Escalation    │  │                  │  │                              │   │ │
│  │  │    Monitor       │  │                  │  │                              │   │ │
│  │  └────────┬─────────┘  └──────────────────┘  └──────────────┬─────────────┘   │ │
│  │           │                                                   │                  │ │
│  └───────────┼───────────────────────────────────────────────────┼──────────────────┘ │
│              │                                                   │                    │
│  ┌───────────┼─────────────────────────────────��─────────────────┼──────────────────┐ │
│  │           │         SERVICE WORKER (L2 Cache)                 │                  │ │
│  │           │         • Definition cache (persistent)           │                  │ │
│  │           │         • Offline fallback                        │                  │ │
│  │           │         • Background sync                         │                  │ │
│  └───────────┼───────────────────────────────────────────────────┼──────────────────┘ │
└──────────────┼──────────��──────────────────���─────────────────────┼──────────────────┘
               │                                                   │
               │  REST API (CRUD)                                  │  WebSocket
               │                                                   │
               ▼                                                   ▼
┌───────────────────────��──────────────────────────────���──────────────────────────���────┐
│                              MUJARRAD API SERVER                                      │
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────┐   │
│  │                  │  │                  │  │                                  │   │
│  │  NODE CRUD       │  │  RELATIONSHIP    │  │  EVENT EMITTER                  │   │
│  │  SERVICE         │  │  SERVICE         │  │  (WebSocket Server)             │   │
│  │                  │  │                  │  │                                  │   │
│  │  • Create/Read/  │  │  • Link nodes   │  │  • Broadcasts node mutations    │   │
│  │    Update/Delete │  │  • Traverse      │  │  • Subscription management      │   │
│  │  • Type: TEMPLATE│  │  • Query by type │  │  • Event filtering              │   │
│  │    REGULAR,      │  │  • Bulk ops      │  │                                  │   │
│  │    CONTEXT,      │  │                  │  │                                  │   │
│  │    ASSUMPTION    │  │                  │  │                                  │   │
│  └──────────────────┘  └──────────────────┘  └───────────────────────���──────────┘   │
│                                                                                      │
│  ┌───────────────────────��──────────────────────────────────────────────────────┐   │
│  │                           KNOWLEDGE GRAPH STORE                               │   │
│  │                                                                               │   │
│  │  Nodes: TEMPLATE (definitions) | REGULAR (instances) | CONTEXT (sessions)     │   │
│  │  Relationships: instance_of | belongs_to | branches_to | triggered_by | ...   │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────��─────────────────────────────��──────────────────────────���───┘

               │
               │  Background jobs
               ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         BACKGROUND SERVICES                                           │
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────���─────────────────────┐   │
│  │  EXTRACTION      │  │  ESCALATION      │  │  SCHEDULED                      │   │
│  │  PIPELINE        │  │  SERVICE         │  │  NOTIFICATION                   │   │
│  │                  │  │                  │  │  SERVICE                        │   │
│  │  Documents →     │  │  Monitors ack    │  │                                  │   │
│  │  Schema          │  │  timeouts,       │  │  Cron-based notification         │   │
│  │  discovery →     │  │  escalates per   │  │  triggers (daily digests,        │   │
│  │  Mujarrad nodes  │  │  chain config    │  │  weekly reports)                 │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────���───────────┘   │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────���──────────────────┐   │
│  │  AGENTIC ORCHESTRATOR                                                         │   │
│  │                                                                               │   │
│  │  • Schema Discovery Agent    • Component Suggestion Agent                     │   │
│  │  • Matching Inference Agent  • Flow Optimization Agent                        │   │
│  │  • Proposals → Human Review Queue → Control Board                             │   │
│  └──────────────────────���──────────────────────────���────────────────────────────┘   │
└──────────────────��──────────────────────────────���──────────────────────────────────���─┘
```

## Container Responsibilities

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| Component Engine | React/TypeScript | Resolve definitions, render components, manage cache |
| Flow Engine | React/TypeScript | Orchestrate stages, evaluate branches, manage sessions |
| Control Board | React/shadcn/ui | Admin CRUD for definitions, flows, notifications |
| Notification Engine | TypeScript | Evaluate triggers, interpolate templates, route to channels |
| Event Bus | TypeScript (in-process) | Decouple engine components via typed events |
| Real-Time Client | WebSocket client | Receive server events, invalidate caches, trigger re-renders |
| Service Worker | Web Worker | Persistent L2 cache, offline fallback, background sync |
| Mujarrad API | External service | Node CRUD, relationship management, event broadcasting |
| Background Services | Server-side (TBD) | Extraction pipeline, escalation monitoring, scheduled jobs |
| Agentic Orchestrator | Claude API + custom | AI-driven schema discovery, suggestions, matching inference |

## Communication Patterns

| From → To | Protocol | Pattern |
|-----------|----------|---------|
| All Engines → Mujarrad | REST/HTTPS | Request-response (CRUD) |
| Mujarrad → Real-Time Client | WebSocket | Server-push (events) |
| All Engines → Event Bus | In-process | Pub/sub (typed events) |
| Notification Engine → Channels | Various | Async dispatch (queue) |
| Control Board → Engines | In-process | Direct function calls (same SPA) |
| Agentic → Control Board | REST + WS | Proposals queue → human review |
