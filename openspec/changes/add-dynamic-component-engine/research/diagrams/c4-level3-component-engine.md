# C4 Level 3: Component Diagram — Component Engine Internals

## Component Engine — Internal Structure

```
┌─────────────────────────��───────────────────────────────��────────────────────��─────┐
│                           COMPONENT ENGINE                                          │
│                                                                                     │
│  ┌─���────────��───────────────────────────���────────────────────────────────────────┐  │
│  │                        PUBLIC API (React Hooks)                                │  │
│  │                                                                                │  │
│  │  useComponent(instanceId)     → resolved component ready to render             │  │
│  │  useFlow(flowId)              → flow session + current stage + navigation      │  │
│  │  useFlowStage(stageId)        → stage components + submit handler              │  │
│  │  useDynamicForm(stageId)      → form state + validation + schema-adaptive UI   │  │
│  │  useComponentRegistry()       → admin: list/create/update/delete definitions   │  │
│  │  useFlowDesigner(flowId)      → admin: stage CRUD + edge CRUD + validation     │  │
│  └──────────┬───────��──────────────────────────────┬─────────────────���───────────┘  │
│             │                                      │                                │
│             ▼                                      ▼                                │
│  ┌─────────────────────────┐          ┌───────────────────���───────��────────────┐   │
│  │                         │          │                                        │   │
│  │  COMPONENT RESOLVER     │          │  RENDERER REGISTRY                     │   │
│  │                         │          │                                        │   │
│  │  Responsibilities:      │          │  Responsibilities:                     │   │
│  │  • Instance → Definition│          │  • Map renderer key → React component  │   │
│  │    lookup (via cache)   │          │  • Dynamic import (React.lazy)         │   │
│  │  • Config merge         │          │  • Fallback renderer for unknown keys  │   │
│  │    (def + overrides)    │          │  • Schema-adaptive renderer selection  │   │
│  │  • Version validation   │          │                                        │   │
│  │  • Validation rule      │          │  Built-in Renderers:                   │   │
│  │    compilation          │          │  • TextFieldRenderer                   │   │
│  │                         │          │  • NumberFieldRenderer                 │   │
│  │  Input: instanceId      │          │  • SelectRenderer                     │   │
│  │  Output: {              │          │  • DatePickerRenderer                 │   ��
│  │    renderer: Component, │          │  • MultiSelectRenderer                │   │
│  │    config: merged,      │          │  • FileUploadRenderer                 │   │
│  │    validations: compiled│          │  • CompositeRenderer (nested)         │   │
│  │    i18n: resolved       │          │  • SchemaAdaptiveRenderer (auto)      │   │
│  │  }                      │          │  • KanbanRenderer                     │   │
│  │                         │          │  • BranchSelectorRenderer             │   │
│  └────────────┬────────────┘          └──────────────────┬─────────────────────┘   │
│               │                                           │                         │
│               │  cache miss                               │                         │
│               ▼                                           │                         │
│  ┌─────────────────────────┐                              │                         │
│  │                         │                              │                         │
│  │  CACHE MANAGER          │                              ��                         │
│  │                         │                              │                         │
│  │  • L1: Memory (Map)     │                              │                         │
│  │    - Version-keyed      │                              │                         │
│  │    - LRU eviction       │                              │                         │
│  │    - ~500 entries max   │                              │                         │
│  │                         │                              │                         │
│  │  • L2: Service Worker   │                              │                         │
│  │    - Persistent         │                              │                         │
│  │    - Background sync    │                              │                         │
│  │                         │                              │                         │
│  │  • Invalidation:        │                              │                         │
│  │    - WebSocket events   │◄──── from Real-Time Client   │                         │
│  │    - Version mismatch   │                              │                         │
│  │    - Manual purge       │                              │                         │
│  └────────────┬────────────���                              │                         │
│               │                                           │                         │
│               │  cache miss → API call                    │                         │
│               ▼                                           │                         │
│  ┌─────────────────────────┐                              │                         │
│  │                         │                              │                         │
│  │  MUJARRAD ADAPTER       │                              │                         │
│  │                         │                              │                         │
│  │  • Node CRUD operations │                              │                         │
│  │  • Relationship queries │                              │                         │
│  │  • Bulk fetch (prefetch)│                              │                         │
│  │  • refine data provider │                              │                         │
│  │    integration          │                              │                         │
│  └───────────────────────���─┘                              │                         ���
│                                                           │                         │
│               ┌───────────────────────────────────────────┘                         │
│               │                                                                     │
│               ▼                                                                     │
│  ┌──────────────────────���───────────────��───────────────────────────────────────┐   │
│  │                                                                               │   │
│  │  SCHEMA-ADAPTIVE ENGINE                                                       │   │
│  │                                                                               │   │
│  │  Responsibilities:                                                            │   │
│  │  • Parse JSON Schema → determine appropriate renderer                         │   │
│  │  • Handle unknown/evolving schemas from data extraction                       │   │
│  │  • Generate validation rules from schema constraints                          │   │
│  │  • Derive filter dimensions from schema properties                            │   │
│  │                                                                               │   │
│  │  Type Mapping:                                                                │   │
│  │  ┌─────────────���───┬──────────────────────┬──────────────��────────────────┐   │   │
│  │  │ JSON Schema Type│ Renderer             │ Filter Operators              │   │   │
│  │  ├──────────���──────┼─────────────────���────┼───────────────────────────────┤   │   │
│  │  │ string          │ TextFieldRenderer    ��� eq, neq, contains, matches    │   │   │
│  │  │ string (enum)   │ SelectRenderer       │ eq, neq, in                   │   │   │
│  │  │ number          │ NumberFieldRenderer  │ eq, gt, lt, gte, lte, between │   │   │
│  │  │ boolean         │ ToggleRenderer       │ eq                            │   │   │
│  │  │ array           │ MultiSelectRenderer  │ contains, overlaps, all_of    │   │   │
│  │  │ object          │ CompositeRenderer    │ (recurse into properties)     │   │   │
│  │  │ string (date)   │ DatePickerRenderer   │ gt, lt, between              │   │   │
│  │  │ string (uri)    │ UrlRenderer          │ eq, contains                 │   │   │
│  │  └─────────────────┴───────────��──────────┴───────────────────────────���───┘   │   │
│  │                                                                               │   │
│  └─────────────────────────────────────────────────────���────────────────────────┘   │
│                                                                                     │
│  ┌─────────────────────────���────────────────────────────���───────────────────────┐   │
│  │                                                                               │   │
│  │  FILTER ENGINE                                                                │   │
│  │                                                                               │   │
│  │  • Reads component schema → generates filterable dimensions                   │   │
│  │  • Builds filter UI from dimensions (operator + value input)                  │   │
│  │  • Translates filter state → Mujarrad query parameters                        │   │
│  │  • Supports nested dot-path queries (e.g., "metrics.avgDealSize > 5M")        │   │
│  │  • Auto-updates when component schemas evolve                                 │   │
│  │                                                                               │   │
│  └────────────���──────────────────────────────────────────────────────────��──────┘   │
│                                                                                     │
└─────────────────────��─────────────────────────────────���────────────────────────────┘
```

## Component Interactions (Internal)

```
useComponent(instanceId) call:
    │
    ├──1──► Resolver.resolve(instanceId)
    │           │
    │           ├──2──► CacheManager.get(instanceId)
    │           │           │
    │           │           ├── HIT ──► return cached definition
    │           │           │
    │           │           └── MISS ──► MujarradAdapter.getNode(instanceId)
    │           │                            │
    │           │                            └──► CacheManager.set(result)
    │           │
    │           ├──3──► merge(definition.config, instance.overrides)
    │           │
    │           └──4──► compile(definition.validations)
    │
    ├──5──► RendererRegistry.get(definition.renderer)
    │           │
    │           ├── FOUND ──► return React.lazy(() => import(rendererPath))
    │           │
    │           └── NOT FOUND ──► SchemaAdaptiveEngine.infer(definition.schema)
    │                                 │
    │                                 └──► return appropriate fallback renderer
    │
    └──6──► return { Component, config, validations, i18n }
```

## Key Design Properties

| Property | How Achieved |
|----------|-------------|
| **Extensibility** | New renderers added to registry without touching engine code |
| **Performance** | Layered cache ensures <5ms for 90%+ of resolutions |
| **Unknown schemas** | Schema-adaptive engine renders ANY valid JSON Schema |
| **Real-time updates** | WebSocket → Cache invalidation → Re-render cycle |
| **Composability** | CompositeRenderer recursively resolves child components |
| **Bilingual** | i18n resolved from definition based on active locale |
| **Filterability** | Schema → dimensions → filter UI → Mujarrad queries |
