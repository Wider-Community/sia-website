# ADR-002: Component Resolution Caching Strategy

## Status
Proposed

## Context

Every rendered component requires: instance lookup → definition resolution → config merge. Without caching, this means multiple Mujarrad API calls per component per render. A typical page might have 20-50 component instances. At ~100ms per API call, uncached resolution would add 2-5 seconds of latency — unacceptable.

Options:
1. **Client-memory cache** (Zustand/Map) with WebSocket invalidation
2. **Service Worker cache** with background sync
3. **Edge cache** (CDN) with cache tags
4. **Server-side resolution** (pre-resolve on page load, send resolved bundle)

## Decision

**Layered caching: Client-memory (L1) + Service Worker (L2) + Bulk pre-fetch on flow entry.**

```
Request path:
  L1 (memory) → L2 (Service Worker) → Mujarrad API

Invalidation path:
  WebSocket event → Invalidate L1 → Invalidate L2 → Re-fetch on next access
```

## Design

### L1: Client Memory Cache (Hot Path)

```typescript
// Version-keyed cache map
Map<`${definitionId}:${version}`, ComponentDefinition>

// Resolution function
async function resolveDefinition(instanceId: string): Promise<ComponentDefinition> {
  const instance = instanceCache.get(instanceId);
  const cacheKey = `${instance.definitionId}:${instance.definitionVersion}`;

  if (l1Cache.has(cacheKey)) return l1Cache.get(cacheKey); // L1 hit
  if (l2Cache.has(cacheKey)) return promote(l2Cache.get(cacheKey)); // L2 hit → promote to L1

  const definition = await mujarrad.getNode(instance.definitionId); // API call
  l1Cache.set(cacheKey, definition);
  l2Cache.set(cacheKey, definition);
  return definition;
}
```

- **Scope**: Per-session, in React state (Zustand store or React context)
- **Size limit**: ~500 definitions (typical app won't exceed this)
- **Eviction**: LRU when limit reached; immediate eviction on version mismatch
- **Lifetime**: Until tab close or WebSocket invalidation

### L2: Service Worker Cache (Warm Path)

- **Scope**: Per-device, persists across sessions
- **Purpose**: Instant load on return visits; offline/degraded fallback
- **Strategy**: Cache-then-network for definitions; network-first for instances (instances change more frequently)
- **Invalidation**: Background sync checks versions; WebSocket events forwarded to SW via BroadcastChannel

### Bulk Pre-fetch on Flow Entry

When a user enters a flow, pre-fetch ALL definitions used by ALL stages in that flow:

```typescript
async function prefetchFlow(flowId: string): Promise<void> {
  const flow = await mujarrad.getNode(flowId, { include: ['stages', 'components'] });
  const definitionIds = extractAllDefinitionIds(flow);
  await Promise.all(definitionIds.map(id => resolveDefinition(id))); // Warm caches
}
```

This eliminates per-stage latency — all definitions are cached before the user progresses.

### WebSocket Invalidation Protocol

```typescript
// Server broadcasts on TEMPLATE node update:
{ event: 'node.updated', nodeId: string, nodeType: 'TEMPLATE', version: number }

// Client handler:
ws.on('node.updated', ({ nodeId, version }) => {
  // Invalidate all cache entries for this definition
  l1Cache.invalidateByDefinition(nodeId);
  l2Cache.invalidateByDefinition(nodeId);
  // Trigger re-render for any mounted instances of this definition
  instanceRegistry.notifyDefinitionChange(nodeId, version);
});
```

## Rationale

### Why layered over single-layer

- L1 alone: Lost on page refresh, cold start on every session
- L2 alone: Service Worker startup adds latency; not all browsers guarantee SW availability
- Edge cache alone: Can't invalidate per-user; blunt instrument for personalized configs
- Server-side alone: Adds server infrastructure; doesn't solve real-time propagation

Layered gives: instant renders (L1), fast recovery (L2), resilience (SW fallback), and real-time updates (WebSocket invalidation).

### Why NOT server-side resolution

Server-side pre-resolution (resolve all components, send HTML/JSON bundle) was considered but rejected:
- Adds server infrastructure SIA doesn't currently have (pure SPA + Mujarrad API)
- Breaks real-time propagation model (server cache + client cache = double invalidation)
- Doesn't align with refine.dev's client-side data provider pattern

## Performance Targets

| Metric | Target | Mechanism |
|--------|--------|-----------|
| First component render (cold) | <200ms | Bulk pre-fetch on flow entry |
| Subsequent renders (warm) | <5ms | L1 memory cache hit |
| Return visit first render | <50ms | L2 Service Worker cache |
| Post-update re-render | <100ms | WebSocket invalidation + single re-fetch |
| Offline/degraded render | Last-known-good | L2 Service Worker fallback |

## Consequences

### Positive
- Sub-50ms resolution for 95%+ of renders (L1 hit rate expected >90% during active session)
- Offline resilience via Service Worker
- Real-time updates without full page reload
- No additional server infrastructure

### Negative
- Cache coherency complexity (L1 + L2 + API source of truth)
- Service Worker increases initial bundle complexity
- Memory pressure on devices with many open flows (mitigated by LRU eviction)
- WebSocket dependency for real-time (fallback: polling every 30s)

## Related
- ADR-001: Mujarrad-Native Storage (why API is source of truth)
- ADR-003: Real-Time Propagation Protocol (invalidation events)
