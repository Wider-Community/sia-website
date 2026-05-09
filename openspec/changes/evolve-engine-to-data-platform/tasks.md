# Tasks: Evolve Dynamic Engine into a Data-Aware Platform Layer

## Phase 1: Reference Data Foundation
- [ ] Register `reference-data` resource in entity registry
- [ ] Create `ReferenceDataset` type with `datasetSlug`, `entries[]`, `version`
- [ ] Build Reference Data tab in Control Board (CRUD for datasets + entries)
- [ ] Seed default reference datasets: countries (ISO 3166), currencies (ISO 4217), sectors, deal stages, organization types
- [ ] Create `useReferenceData(datasetSlug)` hook that fetches and caches dataset entries

## Phase 2: Data Source Binding
- [ ] Add `DataSourceBinding` type to engine types
- [ ] Add `dataSource?: DataSourceBinding` field to `ComponentDefinition`
- [ ] Update `toDefinition` / `serializeForMujarrad` to handle `dataSource` field
- [ ] Add Data Source section to component editor in Control Board:
  - [ ] Source Type selector: None / System Reference / Entity Data
  - [ ] Reference mode: dropdown of available datasets (from `reference-data`)
  - [ ] Entity mode: dropdown of all `ENTITY_REGISTRY` keys + display field + value field selectors + optional filters
- [ ] Create `useDataSource(binding)` hook that resolves options from reference data or entity data
- [ ] Update component resolver to inject data source options into component config at resolution time

## Phase 3: Data-Aware Renderers
- [ ] Update `SelectRenderer` to consume data source options when `config.dataSource` is present
- [ ] Update `MultiSelectRenderer` similarly
- [ ] Create `EntitySearchRenderer` — autocomplete/search for large entity datasets
- [ ] Update `FileUploadRenderer` to support entity-bound file references
- [ ] Ensure all renderers fall back to `config.options` when no data source is bound

## Phase 4: Inline Flow Editing
- [ ] Create `InlineFlowEditor` component — overlay that appears over a running stage
- [ ] Add admin-only "Edit" button to `StageForm` in `FlowRunnerPage` (gated by auth role)
- [ ] Support: add/remove/reorder components in current stage
- [ ] Support: toggle required per component
- [ ] Support: insert stage before/after current stage
- [ ] Save changes directly to flow definition in Mujarrad
- [ ] Auto-refresh the running flow after save

## Phase 5: Portal Page Migration
- [ ] Create engine-backed flow for: Organization create/edit
- [ ] Create engine-backed flow for: Contact create
- [ ] Create engine-backed flow for: Engagement create
- [ ] Create engine-backed flow for: Task create
- [ ] Create engine-backed flow for: Signing request
- [ ] Create engine-backed flow for: Match review actions
- [ ] Replace each hardcoded form page with a thin wrapper rendering the flow by slug
- [ ] Verify all existing functionality preserved after migration

## Phase 6: Composable Data Loop
- [ ] Wire flow completion handlers to create/update entities in Mujarrad (e.g., completed "Create Org" flow → creates `organizations` record)
- [ ] Support pre-filling flow stages from existing entity data (e.g., editing an org pre-fills from its current record)
- [ ] Support cross-flow data references (e.g., due diligence flow references files from onboarding flow)
- [ ] Add data lineage tracking — which flow/session created each entity record
