# Sequence Diagram: Component Render (Cold + Warm Path)

## Warm Path (Cache Hit — 95% of renders)

```
┌──────┐     ┌──────────┐     ┌─────────────┐
│ React│     │ Resolver │     │ Cache (L1)  │
│ Hook │     │          │     │             │
└──┬───┘     └────┬─────┘     └──────┬──────┘
   │               │                   │
   │ useComponent  │                   │
   │ (instanceId)  │                   │
   │──────────────►│                   │
   │               │                   │
   │               │ get(instanceId)   │
   │               │──────────────────►│
   │               │                   │
   │               │   HIT: definition │
   │               │◄──────────────────│
   │               │                   │
   │               │ merge config      │
   │               │ (def + overrides) │
   │               │                   │
   │               │ get renderer      │
   │               │ (from registry)   │
   ���               │                   │
   │  { Component, │                   │
   │    config,    │                   │
   │    i18n }     │                   │
   │◄──────────────│                   │
   │               │                   │
   │ <Component    │                   │
   │   {...config} │                   │
   │   />          │                   │
   │               │                   │
   ▼               ▼                   ▼

   Total latency: ~3-5ms
```

## Cold Path (Cache Miss — First Load / After Invalidation)

```
┌──────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐
│ React│  │ Resolver │  │Cache L1│  │ Cache L2  │  │Mujarrad │  │ Renderer │
│ Hook │  │          │  │(Memory)│  │(Svc Wrkr) │  │  API    │  │ Registry │
└──┬───┘  └────┬─────┘  └───┬────┘  └─────┬─────┘  └────┬────┘  └────┬─────┘
   │            │             │             │              │             │
   │useComponent│             │             │              │             │
   │(instanceId)│             │             │              │             │
   │───────────►│             │             │              │             │
   │            │             │             │              │             │
   │            │ get(id)     │             │              │             │
   │            │────────────►│             │              │             │
   │            │             │             │              │             │
   │            │    MISS     │             │              │             │
   │            │◄────────────│             │              │             │
   │            │             │             │              │             │
   │            │ get(id)     │             │              │             │
   │            │─────────────────────────►│              │             │
   │            │             │             │              │             │
   │            │    MISS     │             │              │             │
   │            │◄─────────────────────────│              │             │
   │            │             │             │              │             │
   │            │ GET /nodes/{instanceId}   │              │             │
   │            │──────────────────────────────────────►│             │
   │            │             │             │              │             │
   │            │ instance node (definitionId, overrides) │             │
   │            │◄────────────────────���─────────────────│             │
   │            │             │             │              │             │
   │            │ GET /nodes/{definitionId} │              │             │
   │            │──────────────────────────────────────►│             │
   │            │             │             │              │             │
   │            │ definition (schema, config, renderer, i18n)          │
   │            │◄─────────────��────────────────────────│             │
   │            │             │             │              │             │
   │            │ set(L1)     │             │              │             │
   │            │────────────►│             │              │             │
   │            │             │ set(L2)     │              │             │
   │            │─────────────────────────►│              │             │
   │            │             │             │              │             │
   │            │ merge(def.config, instance.overrides)   │             │
   │            │             │             │              │             │
   │            │ getRenderer(def.renderer) │              │             │
   │            │─────────────────────��────────────────────────────────►│
   │            │             │             │              │             │
   │            │ React.lazy component     │              │             │
   │            │◄─────────────────────���────────────────────────────────│
   │            │             │             │              │             │
   │ resolved   │             │             │              ��             │
   │◄───────────│             │             │              │             │
   │            │             │             │              │             │
   ▼            ▼             ▼             ▼              ▼             ▼

   Total latency: ~150-200ms (network bound)
```

## Flow Pre-fetch (Eliminates Cold Path During Flow)

```
┌──────┐     ┌───────────┐     ┌─────────┐     ┌────────┐
│ User │     │Flow Engine│     │Mujarrad │     │Cache L1│
│      │     │           │     │  API    │     │        │
└──┬───┘     └─────┬─────┘     └────┬────┘     └───┬────┘
   │                │                 │              │
   │ Enter flow     │                 │              │
   │───────────────►│                 │              │
   │                │                 │              │
   │                │ GET flow + all  │              │
   │                �� stages + all    │              │
   │                │ component IDs   │              │
   │                │────────────────►│              │
   │                │                 │              │
   │                │ Full flow graph │              │
   │                │ + all defs      │              │
   │                │◄────────────────│              │
   │                │                 │              │
   │                │ Warm cache with │              │
   │                │ ALL definitions │              │
   │                │─────────────────────────────►│
   │                │                 │              │
   │ Render Stage 1 │                 │              │
   │◄───────────────│                 │              │
   │                │                 │              │
   │ (All subsequent stage renders    │              │
   │  hit warm cache — 3-5ms each)    │              │
   ��                │                 │              │
   ▼                ▼                 ▼              ▼

   First stage: ~200ms (pre-fetch)
   All subsequent: ~3-5ms (cache hit)
```

## Cache Invalidation (Real-Time Update)

```
┌──────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐
│Admin │  │ Mujarrad │  │WebSocket│  │ Cache L1 │  │ React   │
│(Ctrl │  │   API    │  │ Server │  │          │  │ (mounted│
│Board)│  │          │  │        │  │          │  │instances)
└──┬───┘  └────┬─────┘  └───┬────┘  └────┬─────┘  └────┬────┘
   │            │             │            │              │
   │ Update     │             │            │              │
   │ definition │             │            │              │
   │───────────►│             │            │              │
   │            │             │            │              │
   │            ��� node.updated│            │              │
   │            │ (version++) │            │              │
   │            │────────────►│            │              │
   │            │             │            │              │
   │            │             │ broadcast  │              │
   │            │             │ to clients │              │
   │            │             │───────────►│              │
   │            │             │            │              │
   │            │             │            │ invalidate   │
   │            │             │            │ (nodeId)     │
   │            │             │            │──────────────►
   │            │             │            │              │
   │            │             │            │              │ re-fetch
   │            │             │            │              │ definition
   │            │             │            │◄─────────────│
   │            │             │            │              │
   │            │             │            │              │ re-render
   │            │             │            ��              │ with new
   │            │             │            │              │ config
   │            │             │            │              │
   ▼            ▼             ▼            ▼              ▼

   Total: Admin save → User sees update: <300ms
```
