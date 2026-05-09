# Change: Evolve Dynamic Engine into a Data-Aware Platform Layer

## Why

The dynamic component engine currently operates as a standalone form builder — it stores answers but has no awareness of the data already in the system. Components use hardcoded option lists (`defaultConfig.options`), the engine doesn't know about organizations, contacts, or engagements, and the rest of the portal still renders through hardcoded React pages that duplicate what the engine should provide.

This creates three problems:
1. **Duplication** — Every page builds its own forms, dropdowns, and validation from scratch. Adding a field means editing React code, not configuring a component.
2. **Data isolation** — A "Select Organization" dropdown in a flow stage can't access the actual organizations in Mujarrad. Components are data-blind.
3. **Rigidity** — New entity types require new code. There's no way for an admin to create a new data-driven experience without a developer.

The engine must evolve from "form builder that stores answers" to "data-aware platform layer where every component can draw from the full context of the system."

## What Changes

### Part 1: Global Data Sources

Introduce a first-class **Data Source** concept that components can bind to at definition time. Two categories:

#### 1A. System Reference Data

Persistent, centrally-managed datasets that rarely change. These follow the **reference data management** pattern — each dataset is a named, versioned entity stored in Mujarrad as a `reference-data` resource.

| Dataset | Examples | Structure |
|---------|----------|-----------|
| Countries | SA, MY, AE, US, ... | `{ code, name_en, name_ar, region }` |
| Currencies | SAR, MYR, USD, ... | `{ code, name, symbol }` |
| Sectors | Energy, Technology, Finance, ... | `{ slug, name_en, name_ar, parent? }` |
| Deal Stages | Prospect, Due Diligence, Negotiation, ... | `{ slug, label_en, label_ar, order }` |
| Organization Types | Investor, Company, Government, NGO | `{ slug, label_en, label_ar }` |
| Action Types | Upload File, Send Email, Approve, Reject | `{ slug, label_en, handler }` |

Reference datasets are:
- Stored as Mujarrad nodes (`reference-data` resource) with a `datasetSlug` field
- Managed via a new **Reference Data** tab in the Control Board
- Seedable with default values (countries, currencies, etc.)
- Versioned — changes create a new version, components always resolve the latest

#### 1B. Live Entity Data

Every resource registered in the **Entity Registry** (`ENTITY_REGISTRY`) is automatically available as a data source. This includes all current entities and any entity added in the future — the system discovers them dynamically at runtime by reading the registry keys.

Current entities (auto-discovered):
`organizations`, `contacts`, `files`, `notes`, `engagements`, `tasks`, `signing-requests`, `signature-fields`, `activity-events`, `sla-rules`, `component-definitions`, `component-instances`, `flow-definitions`, `flow-sessions`, `notification-definitions`, `permission-grants`, `role-assignments`, `agent-suggestions`, `publish-requests`, `notification-preferences`

Future entities added to `ENTITY_REGISTRY` become available instantly — no engine code changes required.

When an admin binds a component to a live entity data source, they configure:
- **Resource**: Which entity collection (auto-populated from registry)
- **Display field**: Which field to show as the label (auto-populated from `titleField` and other fields)
- **Value field**: Which field to store as the value (typically `id`)
- **Filters** (optional): Static filters to narrow the dataset (e.g., only organizations with `status: active`)

At runtime, the component fetches live data from Mujarrad and populates the dropdown/autocomplete with current records.

### Part 2: Data Source Binding in Component Definitions

The `ComponentDefinition` type gains a new optional field: `dataSource`.

```typescript
interface DataSourceBinding {
  type: 'none' | 'reference' | 'entity';

  // For type: 'reference'
  datasetSlug?: string;          // e.g. 'countries', 'sectors'

  // For type: 'entity'
  resource?: string;             // e.g. 'organizations', 'contacts'
  displayField?: string;         // e.g. 'name', 'title', 'firstName'
  valueField?: string;           // e.g. 'id' (default)
  filters?: Array<{              // optional static filters
    field: string;
    operator: string;
    value: unknown;
  }>;
}
```

The Control Board's component editor gains a **Data Source** section:
- **Source Type** dropdown: None / System Reference / Entity Data
- If Reference: dropdown of available datasets (fetched from `reference-data`)
- If Entity: dropdown of all resources (read from `ENTITY_REGISTRY` keys), then a display field selector

When a component has a data source, the renderer ignores `defaultConfig.options` and fetches live data instead. The renderer receives a `dataSource` prop and uses it to populate options.

### Part 3: Inline Flow Editing

Every flow stage rendered by the engine gains an admin-only **Edit** button that opens an inline editor overlay. From this overlay, admins can:

- Add or remove components in the current stage (same dropdown UI as FlowDesigner)
- Toggle required on each component
- Insert a new stage before or after the current one
- Reorder components within the stage
- Save changes — the flow definition updates in Mujarrad immediately

This is gated by the authorization engine — only users with the `engine_superadmin` or `flow_editor` role see the edit button.

### Part 4: Portal Restructuring via Dynamic Components

Every hardcoded form page in the portal is migrated to render through the engine:

| Current Page | Migration |
|-------------|-----------|
| Organization create/edit form | Flow: `org-management` with entity data sources |
| Engagement create form | Flow: `engagement-creation` with org dropdown |
| Match detail actions | Flow: `match-review` with match data pre-filled |
| Signing request form | Flow: `signing-request` with file upload + org selector |
| Contact create form | Flow: `contact-creation` with org data source |
| Task create form | Flow: `task-creation` with engagement + org lookups |

Each page becomes a thin wrapper that renders a flow by slug. The flow definition (stored in Mujarrad) controls what fields appear, in what order, with what validation, and from what data source. Admins can reconfigure any form from the Control Board or inline without code changes.

### Part 5: Composable Data Loop

The architecture enables a self-reinforcing data cycle:

1. **Reference data** (countries, sectors) feeds component dropdowns
2. **User-submitted data** (organizations, contacts) becomes available as entity data sources
3. **New flows** reference both reference data and existing entity data to create richer experiences
4. **Submitted flow data** creates new entity records, which feed future flows

Example chain:
- Admin seeds country reference data
- "Create Organization" flow uses country data source for the country dropdown
- User creates an organization through the flow → stored as an `organizations` entity
- "Create Engagement" flow binds its "Organization" field to the `organizations` entity → shows the org just created
- "Due Diligence" flow references files uploaded in the engagement → composable data loop

## Impact

- **Affected specs**: New capability (`data-aware-engine`)
- **Affected types**: `ComponentDefinition` (new `dataSource` field), `StageDefinition` (no change), new `ReferenceDataset` type
- **Affected code**: Entity registry (new `reference-data` resource), component resolver (data source resolution), all renderers (data-aware options), Control Board (data source editor, reference data tab), all form pages (migrated to flows)
- **Affected UX**: Admins can bind components to live data; every form in the portal becomes configurable; inline editing of flows from any page
- **Migration**: Existing hardcoded forms replaced incrementally — each page migrated independently

## Risks

- **Performance**: Entity data sources fetch live data on every render. Mitigated by caching in the resolver with TTL-based invalidation.
- **Scope**: Full portal restructuring is large. Mitigated by migrating one page at a time — each page is independently deployable.
- **Data consistency**: Reference data changes affect all components that reference it. Mitigated by versioning — components pin to a version until explicitly updated.

## Open Questions

1. Should entity data sources support search/autocomplete for large datasets (e.g., 1000+ organizations), or is a paginated dropdown sufficient?
2. Should reference data support hierarchical structures (e.g., sectors with sub-sectors)?
3. Should inline flow editing support undo/redo?
