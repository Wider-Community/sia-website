# ADR-005: Notification Trigger Architecture

## Status
Proposed

## Context

The notification engine must fire notifications in response to events from the dynamic component engine — stage transitions, component actions, data changes, match discoveries, timeouts, and schedules. The question: how does the notification engine observe these events and evaluate its trigger rules?

Options:
1. **Event bus (pub/sub)** — engine publishes events; notification engine subscribes and evaluates
2. **Inline hooks** — notification evaluation called directly from engine code at each event point
3. **Database triggers** — Mujarrad node mutations trigger notification evaluation
4. **External event queue** — Kafka/Redis streams for decoupled event processing

## Decision

**Internal event bus (pub/sub) with synchronous in-app delivery and asynchronous external delivery.**

The dynamic engine emits typed events to a lightweight event bus. The notification engine subscribes to all events, evaluates trigger rules against each event, and dispatches to appropriate channels.

## Design

### Event Bus Architecture

```typescript
// Lightweight typed event emitter
interface EngineEventBus {
  emit(event: EngineEvent): void;
  subscribe(handler: (event: EngineEvent) => void): Unsubscribe;
  subscribeToType(type: string, handler: (event: EngineEvent) => void): Unsubscribe;
}

type EngineEvent =
  // Flow events
  | { type: 'flow.started'; flowId: string; sessionId: string; userId: string }
  | { type: 'flow.completed'; flowId: string; sessionId: string; userId: string; data: Record<string, unknown> }
  | { type: 'flow.abandoned'; flowId: string; sessionId: string; userId: string; lastStageId: string }

  // Stage events
  | { type: 'stage.entered'; flowId: string; stageId: string; sessionId: string; userId: string }
  | { type: 'stage.submitted'; flowId: string; stageId: string; sessionId: string; data: Record<string, unknown> }
  | { type: 'stage.skipped'; flowId: string; stageId: string; sessionId: string; reason: string }

  // Component events
  | { type: 'component.value_changed'; componentId: string; instanceId: string; field: string; oldValue: unknown; newValue: unknown; userId: string }
  | { type: 'component.action_triggered'; componentId: string; instanceId: string; action: string; payload: unknown }

  // Branch events
  | { type: 'branch.selected'; flowId: string; fromStageId: string; toStageId: string; conditions: Record<string, unknown> }

  // Match events
  | { type: 'match.discovered'; orgAId: string; orgBId: string; dimensions: MatchDimension[]; score: number }
  | { type: 'match.accepted'; matchId: string; acceptedBy: string }
  | { type: 'match.rejected'; matchId: string; rejectedBy: string; reason: string }

  // Data events
  | { type: 'data.extracted'; nodeId: string; schemaDiscovered: boolean; fields: string[] }
  | { type: 'data.threshold_breached'; nodeId: string; field: string; value: number; threshold: number; direction: 'above' | 'below' }

  // Notification meta-events
  | { type: 'notification.delivered'; notificationId: string; channel: string; recipientId: string }
  | { type: 'notification.acknowledged'; notificationId: string; recipientId: string }
  | { type: 'notification.escalated'; notificationId: string; level: number };
```

### Notification Engine Subscription

```typescript
class NotificationEngine {
  private definitions: NotificationDefinition[]; // Loaded from Mujarrad
  private bus: EngineEventBus;

  initialize() {
    // Subscribe to ALL events — the engine evaluates internally which ones match triggers
    this.bus.subscribe(event => this.evaluate(event));
  }

  private async evaluate(event: EngineEvent): Promise<void> {
    // Find all notification definitions whose trigger matches this event type
    const candidates = this.definitions.filter(def =>
      def.enabled && def.trigger.type === this.mapEventToTriggerType(event)
    );

    for (const definition of candidates) {
      // Check if event source matches (specific flow/stage/component or wildcard)
      if (!this.matchesSource(definition.trigger.source, event)) continue;

      // Evaluate additional filter conditions
      if (definition.trigger.filter && !this.evaluateFilters(definition.trigger.filter, event)) continue;

      // Check cooldown
      if (this.isInCooldown(definition.id, event)) continue;

      // Resolve recipients
      const recipients = await this.resolveRecipients(definition.recipients, event);

      // Interpolate template
      const messages = this.interpolateTemplates(definition.template, event, recipients);

      // Dispatch to channels
      await this.dispatch(definition.channels, messages, recipients);

      // Register for escalation tracking if needed
      if (definition.escalation) {
        this.escalationMonitor.track(definition, recipients, event);
      }
    }
  }
}
```

### Dispatch Strategy by Channel

| Channel | Delivery | Latency Target | Implementation |
|---------|----------|---------------|----------------|
| In-app | Synchronous (WebSocket push) | <500ms | Push via existing WS connection |
| Email | Asynchronous (queue) | <30s | Background job → SMTP/SendGrid |
| Push | Asynchronous (queue) | <5s | Background job → FCM |
| SMS | Asynchronous (queue) | <10s | Background job → Twilio |
| Webhook | Asynchronous (queue) | <5s | Background job → HTTP POST |
| Slack | Asynchronous (queue) | <5s | Background job → Slack API |

### Escalation State Machine

```
                    ┌─────────────┐
                    │  PENDING    │ (notification sent, awaiting ack)
                    └──────┬──────┘
                           │
              timeout      │      acknowledged
         ┌─────────────────┼─────────────────┐
         ▼                                    ▼
┌─────────────────┐                  ┌──────────────┐
│  ESCALATING     │                  │  RESOLVED    │
│  (level N)      │                  │              │
└────────┬────────┘                  └──────────────┘
         │
         │ timeout (again)
         ▼
┌─────────────────┐
│  ESCALATING     │ ──── max level? ────► EXHAUSTED
│  (level N+1)    │
└─────────────────┘
```

```typescript
class EscalationMonitor {
  private tracked: Map<string, EscalationState> = new Map();

  track(definition: NotificationDefinition, recipients: Recipient[], event: EngineEvent) {
    const state: EscalationState = {
      definitionId: definition.id,
      currentLevel: 0,
      sentAt: Date.now(),
      timeout: definition.escalation.timeout,
      maxLevel: definition.escalation.maxEscalations,
      chain: definition.escalation.escalationChain,
    };
    this.tracked.set(`${definition.id}:${event.type}:${Date.now()}`, state);
    this.scheduleCheck(state);
  }

  private async scheduleCheck(state: EscalationState) {
    await delay(state.timeout);

    if (state.acknowledged) return; // Resolved, no escalation needed

    if (state.currentLevel >= state.maxLevel) {
      state.status = 'exhausted';
      this.bus.emit({ type: 'notification.escalated', level: -1 }); // Audit event
      return;
    }

    // Escalate
    state.currentLevel++;
    const nextLevel = state.chain[state.currentLevel];
    const recipients = await this.resolveRecipients(nextLevel.recipientRule);
    await this.dispatch(nextLevel.channelOverride || state.defaultChannel, recipients);

    this.scheduleCheck(state); // Schedule next check
  }
}
```

## Rationale

### Why event bus over inline hooks
- **Decoupling**: Engine code doesn't need to know about notifications; it just emits events
- **Extensibility**: New notification types subscribe without modifying engine code
- **Testability**: Mock the bus to test notifications independently of engine
- **Performance**: Async dispatch doesn't block the render path

### Why NOT external queue (Kafka/Redis)
- SIA is a client-side SPA + Mujarrad API — no existing message queue infrastructure
- Event volume is low (dozens per minute, not thousands per second)
- In-process event bus is simpler, lower latency, zero infrastructure cost
- If volume grows, can migrate to external queue later without changing event schema

### Why NOT database triggers
- Mujarrad may not support database-level triggers (REST API abstraction)
- Notification logic is too complex for trigger expressions (multi-condition, recipient resolution)
- Harder to test and debug than application-level event handlers

## Consequences

### Positive
- Clean separation: engine emits, notifications observe
- All event types are typed and documented — serves as integration contract
- Escalation state machine handles complex timeout/acknowledgment flows
- Multi-channel with fallback provides delivery resilience

### Negative
- In-process bus means notifications only evaluate for events that happen in this client session (server-side events like schedule/threshold need a server component)
- Escalation timeout tracking requires persistent storage (can't rely on client-side timers for multi-hour timeouts)

### Mitigations
- Server-side events (schedule, threshold) evaluated by a background service that also connects to the event bus via Mujarrad webhooks
- Escalation state persisted as Mujarrad CONTEXT nodes; a background service polls for timeout checks

## Related
- ADR-001: Mujarrad-Native Storage (notification definitions as TEMPLATE nodes)
- ADR-003: Real-Time Propagation (WebSocket for in-app notification delivery)
- ADR-004: Flow Engine State Machine (stage events that trigger notifications)
