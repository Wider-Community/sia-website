# Data-Aware Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global data sources (reference data + live entity data) to the dynamic engine so components can bind to persistent system data and live business data at definition time, with auto-discovery of all entity registry resources.

**Architecture:** New `reference-data` Mujarrad resource stores versioned lookup datasets (countries, sectors, etc.). A `DataSourceBinding` field on `ComponentDefinition` points a component at either a reference dataset or an entity resource. The resolver injects live options at render time. The Control Board gains a Reference Data tab and a Data Source section in the component editor. Renderers consume data-source options transparently.

**Tech Stack:** React, TypeScript, Mujarrad (entity layer), existing engine types/hooks/resolver.

---

### Task 1: Register reference-data resource in entity registry

**Files:**
- Modify: `app/src/portal/lib/entity-registry.ts`

- [ ] **Step 1: Add the resource definition**

Add after the `notification-preferences` entry (line ~282):

```typescript
  "reference-data": {
    nodeType: "REGULAR",
    titleField: "datasetSlug",
    requiredFields: ["datasetSlug", "name_en", "entries"],
    relationships: [],
  },
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output, no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/lib/entity-registry.ts
git commit -m "feat: register reference-data resource in entity registry"
```

---

### Task 2: Add DataSourceBinding type to engine types

**Files:**
- Modify: `app/src/portal/engine/types.ts`

- [ ] **Step 1: Add the DataSourceBinding interface and update ComponentDefinition**

Add after the `ValidationRule` interface (~line 49):

```typescript
// ---------------------------------------------------------------------------
// Data Source Binding
// ---------------------------------------------------------------------------

export interface DataSourceBinding {
  /** 'none' = static options from defaultConfig, 'reference' = system reference dataset, 'entity' = live Mujarrad resource */
  type: 'none' | 'reference' | 'entity';

  /** For type 'reference': slug of the reference dataset (e.g. 'countries', 'sectors') */
  datasetSlug?: string;

  /** For type 'entity': resource key from ENTITY_REGISTRY (e.g. 'organizations', 'contacts') */
  resource?: string;

  /** For type 'entity': which field to display as the option label */
  displayField?: string;

  /** For type 'entity': which field to use as the option value (default: 'id') */
  valueField?: string;

  /** Optional static filters to narrow the dataset */
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}
```

Then add `dataSource?: DataSourceBinding;` to the `ComponentDefinition` interface, after the `composedOf` field:

```typescript
  dataSource?: DataSourceBinding;
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/types.ts
git commit -m "feat: add DataSourceBinding type to ComponentDefinition"
```

---

### Task 3: Update component registry serialization for dataSource

**Files:**
- Modify: `app/src/portal/engine/component-registry.ts`

- [ ] **Step 1: Update toDefinition to parse dataSource**

In the `toDefinition` method, add after the `composedOf` line:

```typescript
      dataSource: safeParse(record.dataSource, undefined) as ComponentDefinition['dataSource'],
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/component-registry.ts
git commit -m "feat: serialize/deserialize dataSource in component registry"
```

---

### Task 4: Create useReferenceData hook

**Files:**
- Create: `app/src/portal/engine/reference-data.ts`

- [ ] **Step 1: Create the reference data module**

```typescript
/**
 * Reference Data — persistent lookup datasets (countries, sectors, etc.)
 *
 * Stored as Mujarrad nodes in the 'reference-data' resource.
 * Each dataset has a unique slug and an array of entries.
 */

import type { EntityControlLayer } from '../lib/entity-control-layer';

export interface ReferenceEntry {
  value: string;
  label_en: string;
  label_ar?: string;
  /** Optional grouping/parent for hierarchical data */
  group?: string;
  /** Optional sort order */
  order?: number;
}

export interface ReferenceDataset {
  id: string;
  datasetSlug: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  entries: ReferenceEntry[];
  version: number;
}

// In-memory cache with TTL
const datasetCache = new Map<string, { data: ReferenceDataset; fetchedAt: number }>();
const CACHE_TTL = 60_000; // 1 minute

export class ReferenceDataManager {
  constructor(private entityLayer: EntityControlLayer) {}

  async getDataset(slug: string): Promise<ReferenceDataset | null> {
    // Check cache
    const cached = datasetCache.get(slug);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from Mujarrad
    const result = await this.entityLayer.listEntities('reference-data', {
      filters: [{ field: 'datasetSlug', operator: 'eq' as const, value: slug }],
    });

    if (result.data.length === 0) return null;

    const record = result.data[0];
    const dataset = this.toDataset(record);
    datasetCache.set(slug, { data: dataset, fetchedAt: Date.now() });
    return dataset;
  }

  async listDatasets(): Promise<ReferenceDataset[]> {
    const result = await this.entityLayer.listEntities('reference-data');
    return result.data.map((r) => this.toDataset(r));
  }

  async createDataset(
    dataset: Omit<ReferenceDataset, 'id' | 'version'>,
  ): Promise<ReferenceDataset> {
    const record = await this.entityLayer.createEntity('reference-data', {
      ...dataset,
      version: 1,
    });
    const created = this.toDataset(record);
    datasetCache.set(created.datasetSlug, { data: created, fetchedAt: Date.now() });
    return created;
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<ReferenceDataset, 'id'>>,
  ): Promise<ReferenceDataset> {
    const existing = await this.entityLayer.getEntity('reference-data', id);
    const nextVersion = ((existing.version as number) ?? 0) + 1;
    const record = await this.entityLayer.updateEntity('reference-data', id, {
      ...updates,
      version: nextVersion,
    });
    const updated = this.toDataset(record);
    datasetCache.set(updated.datasetSlug, { data: updated, fetchedAt: Date.now() });
    return updated;
  }

  async deleteDataset(id: string): Promise<void> {
    await this.entityLayer.deleteEntity('reference-data', id);
    // Clear from cache
    for (const [slug, cached] of datasetCache) {
      if (cached.data.id === id) {
        datasetCache.delete(slug);
        break;
      }
    }
  }

  invalidateCache(slug?: string): void {
    if (slug) {
      datasetCache.delete(slug);
    } else {
      datasetCache.clear();
    }
  }

  private toDataset(record: Record<string, unknown>): ReferenceDataset {
    let entries = record.entries;
    if (typeof entries === 'string') {
      try { entries = JSON.parse(entries); } catch { entries = []; }
    }
    return {
      id: record.id as string,
      datasetSlug: record.datasetSlug as string,
      name_en: record.name_en as string,
      name_ar: record.name_ar as string | undefined,
      description: record.description as string | undefined,
      entries: (entries ?? []) as ReferenceEntry[],
      version: (record.version as number) ?? 1,
    };
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/reference-data.ts
git commit -m "feat: add ReferenceDataManager for persistent lookup datasets"
```

---

### Task 5: Wire ReferenceDataManager into engine initialization

**Files:**
- Modify: `app/src/portal/engine/hooks-internal.ts`

- [ ] **Step 1: Add singleton and accessor**

Add after the existing singleton declarations:

```typescript
import { ReferenceDataManager } from './reference-data';
```

Add a new variable after the existing `let _suggestionEngine`:

```typescript
let _referenceDataManager: ReferenceDataManager | null = null;
```

In `initializeEngineInternal()`, add after the suggestion engine initialization:

```typescript
  _referenceDataManager = new ReferenceDataManager(entityLayer);
```

Add a new accessor function:

```typescript
export function getReferenceDataManager(): ReferenceDataManager {
  if (!_referenceDataManager) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _referenceDataManager;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/hooks-internal.ts
git commit -m "feat: wire ReferenceDataManager into engine initialization"
```

---

### Task 6: Create useReferenceData and useDataSource hooks

**Files:**
- Modify: `app/src/portal/engine/hooks.ts`

- [ ] **Step 1: Add imports at top of file**

```typescript
import { getReferenceDataManager } from './hooks-internal';
import type { ReferenceDataset } from './reference-data';
import type { DataSourceBinding } from './types';
import { ENTITY_REGISTRY } from '../lib/entity-registry';
```

- [ ] **Step 2: Add useReferenceData hook**

Add before the `useFlowEngine` section:

```typescript
// ---------------------------------------------------------------------------
// useReferenceData — fetch a reference dataset by slug
// ---------------------------------------------------------------------------

interface UseReferenceDataResult {
  dataset: ReferenceDataset | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useReferenceData(datasetSlug: string | undefined): UseReferenceDataResult {
  const [dataset, setDataset] = useState<ReferenceDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!datasetSlug) { setDataset(null); return; }
    let cancelled = false;
    setLoading(true);
    getReferenceDataManager()
      .getDataset(datasetSlug)
      .then((d) => { if (!cancelled) { setDataset(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [datasetSlug, refreshKey]);

  const refresh = useCallback(() => {
    if (datasetSlug) getReferenceDataManager().invalidateCache(datasetSlug);
    setRefreshKey((k) => k + 1);
  }, [datasetSlug]);

  return { dataset, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useReferenceDatasets — list all available datasets
// ---------------------------------------------------------------------------

export function useReferenceDatasets(): { datasets: ReferenceDataset[]; loading: boolean } {
  const [datasets, setDatasets] = useState<ReferenceDataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getReferenceDataManager()
      .listDatasets()
      .then((d) => { if (!cancelled) setDatasets(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { datasets, loading };
}

// ---------------------------------------------------------------------------
// useEntityResources — list all available entity registry keys
// ---------------------------------------------------------------------------

export function useEntityResources(): { resources: Array<{ key: string; titleField: string }> } {
  return useMemo(() => ({
    resources: Object.entries(ENTITY_REGISTRY).map(([key, def]) => ({
      key,
      titleField: def.titleField,
    })),
  }), []);
}

// ---------------------------------------------------------------------------
// useDataSource — resolve options from a DataSourceBinding
// ---------------------------------------------------------------------------

interface DataSourceOption {
  value: string;
  label: string;
}

interface UseDataSourceResult {
  options: DataSourceOption[];
  loading: boolean;
}

export function useDataSource(binding?: DataSourceBinding): UseDataSourceResult {
  const [options, setOptions] = useState<DataSourceOption[]>([]);
  const [loading, setLoading] = useState(false);

  const bindingKey = binding ? `${binding.type}:${binding.datasetSlug ?? ''}:${binding.resource ?? ''}:${binding.displayField ?? ''}` : '';

  useEffect(() => {
    if (!binding || binding.type === 'none') {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (binding.type === 'reference' && binding.datasetSlug) {
      getReferenceDataManager()
        .getDataset(binding.datasetSlug)
        .then((dataset) => {
          if (!cancelled && dataset) {
            setOptions(dataset.entries.map((e) => ({ value: e.value, label: e.label_en })));
          }
          if (!cancelled) setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    } else if (binding.type === 'entity' && binding.resource) {
      const entityLayer = getEntityLayer();
      const filters = binding.filters?.map((f) => ({
        field: f.field,
        operator: f.operator as 'eq',
        value: f.value as string,
      }));
      entityLayer
        .listEntities(binding.resource, { filters })
        .then((result) => {
          if (!cancelled) {
            const displayField = binding.displayField ?? ENTITY_REGISTRY[binding.resource!]?.titleField ?? 'id';
            const valueField = binding.valueField ?? 'id';
            setOptions(
              result.data.map((record) => ({
                value: String((record as Record<string, unknown>)[valueField] ?? record.id),
                label: String((record as Record<string, unknown>)[displayField] ?? record.id),
              })),
            );
            setLoading(false);
          }
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [bindingKey]);

  return { options, loading };
}
```

- [ ] **Step 3: Add getEntityLayer import**

Ensure `getEntityLayer` is imported from `./hooks-internal` (add to existing import if not present).

- [ ] **Step 4: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 5: Commit**

```bash
git add app/src/portal/engine/hooks.ts
git commit -m "feat: add useReferenceData, useEntityResources, useDataSource hooks"
```

---

### Task 7: Update component resolver to inject data source options

**Files:**
- Modify: `app/src/portal/engine/component-resolver.ts`

- [ ] **Step 1: Add data source resolution to resolve()**

Import at top:

```typescript
import { getReferenceDataManager } from './hooks-internal';
import { ENTITY_REGISTRY } from '../lib/entity-control-layer';
```

Wait — the entity registry is in `../lib/entity-registry`. Fix import:

```typescript
import { ENTITY_REGISTRY } from '../lib/entity-registry';
```

In the `resolve()` method, after `const finalConfig = { ...schemaConfig, ...config };` (line ~64), add data source resolution:

```typescript
    // 3. If component has a data source binding, resolve options into config
    if (definition.dataSource && definition.dataSource.type !== 'none') {
      try {
        const dsOptions = await this.resolveDataSourceOptions(definition.dataSource);
        if (dsOptions.length > 0) {
          finalConfig.options = dsOptions;
        }
      } catch (err) {
        console.warn(`[Resolver] Failed to resolve data source for ${definition.slug}:`, err);
      }
    }
```

- [ ] **Step 2: Add resolveDataSourceOptions private method**

Add before the closing `}` of the class:

```typescript
  private async resolveDataSourceOptions(
    binding: import('./types').DataSourceBinding,
  ): Promise<Array<{ value: string; label: string }>> {
    if (binding.type === 'reference' && binding.datasetSlug) {
      const manager = getReferenceDataManager();
      const dataset = await manager.getDataset(binding.datasetSlug);
      if (!dataset) return [];
      return dataset.entries.map((e) => ({ value: e.value, label: e.label_en }));
    }

    if (binding.type === 'entity' && binding.resource) {
      const { getEntityLayer } = await import('./hooks-internal');
      const entityLayer = getEntityLayer();
      const filters = binding.filters?.map((f) => ({
        field: f.field,
        operator: f.operator as 'eq',
        value: f.value as string,
      }));
      const result = await entityLayer.listEntities(binding.resource, { filters });
      const displayField = binding.displayField ?? ENTITY_REGISTRY[binding.resource]?.titleField ?? 'id';
      const valueField = binding.valueField ?? 'id';
      return result.data.map((record) => ({
        value: String((record as Record<string, unknown>)[valueField] ?? (record as Record<string, unknown>).id),
        label: String((record as Record<string, unknown>)[displayField] ?? (record as Record<string, unknown>).id),
      }));
    }

    return [];
  }
```

- [ ] **Step 3: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 4: Commit**

```bash
git add app/src/portal/engine/component-resolver.ts
git commit -m "feat: resolver injects data source options into component config"
```

---

### Task 8: Add Data Source section to component editor in Control Board

**Files:**
- Modify: `app/src/portal/pages/control-board/ControlBoardPage.tsx`

- [ ] **Step 1: Update FormState and imports**

Add to imports:

```typescript
import { useReferenceDatasets, useEntityResources } from "../../engine/hooks";
import type { DataSourceBinding } from "../../engine/types";
```

Add to `FormState` interface:

```typescript
  dataSourceType: 'none' | 'reference' | 'entity';
  dataSourceDatasetSlug: string;
  dataSourceResource: string;
  dataSourceDisplayField: string;
  dataSourceValueField: string;
```

Update `emptyForm` to include:

```typescript
  dataSourceType: "none",
  dataSourceDatasetSlug: "",
  dataSourceResource: "",
  dataSourceDisplayField: "",
  dataSourceValueField: "id",
```

Update `formFromDefinition` to read existing dataSource:

```typescript
    dataSourceType: def.dataSource?.type ?? "none",
    dataSourceDatasetSlug: def.dataSource?.datasetSlug ?? "",
    dataSourceResource: def.dataSource?.resource ?? "",
    dataSourceDisplayField: def.dataSource?.displayField ?? "",
    dataSourceValueField: def.dataSource?.valueField ?? "id",
```

- [ ] **Step 2: Add data source hooks to ControlBoardPage component**

Inside `ControlBoardPage()`, after the existing hooks:

```typescript
  const { datasets: refDatasets } = useReferenceDatasets();
  const { resources: entityResources } = useEntityResources();
```

- [ ] **Step 3: Add Data Source section to the dialog form**

After the Validations textarea section (~line 567) and before the English i18n section, add:

```typescript
            {/* Data Source */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Data Source</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select
                    value={form.dataSourceType}
                    onValueChange={(v) => updateField("dataSourceType", v as FormState["dataSourceType"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (static options)</SelectItem>
                      <SelectItem value="reference">System Reference Data</SelectItem>
                      <SelectItem value="entity">Entity Data (live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.dataSourceType === "reference" && (
                  <div className="space-y-2">
                    <Label>Dataset</Label>
                    <Select
                      value={form.dataSourceDatasetSlug}
                      onValueChange={(v) => updateField("dataSourceDatasetSlug", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select dataset..." /></SelectTrigger>
                      <SelectContent>
                        {refDatasets.map((ds) => (
                          <SelectItem key={ds.datasetSlug} value={ds.datasetSlug}>
                            {ds.name_en}
                          </SelectItem>
                        ))}
                        {refDatasets.length === 0 && (
                          <SelectItem value="__none" disabled>No datasets yet</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.dataSourceType === "entity" && (
                  <>
                    <div className="space-y-2">
                      <Label>Resource</Label>
                      <Select
                        value={form.dataSourceResource}
                        onValueChange={(v) => updateField("dataSourceResource", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select resource..." /></SelectTrigger>
                        <SelectContent>
                          {entityResources.map((r) => (
                            <SelectItem key={r.key} value={r.key}>
                              {r.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Field</Label>
                      <Input
                        value={form.dataSourceDisplayField}
                        onChange={(e) => updateField("dataSourceDisplayField", e.target.value)}
                        placeholder={entityResources.find((r) => r.key === form.dataSourceResource)?.titleField ?? "name"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
```

- [ ] **Step 4: Update handleSave to include dataSource in payload**

In `handleSave`, update the payload construction to include:

```typescript
    const dataSource: DataSourceBinding | undefined =
      form.dataSourceType === "none"
        ? undefined
        : form.dataSourceType === "reference"
          ? { type: "reference", datasetSlug: form.dataSourceDatasetSlug }
          : {
              type: "entity",
              resource: form.dataSourceResource,
              displayField: form.dataSourceDisplayField || undefined,
              valueField: form.dataSourceValueField || "id",
            };

    const payload = {
      slug: form.slug.trim(),
      category: form.category,
      renderer: form.renderer.trim(),
      status: form.status,
      dataSchema,
      defaultConfig,
      validations,
      dataSource,
      i18n: {
        en: { label: form.enLabel, placeholder: form.enPlaceholder || undefined },
        ar: { label: form.arLabel, placeholder: form.arPlaceholder || undefined },
      },
    };
```

- [ ] **Step 5: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 6: Commit**

```bash
git add app/src/portal/pages/control-board/ControlBoardPage.tsx
git commit -m "feat: add Data Source section to component definition editor"
```

---

### Task 9: Build Reference Data tab in Control Board

**Files:**
- Create: `app/src/portal/pages/control-board/ReferenceDataTab.tsx`
- Modify: `app/src/portal/pages/control-board/ControlBoardPage.tsx`

- [ ] **Step 1: Create ReferenceDataTab component**

Create `app/src/portal/pages/control-board/ReferenceDataTab.tsx` with full CRUD for reference datasets:
- List all datasets in a table (slug, name, entry count, version)
- Create dialog with: datasetSlug, name_en, name_ar, description
- Entry editor: table of entries with value, label_en, label_ar, order; add/remove rows
- Edit existing datasets
- Delete with confirmation

Use `getReferenceDataManager()` from hooks-internal for all operations.

- [ ] **Step 2: Add tab to ControlBoardPage**

Import and add a new tab:

```typescript
import { ReferenceDataTab } from "./ReferenceDataTab";
```

Add to TabsList:

```typescript
<TabsTrigger value="reference-data">Reference Data</TabsTrigger>
```

Add TabsContent:

```typescript
<TabsContent value="reference-data" className="space-y-4">
  <ReferenceDataTab />
</TabsContent>
```

- [ ] **Step 3: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 4: Commit**

```bash
git add app/src/portal/pages/control-board/ReferenceDataTab.tsx app/src/portal/pages/control-board/ControlBoardPage.tsx
git commit -m "feat: add Reference Data tab to Control Board for managing lookup datasets"
```

---

### Task 10: Seed default reference datasets

**Files:**
- Modify: `app/src/portal/engine/seed.ts`

- [ ] **Step 1: Add reference data seeding**

Import at top:

```typescript
import { getReferenceDataManager } from './hooks-internal';
import type { ReferenceEntry } from './reference-data';
```

Add a new function after `clearEngine`:

```typescript
const DEFAULT_DATASETS: Array<{
  datasetSlug: string;
  name_en: string;
  name_ar: string;
  entries: ReferenceEntry[];
}> = [
  {
    datasetSlug: 'countries',
    name_en: 'Countries',
    name_ar: 'الدول',
    entries: [
      { value: 'SA', label_en: 'Saudi Arabia', label_ar: 'المملكة العربية السعودية', order: 1 },
      { value: 'MY', label_en: 'Malaysia', label_ar: 'ماليزيا', order: 2 },
      { value: 'AE', label_en: 'United Arab Emirates', label_ar: 'الإمارات العربية المتحدة', order: 3 },
      { value: 'BH', label_en: 'Bahrain', label_ar: 'البحرين', order: 4 },
      { value: 'KW', label_en: 'Kuwait', label_ar: 'الكويت', order: 5 },
      { value: 'OM', label_en: 'Oman', label_ar: 'عُمان', order: 6 },
      { value: 'QA', label_en: 'Qatar', label_ar: 'قطر', order: 7 },
      { value: 'SG', label_en: 'Singapore', label_ar: 'سنغافورة', order: 8 },
      { value: 'ID', label_en: 'Indonesia', label_ar: 'إندونيسيا', order: 9 },
      { value: 'GB', label_en: 'United Kingdom', label_ar: 'المملكة المتحدة', order: 10 },
      { value: 'US', label_en: 'United States', label_ar: 'الولايات المتحدة', order: 11 },
    ],
  },
  {
    datasetSlug: 'currencies',
    name_en: 'Currencies',
    name_ar: 'العملات',
    entries: [
      { value: 'SAR', label_en: 'Saudi Riyal (SAR)', label_ar: 'ريال سعودي', order: 1 },
      { value: 'MYR', label_en: 'Malaysian Ringgit (MYR)', label_ar: 'رينغيت ماليزي', order: 2 },
      { value: 'AED', label_en: 'UAE Dirham (AED)', label_ar: 'درهم إماراتي', order: 3 },
      { value: 'USD', label_en: 'US Dollar (USD)', label_ar: 'دولار أمريكي', order: 4 },
      { value: 'GBP', label_en: 'British Pound (GBP)', label_ar: 'جنيه إسترليني', order: 5 },
      { value: 'SGD', label_en: 'Singapore Dollar (SGD)', label_ar: 'دولار سنغافوري', order: 6 },
    ],
  },
  {
    datasetSlug: 'sectors',
    name_en: 'Sectors',
    name_ar: 'القطاعات',
    entries: [
      { value: 'energy', label_en: 'Energy', label_ar: 'الطاقة', order: 1 },
      { value: 'technology', label_en: 'Technology', label_ar: 'التكنولوجيا', order: 2 },
      { value: 'finance', label_en: 'Finance', label_ar: 'التمويل', order: 3 },
      { value: 'healthcare', label_en: 'Healthcare', label_ar: 'الرعاية الصحية', order: 4 },
      { value: 'infrastructure', label_en: 'Infrastructure', label_ar: 'البنية التحتية', order: 5 },
      { value: 'manufacturing', label_en: 'Manufacturing', label_ar: 'التصنيع', order: 6 },
      { value: 'real-estate', label_en: 'Real Estate', label_ar: 'العقارات', order: 7 },
      { value: 'tourism', label_en: 'Tourism & Hospitality', label_ar: 'السياحة والضيافة', order: 8 },
      { value: 'education', label_en: 'Education', label_ar: 'التعليم', order: 9 },
      { value: 'agriculture', label_en: 'Agriculture', label_ar: 'الزراعة', order: 10 },
    ],
  },
  {
    datasetSlug: 'organization-types',
    name_en: 'Organization Types',
    name_ar: 'أنواع المنظمات',
    entries: [
      { value: 'investor', label_en: 'Investor', label_ar: 'مستثمر', order: 1 },
      { value: 'company', label_en: 'Company', label_ar: 'شركة', order: 2 },
      { value: 'government', label_en: 'Government Entity', label_ar: 'جهة حكومية', order: 3 },
      { value: 'ngo', label_en: 'NGO', label_ar: 'منظمة غير ربحية', order: 4 },
      { value: 'fund', label_en: 'Investment Fund', label_ar: 'صندوق استثماري', order: 5 },
      { value: 'accelerator', label_en: 'Accelerator / Incubator', label_ar: 'مسرّعة أعمال', order: 6 },
    ],
  },
  {
    datasetSlug: 'deal-stages',
    name_en: 'Deal Stages',
    name_ar: 'مراحل الصفقة',
    entries: [
      { value: 'prospect', label_en: 'Prospect', label_ar: 'احتمال', order: 1 },
      { value: 'introduction', label_en: 'Introduction', label_ar: 'تعارف', order: 2 },
      { value: 'due-diligence', label_en: 'Due Diligence', label_ar: 'العناية الواجبة', order: 3 },
      { value: 'negotiation', label_en: 'Negotiation', label_ar: 'تفاوض', order: 4 },
      { value: 'signing', label_en: 'Signing', label_ar: 'توقيع', order: 5 },
      { value: 'closed', label_en: 'Closed', label_ar: 'مغلق', order: 6 },
    ],
  },
];
```

Then in `seedEngine()`, add after the template instantiation section and before the seed marker creation:

```typescript
  // ── 3B. Seed reference datasets ──────────────────────────────────────────
  const refManager = getReferenceDataManager();
  for (const ds of DEFAULT_DATASETS) {
    try {
      const existing = await refManager.getDataset(ds.datasetSlug);
      if (!existing) {
        await refManager.createDataset(ds);
        result.created++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Reference ${ds.datasetSlug}: ${msg}`);
    }
  }
```

Also update `clearEngine` to include reference-data:

```typescript
  const resources = [
    'flow-sessions',
    'component-instances',
    'notification-definitions',
    'flow-definitions',
    'component-definitions',
    'reference-data',
  ];
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/seed.ts
git commit -m "feat: seed default reference datasets (countries, currencies, sectors, org types, deal stages)"
```

---

### Task 11: Export new modules from engine index

**Files:**
- Modify: `app/src/portal/engine/index.ts`

- [ ] **Step 1: Add exports**

```typescript
export { ReferenceDataManager } from './reference-data';
export type { ReferenceDataset, ReferenceEntry } from './reference-data';
export { useReferenceData, useReferenceDatasets, useEntityResources, useDataSource } from './hooks';
```

- [ ] **Step 2: Verify no type errors**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 3: Commit**

```bash
git add app/src/portal/engine/index.ts
git commit -m "feat: export reference data and data source modules from engine"
```

---

### Task 12: Final integration test

- [ ] **Step 1: Verify full build passes**

Run: `cd app && npx tsc --noEmit`
Expected: clean output

- [ ] **Step 2: Push all changes**

```bash
git push
```
