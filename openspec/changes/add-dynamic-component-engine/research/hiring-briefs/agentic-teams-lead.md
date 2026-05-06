# Hiring Brief: Agentic Teams Lead — Dynamic Component Engine

## Role Summary

Design and orchestrate AI agents that automate schema discovery from unstructured data, suggest UI components for discovered schemas, infer matching dimensions between organizations, and optimize flow configurations based on user behavior — all with human-in-the-loop governance.

## Context

SIA's dynamic component engine makes UX configurable at runtime, but someone still needs to decide WHAT to configure. When a new data extraction reveals 50 new fields from a company's financial report, a human shouldn't manually map each field to a UI component. AI agents should propose the mapping, suggest matching dimensions, and recommend flow optimizations — with humans approving before changes go live.

## Core Responsibilities

### 1. Schema Discovery Agent
- Design an agent that analyzes unstructured/semi-structured documents (PDFs, spreadsheets, reports)
- Extract structured schemas: field names, types, relationships, cardinality
- Map extracted schemas to Mujarrad node types (what becomes a TEMPLATE vs. REGULAR node)
- Handle ambiguity: propose multiple schema interpretations ranked by confidence

### 2. Component Suggestion Agent
- Given a discovered schema, suggest appropriate UI components from the registry
- For new field types not in registry: propose new component definitions (renderer, config, validations)
- Consider context: which flow this data belongs to, what stage, what user persona
- Output: draft component instances ready for human review + one-click publish

### 3. Matching Criteria Inference Agent
- Analyze two organization profiles (Mujarrad nodes with extracted data)
- Identify dimensions where alignment indicates partnership potential
- Score match quality with explainable reasoning
- Discover non-obvious matches (e.g., Org A's "expansion markets" overlaps Org B's "operational markets")

### 4. Flow Optimization Agent
- Analyze user behavior in dynamic flows (drop-off points, time-per-stage, branch selections)
- Suggest stage reordering, removal of low-value stages, insertion of missing stages
- Identify notification timing optimization (when do escalations reduce drop-off?)
- A/B test flow variants and report statistical significance

### 5. Human-in-the-Loop Governance
- Design the propose → review → approve → deploy workflow for all agent suggestions
- Build confidence thresholds: high-confidence suggestions auto-stage for review; low-confidence queue for deep review
- Design rollback mechanism when approved suggestions underperform
- Design audit trail: who approved what, when, with what evidence

## Required Experience

- **4+ years** building production AI/ML systems with human oversight
- **LLM application development** — prompt engineering, RAG, structured output extraction
- **Agent orchestration** — multi-step reasoning, tool use, state management
- **Data extraction** — document parsing, schema inference, NER, relationship extraction
- **Production ML governance** — confidence scoring, A/B testing, monitoring, rollback

## Preferred Experience

- Claude API / Anthropic SDK (SIA's AI stack)
- Knowledge graph augmented generation (using Mujarrad as context)
- B2B / enterprise data understanding (financial reports, regulatory filings)
- Arabic language NLP (bilingual extraction)
- Recommendation systems (matching is fundamentally a recommendation problem)
- Agent frameworks (LangGraph, CrewAI, or custom orchestration)

## Key Design Challenges

1. **Schema ambiguity** — same document may have multiple valid interpretations; agent must rank and explain
2. **Match quality** — avoiding false positives in matching that waste user time
3. **Human trust** — agents must show their reasoning; "black box" suggestions won't get approved
4. **Cold start** — limited initial data for flow optimization; must work with small sample sizes
5. **Domain specificity** — B2B deal facilitation has unique patterns unlike consumer recommendation

## Agent Architecture (Draft)

```
┌────────────────────────────────────────────────────────────┐
│  AGENT ORCHESTRATOR                                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Schema       │  │ Component    │  │ Matching         │  │
│  │ Discovery    │  │ Suggestion   │  │ Inference        │  │
│  │ Agent        │  │ Agent        │  │ Agent            │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  PROPOSAL QUEUE                                          ││
│  │  • Schema proposals (confidence: 0.0–1.0)               ││
│  │  • Component suggestions (with preview)                  ││
│  │  • Match discoveries (with explanation)                  ││
│  │  • Flow optimizations (with evidence)                    ││
│  └──────────────────────────┬──────────────────────────────┘│
│                             │                                │
│                             ▼                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  HUMAN REVIEW INTERFACE (in Control Board)              ││
│  │  • Accept / Reject / Modify                              ││
│  │  • Confidence-based auto-routing                         ││
│  │  • Audit log of all decisions                            ││
│  └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

## Deliverables (First 4 Weeks)

| Week | Deliverable |
|------|------------|
| 1 | Schema Discovery Agent design (input formats, extraction pipeline, confidence model) |
| 2 | Component Suggestion Agent design (registry integration, context-aware mapping) |
| 3 | Matching Inference Agent design (dimension identification, scoring, explanation) |
| 4 | Governance framework; agent interaction diagrams; integration with Control Board |

## Working Context

- **AI Stack**: Claude API (Anthropic SDK), potentially local models for high-volume extraction
- **Data Sources**: PDF reports, Excel spreadsheets, company profiles, regulatory filings
- **Integration**: Mujarrad SDK for reading/writing nodes; Control Board for human review UI
- **Collaboration**: Works with Data Architect (schema design), Software Engineer (UI integration)
- **Location**: Remote, async-first
