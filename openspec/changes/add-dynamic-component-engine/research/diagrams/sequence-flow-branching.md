# Sequence Diagram: Flow Execution with Conditional Branching

## Complete Flow Journey (User Perspective)

```
┌──────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐
│ User │  │Flow Engine│  │ Branch   │  │Component │  │Mujarrad │  │Notification│
│      │  │           │  │Evaluator │  │ Engine   │  │  API    │  │  Engine    │
└──┬───┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  └─────┬──────┘
   │             │              │              │             │              │
   │ Navigate to │              │              │             │              │
   │ /matching   │              │              │             │              │
   │────────────►│              │              │             │              │
   │             │              │              │             │              │
   │             │ startSession(flowId, userId)│             │              │
   │             │────────────────���────────────────────────►│              │
   │             │              │              │             │              │
   │             │ session (CONTEXT node created)            │              │
   │             │◄───────────���─────────────────────────────│              │
   │             │              │              │             │              │
   │             │ prefetchFlow(flowId)        │             │              │
   │             │────────────────────────────────────────►│              │
   │             │              │              │             │              │
   │             │ all definitions cached      │             │              │
   │             │◄───────────────────────────────���────────│              │
   │             │              │              │             │              │
   │             │                    EVENT: flow.started                   │
   │             │─────────────────────────���──────────────────────────────►│
   │             │              │              │             │              │
   │             │              │              │             │   evaluate   │
   │             │              │              │             │   triggers   │
   │             │              │              │             │   (welcome   │
   │             │              │              │             │    email?)   │
   │             │              │              │             │              │
   ══════════════╪══════════════╪══════════════╪═════════════╪══════════════╪══════
   │             ���              │              │             │              │
   │  STAGE 1: BASIC INFO      │              │             │              ���
   │             │              │              │             │              │
   │             │ renderStage(stage1)         │             │              │
   │             │───────────────────────────►│             │              │
   │             │              │              │             │              │
   │             │              │    resolve components      │              │
   │             │              ���    (cache hits)            │              │
   │             │              │              │             │              │
   │ [Company Name] [Sector ▼] [Deal Size]    │             │              │
   │◄──────────────────���─────────────────────│             │              │
   │             │              │              │             │              │
   │ Fills form: │              │              │             │              │
   │ Sector =    │              │              │             │              │
   │ "Energy"    │              │              │             │              │
   │             │              │              │             │              │
   │ Submit      │              │              │             │              │
   │────────────►│              │              │             │              │
   │             │              │              │             │              │
   │             │ saveStageData(session, stage1, data)      │              │
   │             │─────────────────────────────────────────►│              │
   │             │              │              │             │              │
   │             │                    EVENT: stage.submitted                │
   │             │────────────────────────────��───────────────────────────►│
   │             │              │              │             │              │
   ══════════════╪══════════════╪══════════════╪═════════════╪══════════════╪══════
   │             │              │              │             │              │
   │  BRANCH EVALUATION        │              │             │              │
   │             │              │              │             │              │
   │             │ evaluateNext │              │             │              │
   │             │ (session,    │              │             │              │
   │             │  stage1Data) │              │             │              │
   │             │─────────────►│              │             │              │
   │             │              │              │             │              │
   │             │              │ Get edges from stage1      │              │
   │             │              │ (sorted by priority)       │              │
   │             │              │              │             │              │
   │             │              │ Edge 1: sector == "Tech"   │              │
   │             │              │   → stage2A (Tech DD)      │              │
   │             │              │   EVAL: FALSE              │              │
   │             │              │              │             │              │
   │             │              │ Edge 2: sector == "Energy" │              │
   │             │              │   → stage2B (Energy Comp.) │              │
   │             ���              │   EVAL: TRUE ✓             │              │
   │             │              │              │             │              │
   │             │ nextStage =  │              │             │              │
   │             │ stage2B      │              │             │              │
   │             │◄─────────────│              │             │              │
   │             │              │              │             │              │
   │             │                    EVENT: branch.selected                │
   │             │────────────────────────────────────────────────────────►│
   │             │              │              │             │              │
   │             │              │              │             │   Notify:    │
   │             │              │              │             │   "Energy    │
   │             │              │              │             │   specialist │
   │             │              │              │             │   assigned"  │
   │             │              │              │             │              │
   ══════════════╪══════════════╪═══════��══════╪═════════════╪══════════════╪══════
   │             │              │              │             │              │
   │  STAGE 2B: ENERGY COMPLIANCE             │             │              │
   │             │              │              │             │              │
   │             │ renderStage(stage2B)        │             │              │
   │             │─────────���─────────────────►│             ���              │
   │             │              │              │             │              │
   │ [License Type ▼] [ESG Score] [Gov Approvals]           │              │
   │◄───────────────────��────────────────────│             │              │
   │             │              │              │             │              │
   │ Fills form  │              │              │             │              │
   │ Submit      │              │              │             │              │
   │────────────►│              │              │             │              │
   │             │              │              │             │              │
   │             │ evaluateNext │              │             │              │
   │             │─────────────►│              │             │              │
   │             │              │              │             ��              │
   │             │              │ No conditional edges       │              │
   │             │              │ Default → stage3           │              │
   │             │              │              │             │              │
   │             │ nextStage =  │              │             │              │
   │             │ stage3       │              │             │              │
   │             │◄─────────────│              │             │              │
   │             │              │              │             │              ���
   ══════════════╪═══��══════════╪═════��════════╪═════════════╪══════════════╪══════
   │             │              │              │             │              │
   │  STAGE 3: MATCH PREFERENCES (shared)     │             │              │
   │             │              │              │             │              │
   │ [Target Geography ▼] [Timeline] [Deal Type ▼]          │              │
   │◄─────────────��──────────────────────────│             │              │
   │             │              │              │             │              │
   │ Submit      │              │              │             │              │
   │────────────►│              │              │             │              │
   │             │              │              │             │              │
   ══════════════╪══════════════╪══════════════╪═════════════╪══════════════╪══════
   │             │              │              │             │              │
   │  STAGE 4: REVIEW & SUBMIT (terminal)     │             │              │
   │             │              │              │             │              │
   │ [Summary of all collected data]          │             │              │
   │◄─────────────��──────────────────────────│             │              │
   │             │              │              │             │              │
   │ Confirm     │              │              │             │              │
   │────────────►│              │              │             │              │
   │             │              │              │             ���              │
   │             │ completeSession(session)    │             │              │
   │             │──────────────────────��──────────────────►│              │
   │             │              │              │             │              │
   │             │                    EVENT: flow.completed                 │
   │             │────────────────────────────────────────────────────────►│
   │             │              │              │             │              │
   │             │              │              │             │   Notify:    │
   │             │              │              │             │   both orgs, │
   │             │              │              │             │   admin,     │
   │             │              │              │             │   create     │
   │             │              │              │             │   Kanban card│
   │             │              │              │             │              │
   ▼             ▼              ▼              ▼             ▼              ▼
```

## Admin Adds New Stage Mid-Flight (Dynamic Reconfiguration)

```
┌──────┐  ┌───────────┐  ┌─────────┐  ┌─────────────┐
│Admin │  │  Control  │  │Mujarrad │  │Active Users │
│      │  │  Board    │  │  API    │  │(in flow)    │
└──┬───┘  └─────┬─────┘  └────┬────┘  └──────┬──────┘
   │             │              │              │
   │ Insert new  │              │              │
   │ stage "ESG  │              │              │
   │ Assessment" │              │              │
   │ between     │              │              │
   │ stage 2B &  │              │              │
   │ stage 3     │              │              │
   │────────────►│              │              │
   │             │              │              │
   │             │ Validate DAG │              │
   │             │ (acyclicity, │              │
   │             │  reachability│              │
   │             │  defaults)   │              │
   │             │              │              │
   │             │ Create stage │              │
   │             │ TEMPLATE +   │              │
   │             │ update edges │              │
   │             │─────────────►│              │
   │             │              │              │
   │             │ flow.version │              │
   │             │ incremented  │              │
   │             │◄─────────────│              │
   │             │              │              │
   │             │              │ WS: flow.    │
   │             │              │ restructured │
   │             │              │─────────────►│
   │             │              │              │
   │             │              │              │ Users already PAST
   │             │              │              │ stage 2B: unaffected
   │             │              │              │ (pinned to old version)
   │             │              │              │
   │             │              │              │ Users NOT YET at
   │             │              │              │ stage 2B: will see
   │             │              │              │ new stage on next
   │             │              │              │ transition (new version)
   │             │              │              │
   │ "Published" │              │              │
   │◄────────────│              │              │
   │             │              │              │
   ▼             ▼              ▼              ▼
```
