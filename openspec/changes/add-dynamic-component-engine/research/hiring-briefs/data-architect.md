# Hiring Brief: Data Architect — Dynamic Component Engine

## Role Summary

Design the Mujarrad knowledge graph schema for the dynamic component engine — how component definitions, instances, flows, branch rules, notifications, and matching criteria are modeled as typed nodes with relationships, enabling runtime-discoverable UI generation from evolving data.

## Context

SIA's core challenge: **matching criteria are unknown at build time**. Structured data is extracted from big-data files (financial reports, company profiles, regulatory documents) and stored in Mujarrad. The data architect designs how this extracted data maps to UI-renderable component definitions, how schemas evolve without breaking existing instances, and how matching dimensions emerge from the graph structure.

## Core Responsibilities

### 1. Mujarrad Node Schema Design
- Design TEMPLATE node schemas for component definitions (renderers, configs, validations, i18n)
- Design REGULAR node schemas for component instances (overrides, placement, ordering)
- Design TEMPLATE node schemas for flow definitions (stages, ordering, entry conditions)
- Design TEMPLATE node schemas for notification definitions (triggers, channels, escalation)
- Design ASSUMPTION node usage for draft/unpublished configurations
- Define all relationship types with semantic meaning and constraints

### 2. Schema Evolution & Discovery
- Design how extracted data (unknown schema at extraction time) becomes typed nodes
- Design progressive schema refinement: raw extraction → structured node → component-mappable
- Design backward-compatible schema evolution (new fields don't break existing instances)
- Design schema versioning and migration strategy within Mujarrad's node model

### 3. Matching Criteria Emergence
- Design how node attributes become matchable dimensions automatically
- Design the relationship model for match discovery (Org A attributes ↔ Org B requirements)
- Design weighting and scoring schemas for match quality
- Design how new corridors/sectors introduce new matching dimensions without schema changes

### 4. Query & Filter Optimization
- Design query patterns for component resolution (instance → definition traversal)
- Design filter index strategy for complex component data (nested objects, arrays, metrics)
- Design relationship traversal patterns for flow stage ordering and branching
- Design analytics queries for notification delivery and engagement metrics

### 5. Big-Data Extraction Pipeline Design
- Design the ingestion model: raw document → extraction → structured Mujarrad nodes
- Design schema inference from extracted data (type detection, relationship inference)
- Design quality gates: when is extracted data reliable enough to surface in UI?
- Design the feedback loop: user corrections improve future extractions

## Required Experience

- **5+ years** data architecture for graph databases or knowledge management systems
- **Knowledge graph modeling** — entity-relationship design, ontology patterns, semantic relationships
- **Schema evolution** — versioning strategies, backward compatibility, migration without downtime
- **Data extraction pipelines** — ETL/ELT, schema inference, data quality management
- **Query optimization** — graph traversal performance, indexing strategies, denormalization trade-offs

## Preferred Experience

- Graph databases (Neo4j, ArangoDB, or similar) — Mujarrad is a custom knowledge graph
- JSON Schema design and validation
- Multi-tenant data modeling
- Financial/regulatory data structures (relevant to SIA's corridor domain)
- Arabic language data handling and bilingual data models
- Machine learning feature engineering (understanding what makes data "matchable")

## Key Design Challenges

1. **Unknown schema at build time** — how to model data whose shape is discovered, not predefined
2. **Template/instance inheritance** — TEMPLATE changes must propagate to REGULAR instances cleanly
3. **Matching dimension emergence** — new data fields must automatically become filterable/matchable
4. **Relationship semantics** — `instance_of`, `belongs_to`, `branches_to`, `triggered_by` must be unambiguous
5. **Query performance** — component resolution must be <50ms; can't afford deep graph traversals per render

## Deliverables (First 4 Weeks)

| Week | Deliverable |
|------|------------|
| 1 | Complete relationship type catalog; TEMPLATE node schemas for components + flows |
| 2 | Schema evolution strategy; big-data extraction → node pipeline design |
| 3 | Matching criteria emergence model; filter dimension derivation design |
| 4 | Query optimization patterns; notification schema; ERD / knowledge graph diagrams |

## Working Context

- **Backend**: Mujarrad API (`https://mujarrad.onrender.com/api`) — REST, node CRUD, relationships
- **Node Types**: TEMPLATE, REGULAR, CONTEXT, ASSUMPTION (each with typed relationships)
- **Collaboration**: Works with Software Architect (integration patterns), Agentic Teams Lead (schema discovery AI)
- **Domain**: B2B deal facilitation, Saudi Arabia-Malaysia investment corridor, $2M-$50M deals
- **Location**: Remote, async-first
