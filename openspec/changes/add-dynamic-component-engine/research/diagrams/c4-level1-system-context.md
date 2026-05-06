# C4 Level 1: System Context Diagram

## Dynamic Component Engine — System Context

```
┌────────────────���───────────────��────────────────────────────────────────────┐
│                              EXTERNAL ACTORS                                 │
└─────────────���───────────────────────────────────────────────────────────────┘

    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │  Deal         │         │  Platform     │         │  Agentic      │
    │  Participant  │         │  Admin        │         │  System       │
    │               │         │               │         │  (AI Agents)  │
    │  Views dynamic│         │  Configures   │         │  Discovers    │
    │  forms, flows,│         │  components,  │         │  schemas,     │
    │  notifications│         │  flows, notif.│         │  suggests     │
    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
            │                         │                         │
            │  Uses                   │  Configures             │  Proposes
            │                         │                         ���
            ▼                         ▼                         ▼
┌───────────────────────────────────────────────────��─────────────────────────┐
│                                                                              │
│                        SIA PLATFORM                                           │
│                                                                              │
│  ┌────────────────────────────────────────���───────────────────────────��───┐  │
│  │                    DYNAMIC COMPONENT ENGINE                             │  │
│  │                                                                        │  │
│  │  Resolves UI components from configuration, orchestrates multi-stage   │  │
│  │  flows with conditional branching, dispatches notifications, and       │  │
│  │  adapts to schemas discovered at runtime.                              │  │
│  │                                                                        │  │
│  └────────────────────────────────────��───────────────────────────────────┘  │
│                                                                              │
└───────────────��──────────────────┬───────────────────────────────────────────┘
                                   │
                                   │  Stores/Retrieves
                                   │  (nodes + relationships)
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │                               │
                    │     MUJARRAD KNOWLEDGE        │
                    │     GRAPH                     │
                    │                               │
                    │  Source of truth for:         │
                    │  • Component definitions      │
                    │  • Flow configurations        │
                    │  • Business data (orgs,deals) │
                    │  • Notification rules         │
                    │  • Matching criteria          │
                    │                               │
                    └���──────────────┬───────────────┘
                                   │
                                   │  Extracts data from
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │                               ���
                    │     EXTERNAL DATA SOURCES     │
                    │                               │
                    │  • Financial reports (PDF)    │
                    │  • Company profiles           │
                    │  • Regulatory filings         │
                    │  • Market data feeds          │
                    │                               │
                    └───────────────────────────────┘


┌───────────────────────────────��─────────────────────────────────────────────┐
│                         DELIVERY CHANNELS                                    │
│                                                                              │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│   │ In-App │  │ Email  │  │ Push   │  │  SMS   │  │Webhook │  │ Slack  │  │
│   │(WebSkt)│  │(SMTP)  │  │ (FCM)  │  │(Twilio)│  │ (HTTP) │  │ (API)  │  │
│   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
└───────────────────────���─────────────────────────────────────────────────────┘
```

## Relationships Summary

| From | To | Relationship |
|------|----|-------------|
| Deal Participant | SIA Platform | Uses dynamic forms, flows, receives notifications |
| Platform Admin | SIA Platform | Configures components, flows, notifications via Control Board |
| Agentic System | SIA Platform | Proposes schema mappings, component suggestions, match inferences |
| SIA Platform | Mujarrad | Stores/retrieves all configuration and business data as nodes |
| Mujarrad | External Data Sources | Extracts structured data from unstructured documents |
| SIA Platform | Delivery Channels | Dispatches notifications via multiple channels |

## Key Insight

The Dynamic Component Engine sits between the users and Mujarrad — it translates configuration (nodes/relationships) into rendered UI at runtime. The platform admin never touches code; they manipulate Mujarrad nodes via the Control Board, and the engine reflects those changes immediately.
