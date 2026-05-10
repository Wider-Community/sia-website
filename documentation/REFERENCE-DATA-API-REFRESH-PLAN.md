# Reference Data — API Refresh Plan

## Goal

Let reference datasets (countries, currencies, sectors, etc.) optionally refresh
themselves from an external API on a schedule, while keeping the existing
dataset as the source of truth that components bind to.

The dataset stays. An API becomes a *source feeding the dataset*, not a
replacement for it.

## Why this shape (not pure-live fetch)

1. **Different data velocities.** Countries change rarely. FX rates change
   daily. Sanctions lists change weekly. Per-dataset refresh schedules fit the
   domain. A uniform "always live" model wastes requests on stable data.
2. **Preserve bilingual labels.** Seeded datasets have hand-curated Arabic
   labels. `restcountries.com` returns English + native names, not always
   Arabic. Refresh must enrich, not overwrite.
3. **Offline / failure resilience.** If the API is unreachable, components keep
   working with the last-known-good entries. Live fetch per render couples
   every form to every external service.
4. **One refresh fans out.** A single background refresh updates the dataset.
   All components bound to that dataset pick up the change at once. No need
   for each component to fetch independently.

## Out of scope (intentional)

- Per-render API fetching. Components keep reading from the dataset, never the
  API directly.
- Admin-defined transformation scripts. The mapping config is declarative JSON,
  not arbitrary code.
- Server-side scheduler. The refresh runs in the browser for now (single tab,
  in-memory scheduler). Server-side is a follow-up.
- New auth/secret handling. First integration uses a public no-auth API.

## Design

### 1. Extend `ReferenceDataset`

In `app/src/portal/engine/reference-data.ts`:

```ts
export interface ReferenceDataset {
  id: string;
  datasetSlug: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  entries: ReferenceEntry[];
  version: number;
  isSystem?: boolean;

  // NEW
  refreshSource?: RefreshSource;
  lastRefreshedAt?: string;       // ISO timestamp
  lastRefreshStatus?: 'ok' | 'error' | 'never';
  lastRefreshError?: string;       // when lastRefreshStatus === 'error'
}

export interface RefreshSource {
  /** Public URL the refresher hits. No auth in this iteration. */
  url: string;

  /** How often to refresh (ms). 0 = never auto-refresh, manual only. */
  intervalMs: number;

  /** How to interpret the response. */
  mapping: ResponseMapping;

  /** What to do with new vs existing entries. */
  mergeStrategy: 'enrich' | 'replace';

  /** Optional: ms timeout per request (default 10s). */
  timeoutMs?: number;
}

export interface ResponseMapping {
  /** Path to the array in the response (dot-path, '.' for root). */
  arrayPath: string;

  /** Field on each item used as the stable value (must be unique). */
  valueField: string;

  /** Field on each item used as the EN label. */
  labelEnField: string;

  /** Optional field for Arabic label. If absent, AR is left untouched on enrich. */
  labelArField?: string;

  /** Optional field for grouping. */
  groupField?: string;

  /** Optional field for sort order. */
  orderField?: string;
}
```

### 2. Merge strategies

**`enrich` (default, recommended):**
- For each fetched entry, find the dataset entry with the matching `value`.
- If found: update `label_en`, `group`, `order` from the API. Leave `label_ar`
  alone unless the API provided one and the dataset's was empty.
- If not found: append the new entry.
- Never delete entries. Curated entries that no longer appear in the API stay.

**`replace`:**
- Drop existing entries entirely. Replace with what the API returned.
- Use only when the API is the authoritative source and curation isn't a
  concern.

### 3. The refresher

New file `app/src/portal/engine/reference-data-refresher.ts`:

```ts
export class ReferenceDataRefresher {
  constructor(private manager: ReferenceDataManager) {}

  /** Manually refresh one dataset. Returns updated dataset. */
  async refreshNow(slug: string): Promise<ReferenceDataset> { ... }

  /** Start the auto-refresh loop. Idempotent. */
  start(): void { ... }

  /** Stop the auto-refresh loop. */
  stop(): void { ... }
}
```

How `refreshNow` works:

1. Load the dataset.
2. If no `refreshSource`, throw a clear error.
3. `fetch(url, { signal: AbortController, timeout: refreshSource.timeoutMs })`.
4. Walk to `mapping.arrayPath` in the response.
5. Project each item into a `ReferenceEntry` via the mapping fields.
6. Apply `mergeStrategy` against current entries.
7. `manager.updateDataset(id, { entries, lastRefreshedAt, lastRefreshStatus: 'ok' })`.
8. On any error: write `lastRefreshStatus: 'error'`, `lastRefreshError: msg`,
   keep the old `entries` untouched. Return the unchanged dataset.

How `start()` works:

- For each dataset with `refreshSource.intervalMs > 0`, schedule a `setInterval`
  that calls `refreshNow(slug)`. Track timer IDs so `stop()` can cancel them.
- On dataset list refresh (e.g. admin adds a new dataset), re-scan and schedule
  any new ones.
- Single-tab scope. Multiple tabs each schedule independently — acceptable
  because writes are idempotent and the manager's cache invalidates on update.

### 4. Wire into engine init

`app/src/portal/engine/hooks-internal.ts` already initializes
`ReferenceDataManager`. Add the refresher next to it:

```ts
let _refresher: ReferenceDataRefresher | null = null;

export function initializeEngineInternal(entityLayer) {
  ...
  _referenceDataManager = new ReferenceDataManager(entityLayer);
  _refresher = new ReferenceDataRefresher(_referenceDataManager);
  _refresher.start();
}

export function getReferenceDataRefresher() { ... }
```

Public hook in `hooks.ts`:

```ts
export function getReferenceDataRefresher(): ReferenceDataRefresher { ... }
```

### 5. Reference Data tab — UI additions

`app/src/portal/pages/control-board/ReferenceDataTab.tsx`:

- New section in the dataset editor: **Refresh Source** (collapsed by default).
  Fields: URL, interval, array path, value field, EN label field, AR label
  field, merge strategy.
- Show **last refreshed at**, **status badge** (ok / error / never), and a
  **Refresh now** button next to each dataset row.
- When status is `error`, show the error message in a tooltip.

### 6. Per-dataset source decisions

Honest assessment: only a few of the 19 seeded datasets have meaningful public
APIs. The rest are SIA domain taxonomies — they don't exist as standardized
external lists and should stay curated. Below is the decision per dataset.

#### Datasets that get a `refreshSource`

##### 6.1 `countries`

- **API:** [REST Countries](https://restcountries.com) — free, no auth, CORS.
- **Endpoint:** `https://restcountries.com/v3.1/all?fields=cca2,name,translations,region`
- **Why:** Stable, comprehensive, includes Arabic translations.
- **Refresh:** Weekly (countries change ~once a decade; weekly is conservative
  and effectively free).
- **Strategy:** `enrich` — preserves your hand-curated Arabic on existing
  entries.

```ts
refreshSource: {
  url: 'https://restcountries.com/v3.1/all?fields=cca2,name,translations,region',
  intervalMs: 7 * 24 * 60 * 60 * 1000,   // weekly
  mergeStrategy: 'enrich',
  mapping: {
    arrayPath: '.',                       // response is the array
    valueField: 'cca2',                   // ISO 2-letter code
    labelEnField: 'name.common',
    labelArField: 'translations.ara.common',
  },
}
```

Effect: SA/MY/AE/etc. keep their hand-curated Arabic. The API enriches by
adding any new countries (rare) and updating English names if anything
changed. New entries appear with whatever Arabic the API provides; admins
can refine manually.

##### 6.2 `currencies`

- **API:** [Frankfurter](https://www.frankfurter.app/) — free, no auth, CORS,
  ECB-backed.
- **Endpoint:** `https://api.frankfurter.app/currencies`
- **Why:** Returns a flat object of `{ ISO_CODE: "Display Name" }`. Simple,
  reliable, no rate limit.
- **Refresh:** Monthly (currency lists change rarely; ISO 4217 updates are
  infrequent).
- **Strategy:** `enrich`.

```ts
refreshSource: {
  url: 'https://api.frankfurter.app/currencies',
  intervalMs: 30 * 24 * 60 * 60 * 1000,  // monthly
  mergeStrategy: 'enrich',
  mapping: {
    // Frankfurter returns { "USD": "United States Dollar", ... }
    // Refresher needs an objectAsArray flag for this shape.
    arrayPath: '$object',                 // see "Object-as-array" note below
    valueField: '$key',                   // the object key (e.g. "USD")
    labelEnField: '$value',               // the object value
  },
}
```

> **Object-as-array note:** Frankfurter returns an object map, not an array.
> The mapping spec needs to handle this. We'll extend `ResponseMapping` with
> two synthetic path tokens: `$object` (treat the value at the resolved path
> as an object map; iterate entries), `$key`/`$value` (refer to entry key
> and value within the iteration). This handles both array and map-shaped
> APIs without forcing every consumer to write a custom adapter.

#### Datasets that stay curated (no refreshSource)

The remaining 17 datasets have no public, authoritative external source and
should remain admin-curated.

| Dataset | Why no API |
|---------|-----------|
| `sectors` | Industry classification standards (GICS, NAICS, ISIC) are paid, US/EU-specific, or have no clean public API. SIA's 12 sectors are corridor-tuned and intentionally curated. |
| `organization-types` | Business taxonomy specific to SIA's deal model (investor / company / govt / NGO / fund / accelerator etc.). No external standard. |
| `organization-statuses` | Internal lifecycle (active / prospect / inactive). |
| `deal-stages` | SIA's pipeline model (prospect → introduction → engaged → DD → negotiation → signing → active partner → closed). Internal. |
| `partnership-types` | Business model taxonomy (joint venture, direct investment, licensing, acquisition, strategic alliance). Internal. |
| `timeline-options` | UI shorthand (3m / 6m / 12m / 24m+). Internal. |
| `engagement-stages` | Engagement lifecycle. Internal. |
| `engagement-categories` | Engagement type taxonomy. Internal. |
| `match-statuses` | Match workflow states. Internal. |
| `match-categories` | Match type taxonomy. Internal. |
| `task-statuses` | Task lifecycle. Internal. |
| `priority-levels` | UI priority labels. Internal. |
| `kyc-statuses` | KYC workflow states. Internal. (External KYC providers return statuses, but those are vendor-specific — translated to these statuses, not sourced from them.) |
| `sanctions-check-statuses` | Internal status of the check. (The actual sanctions *list* — OFAC SDN, EU consolidated, UK HMT — is a separate concern, see "Future" below.) |
| `approval-decisions` | Internal decision taxonomy. |
| `renderer-types` | Engine-internal: which React renderers are wired in. Must match code. Auto-refresh would be wrong. |
| `notification-trigger-types` | Engine-internal: which event names the engine emits. Must match code. |

For these, the existing seed values remain the source of truth, editable via
the Reference Data tab. The new `refreshSource` field is optional — leaving
it unset means the dataset behaves exactly as today.

#### Future external integrations (not in this iteration)

These are *new* datasets worth adding, each backed by a dedicated public API.
Out of scope for this PR but the architecture supports them:

| New dataset | API | Why |
|-------------|-----|-----|
| `fx-rates` | `https://api.frankfurter.app/latest?from=USD` | Daily FX rates for deal-size normalization. |
| `sanctions-list` | OFAC SDN JSON feed, EU consolidated, UK HMT | The actual blocked-party list, refreshed daily, used in the sanctions-check workflow. |
| `naics-codes` (paid) or `isic-rev4` (UN) | Official taxonomy feeds | If/when SIA needs formal industry classification beyond the 12 curated sectors. |
| `gcc-trade-stats` | World Bank Open Data API | For deal-context badges (corridor volume, growth). |

### 7. Type & contract changes summary

| File | Change |
|------|--------|
| `engine/reference-data.ts` | Add `RefreshSource`, `ResponseMapping`, new optional fields on `ReferenceDataset` |
| `engine/reference-data-refresher.ts` | NEW — class with `refreshNow`, `start`, `stop` |
| `engine/hooks-internal.ts` | Construct refresher, wire to init/teardown |
| `engine/hooks.ts` | Export `getReferenceDataRefresher` |
| `engine/seed.ts` | Add `refreshSource` to `countries` and `currencies` datasets |
| `pages/control-board/ReferenceDataTab.tsx` | UI for refresh-source config + status + manual refresh button |
| `engine/index.ts` | Re-export new public types |

No changes to: component definitions, resolvers, flows, hooks consumers. The
binding `{ type: 'reference', datasetSlug: 'countries' }` keeps working.

## Failure handling

- Network error or non-2xx response → `lastRefreshStatus: 'error'`, entries
  unchanged, error stored on the dataset, refresh loop keeps trying on
  schedule.
- Mapping path not found → same as above with a clear error message
  ("`mapping.arrayPath '.data'` not found in response").
- Schema mismatch (e.g. `valueField` missing on items) → skip that item, count
  warnings, surface in `lastRefreshError` if all items failed.
- Concurrent refresh of same dataset → second call short-circuits if one is in
  flight (single-flight pattern).

## Testing strategy

Manual checks (no test framework wired in this codebase):

1. **Manual refresh button** on `countries` succeeds → 250+ countries load,
   SA/MY/AE keep Arabic labels, lastRefreshedAt updates.
2. **Disconnect network** → click refresh now → status flips to `error`,
   entries unchanged.
3. **Set `intervalMs: 60_000`** on a test dataset, leave tab open → loop
   triggers once a minute, version increments, cache invalidates.
4. **`mergeStrategy: 'replace'`** on a test dataset → curated Arabic labels
   are blown away (confirms strategy works as documented).
5. **Stop/start** → calling `refresher.stop()` halts the loop; `start()`
   resumes.

## Rollout

Single PR. No flag — feature is opt-in per dataset (only datasets with
`refreshSource` participate). Existing seeded datasets without it behave
exactly as today.

## Future (not this iteration)

- Server-side scheduler (Mujarrad) so refresh runs even with no tabs open.
- Auth headers for private APIs (API key, OAuth bearer).
- Webhook-driven refresh (push instead of poll) for fast-changing data.
- Diff/audit log of what changed in each refresh.
- Per-entry source tracking (which API and which refresh added this entry).
