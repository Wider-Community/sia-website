# Sequence Diagram: Notification Lifecycle (Trigger → Deliver → Escalate)

## Normal Delivery (No Escalation)

```
┌──────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Engine│  │Event Bus │  │Notif.    │  │Template  │  │Recipient │  │Channel   │
│Event │  │          │  │Engine    │  │Engine    │  │Resolver  │  │Dispatcher│
└──┬───┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
   │            │              │              │             │              │
   │ stage.     │              │              │             │              │
   │ submitted  │              │              │             │              │
   │───────────►│              │              │             │              │
   │            │              │              │             │              │
   │            │ broadcast    │              │             │              │
   │            │─────────────►│              │             │              │
   │            │              │              │             │              │
   │            │              │ Load notif.  │             │              │
   │            │              │ definitions  │             │              │
   │            │              │ matching     │             │              │
   │            │              │ event type   │             │              │
   │            │              │              │             │              │
   │            │              │ Found: 2     │             │              │
   │            │              │ definitions  │             │              │
   │            │              │              │             │              │
   │            │              │ Check        │             │              │
   │            │              │ conditions:  │             │              │
   │            │              │ Def 1: ✓     │             │              │
   │            │              │ Def 2: ✗     │             │              │
   │            │              │ (condition   │             │              │
   │            │              │  not met)    │             │              │
   │            │              │              │             │              │
   │            │              │ Check        │             │              │
   │            │              │ cooldown:    │             │              │
   │            │              │ Def 1: OK    │             │              │
   │            │              │ (not in      │             │              │
   │            │              │  cooldown)   │             │              │
   │            │              │              │             │              │
   │            │              │ Resolve      │             │              │
   │            │              │ recipients   │             │              │
   │            │              │─────────────────────────►│              │
   │            │              │              │             │              │
   │            │              │              │  Type: role │              │
   │            │              │              │  Roles:     │              │
   │            │              │              │  [deal_owner│              │
   │            │              │              │  counterpart│              │
   │            │              │              │  y]         │              │
   │            │              │              │             │              │
   │            │              │ Recipients:  │             │              │
   │            │              │ [user_A,     │             │              │
   │            │              │  user_B]     │             │              │
   │            │              │◄─────────────────────────│              │
   │            │              │              │             │              │
   │            │              │ Interpolate  │             │              │
   │            │              │ template     │             │              │
   │            │              │─────────────►│             │              │
   │            │              │              │             │              │
   │            │              │              │ "{{org_name}│             │              │
   │            │              │              │ submitted   │             │              │
   │            │              │              │ {{stage}}   │             │              │
   │            │              │              │ assessment" │             │              │
   │            │              │              │             │              │
   │            │              │              │ → "Acme Corp│             │              │
   │            │              │              │  submitted  │             │              │
   │            │              │              │  Energy     │             │              │
   │            │              │              │  Compliance │             │              │
   │            │              │              │  assessment"│             │              │
   │            │              │              │             │              │
   │            │              │ Interpolated │             │              │
   │            │              │ messages     │             │              │
   │            │              │ (EN + AR)    │             │              │
   │            │              │◄─────────────│             │              │
   │            │              │              │             │              │
   │            │              │ Dispatch to channels       │              │
   │            │              │──────────────────────────────────────────►│
   │            │              │              │             │              │
   │            │              │              │             │  Channel 1:  │
   │            │              │              │             │  in_app →    │
   │            │              │              │             │  WebSocket   │
   │            │              │              │             │  push to     │
   │            │              │              │             │  user_A,     │
   │            │              │              │             │  user_B      │
   │            │              │              │             │              │
   │            │              │              │             │  Channel 2:  │
   │            │              │              │             │  email →     │
   │            │              │              │             │  queue job   │
   │            │              │              │             │  for SMTP    │
   │            │              │              │             │              │
   │            │              │              │             │  Log:        │
   │            │              │              │             │  delivery    │
   │            │              │              │             │  record      │
   │            │              │              │             │              │
   ▼            ▼              ▼              ▼             ▼              ▼
```

## Escalation Flow (Timeout → Escalate → Acknowledge)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Notif.    │  │Escalation│  │ Timer    │  │Recipient │  │Channel   │
│Engine    │  │Monitor   │  │ Service  │  │Resolver  │  │Dispatcher│
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │              │              │
     │ Notification │              │              │              │
     │ dispatched   │              │              │              │
     │ (requires    │              │              │              │
     │  ack)        │              │              │              │
     │─────────────►│              │              │              │
     │              │              │              │              │
     │              │ Register     │              │              │
     │              │ escalation   │              │              │
     │              │ state:       │              │              │
     │              │ {level: 0,   │              │              │
     │              │  timeout:    │              │              │
     │              │  24h,        │              │              │
     │              │  maxLevel: 3}│              │              │
     │              │              │              │              │
     │              │ Start timer  │              │              │
     │              │─────────────►│              │              │
     │              │              │              │              │
     │              │              │              │              │
     │              │   ... 24 hours pass ...     │              │
     │              │   (no acknowledgment)       │              │
     │              │              │              │              │
     │              │ TIMEOUT!     │              │              │
     │              │◄─────────────│              │              │
     │              │              │              │              │
     │              │ Level 0 → 1  │              │              │
     │              │              │              │              │
     │              │ Resolve L1   │              │              │
     │              │ recipients   │              │              │
     │              │─────────────────────────►│              │
     │              │              │              │              │
     │              │ L1 chain:    │              │              │
     │              │ role=manager │              │              │
     │              │ → [mgr_user] │              │              │
     │              │◄─────────────────────────│              │
     │              │              │              │              │
     │              │ Dispatch     │              │              │
     │              │ (channel     │              │              │
     │              │  override:   │              │              │
     │              │  email→sms)  │              │              │
     │              │──────────────────────────────────────────►│
     │              │              │              │              │
     │              │              │              │   SMS to     │
     │              │              │              │   manager:   │
     │              │              │              │   "ESCALATED:│
     │              │              │              │    Deal X    │
     │              │              │              │    awaiting  │
     │              │              │              │    action    │
     │              │              │              │    (24h)"    │
     │              │              │              │              │
     │              │ Start timer  │              │              │
     │              │ (L1 timeout) │              │              │
     │              │─────────────►│              │              │
     │              │              │              │              │
     │              │              │              │              │
     │   ... 4 hours later ...    │              │              │
     │              │              │              │              │
     │ ACK received │              │              │              │
     │ (manager     │              │              │              │
     │  clicked     │              │              │              │
     │  action)     │              │              │              │
     │─────────────►│              │              │              │
     │              │              │              │              │
     │              │ Cancel timer │              │              │
     │              │─────────────►│              │              │
     │              │              │              │              │
     │              │ Mark:        │              │              │
     │              │ RESOLVED     │              │              │
     │              │ acked_by:    │              │              │
     │              │ mgr_user     │              │              │
     │              │ acked_at:    │              │              │
     │              │ timestamp    │              │              │
     │              │              │              │              │
     │              │ Log audit    │              │              │
     │              │ event        │              │              │
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
```

## Notification Attached to Match Discovery

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Matching  │  │Event Bus │  │Notif.    │  │Channel   │  │Flow      │
│Engine    │  │          │  │Engine    │  │Dispatcher│  │Engine    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │              │              │
     │ Criteria     │              │              │              │
     │ aligned:     │              │              │              │
     │ OrgA.sector  │              │              │              │
     │ ∩ OrgB.target│              │              │              │
     │ Score: 0.87  │              │              │              │
     │              │              │              │              │
     │ match.       │              │              │              │
     │ discovered   │              │              │              │
     │─────────────►│              │              │              │
     │              │              │              │              │
     │              │ broadcast    │              │              │
     │              │─────────────►│              │              │
     │              │              │              │              │
     │              │              │ Matched      │              │
     │              │              │ triggers:    │              │
     │              │              │              │              │
     │              │              │ 1. "match_   │              │
     │              │              │    both_     │              │
     │              │              │    parties"  │              │
     │              │              │              │              │
     │              │              │ 2. "match_   │              │
     │              │              │    admin_    │              │
     │              │              │    alert"    │              │
     │              │              │              │              │
     │              │              │ 3. "match_   │              │
     │              │              │    auto_     │              │
     │              │              │    kanban"   │              │
     │              │              │              │              │
     │              │              │ Dispatch 1:  │              │
     │              │              │─────────────►│              │
     │              │              │              │              │
     │              │              │              │ In-app +     │
     │              │              │              │ email to     │
     │              │              │              │ OrgA + OrgB  │
     │              │              │              │ contacts     │
     │              │              │              │              │
     │              │              │ Dispatch 2:  │              │
     │              │              │─────────────►│              │
     │              │              │              │              │
     │              │              │              │ Slack to     │
     │              │              │              │ #deals       │
     │              │              │              │ channel      │
     │              │              │              │              │
     │              │              │ Trigger 3:   │              │
     │              │              │ Auto-create  │              │
     │              │              │ flow session │              │
     │              │              │─────────────────────────────►│
     │              │              │              │              │
     │              │              │              │              │ Create
     │              │              │              │              │ CONTEXT
     │              │              │              │              │ node:
     │              │              │              │              │ deal-
     │              │              │              │              │ progression
     │              │              │              │              │ flow
     │              │              │              │              │
     │              │              │              │              │ Kanban
     │              │              │              │              │ card
     │              │              │              │              │ appears
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
```
