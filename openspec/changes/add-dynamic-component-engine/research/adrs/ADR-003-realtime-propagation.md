# ADR-003: Real-Time Propagation Protocol

## Status
Proposed

## Context

When an administrator modifies a component definition or flow configuration in the Control Board, that change must propagate to all connected clients rendering instances of that component. The question is: how fast, how granular, and through what mechanism?

Options:
1. **WebSocket push** — server broadcasts change events to all connected clients
2. **Server-Sent Events (SSE)** — unidirectional push from server
3. **Polling** — clients periodically check for updates
4. **Webhook + service worker** — server POSTs to a webhook endpoint that notifies SW

## Decision

**WebSocket push with polling fallback.** Mujarrad broadcasts typed events on node mutations; clients subscribe to relevant node types and invalidate caches on receipt.

## Design

### Event Types

```typescript
type EngineEvent =
  | { type: 'definition.updated'; nodeId: string; version: number; nodeType: 'TEMPLATE' }
  | { type: 'definition.created'; nodeId: string; nodeType: 'TEMPLATE' }
  | { type: 'definition.deleted'; nodeId: string; nodeType: 'TEMPLATE' }
  | { type: 'flow.restructured'; flowId: string; version: number }
  | { type: 'notification.updated'; nodeId: string; version: number }
  | { type: 'instance.reassigned'; instanceId: string; newDefinitionId: string };
```

### Subscription Model

Clients subscribe to events relevant to their current view:

```typescript
// On flow entry: subscribe to all definitions used in this flow
ws.subscribe({
  filter: {
    nodeIds: [...definitionIdsInCurrentFlow],
    types: ['definition.updated', 'flow.restructured']
  }
});

// Control Board: subscribe to all engine events
ws.subscribe({ filter: { types: ['*'] } });
```

### Propagation Pipeline

```
Admin action (Control Board)
    │
    ▼
Mujarrad API mutation (update TEMPLATE node)
    │
    ▼
Mujarrad event emitter (internal)
    │
    ▼
WebSocket server broadcasts to subscribed clients
    │
    ├──► Client A (in flow using this component)
    │    → Invalidate L1/L2 cache for this definition
    │    → React re-render for affected instances
    │
    ├──► Client B (in different flow, not using this component)
    │    → Event filtered out by subscription, no action
    │
    └──► Client C (Control Board admin)
         → Update definition list, show "published" indicator
```

### Timing Guarantees

| Phase | Target Latency | Notes |
|-------|---------------|-------|
| Admin save → Mujarrad write | <100ms | API call |
| Mujarrad write → event emit | <50ms | Internal event bus |
| Event emit → WebSocket deliver | <100ms | Network |
| Client receive → cache invalidate | <10ms | Synchronous |
| Cache invalidate → re-render | <50ms | React reconciliation |
| **Total: Admin save → user sees update** | **<300ms** | Target: <2s with margin |

### Fallback: Polling

When WebSocket connection is unavailable or drops:

```typescript
// Fallback polling every 30 seconds
const pollInterval = 30_000;

async function pollForChanges() {
  const currentVersions = l1Cache.getVersionMap(); // { defId: version }
  const serverVersions = await mujarrad.getVersions(Object.keys(currentVersions));

  const stale = findMismatches(currentVersions, serverVersions);
  stale.forEach(defId => invalidateAndRefetch(defId));
}
```

### Reconnection Strategy

```
Connection lost
    │
    ▼
Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
    │
    ▼
On reconnect:
    1. Re-subscribe to relevant events
    2. Request "missed events" since last received timestamp
    3. If gap too large (>5min): full cache invalidation + re-fetch all active definitions
```

## Rationale

### Why WebSocket over SSE
- Bidirectional: client can send subscription filters (not just receive)
- Better reconnection semantics in existing libraries (socket.io, ws)
- Aligns with refine.dev's real-time provider interface (expects WebSocket-like transport)

### Why NOT pure polling
- 30s polling means up to 30s stale data after admin changes — unacceptable for "real-time" UX
- Polling 50+ definition versions every 30s is wasteful when changes are infrequent
- Poor user experience: admin publishes change, waits, wonders if it worked

### Why include polling fallback
- WebSocket connections can be blocked by corporate firewalls/proxies
- Mujarrad's WebSocket support status is an open question (may need to build)
- Graceful degradation > hard failure

## Consequences

### Positive
- Sub-second propagation for most updates
- Efficient: only transmit events for things that changed
- Subscription filtering prevents unnecessary re-renders
- Graceful degradation to polling if WS unavailable

### Negative
- Requires WebSocket infrastructure in Mujarrad (may need to build)
- Connection state management complexity (reconnection, missed events)
- Memory for subscription tracking on server side

### Open Questions
- Does Mujarrad currently emit events on node mutations? If not, this is a prerequisite build.
- What is the expected number of concurrent WebSocket connections? (sizing)
- Should events include the full updated definition or just the version bump? (bandwidth vs. latency trade-off)

## Related
- ADR-001: Mujarrad-Native Storage (source of truth)
- ADR-002: Caching Strategy (what gets invalidated)
- ADR-004: Flow Engine State Machine (flow restructure events)
