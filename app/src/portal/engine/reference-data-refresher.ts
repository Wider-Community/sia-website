/**
 * Reference Data Refresher — periodically syncs datasets from external APIs.
 *
 * Behaviour:
 *  - One scheduled job per dataset that has a refreshSource with intervalMs > 0.
 *  - Manual refresh available via refreshNow(slug).
 *  - Single-flight: a second concurrent refresh of the same slug short-circuits.
 *  - Failure leaves entries untouched and records the error on the dataset.
 *  - Merge respects entry.isUserEdited — those entries are never overwritten.
 */

import type {
  ReferenceDataset,
  ReferenceEntry,
  RefreshSource,
  ResponseMapping,
} from './reference-data';
import type { ReferenceDataManager } from './reference-data';
import { CURRENCY_ARABIC_LABELS } from './currency-arabic';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Per-dataset Arabic-label dictionaries baked into code.
 *
 * Used when an external API returns English-only labels and the Arabic
 * translations are stable, well-known data (e.g. ISO 4217 currency codes).
 *
 * This sits in code rather than in the persisted `refreshSource` so that
 * upgrades to the dictionary (new currencies, fixes to Arabic spelling)
 * apply immediately without requiring a re-seed of every installation.
 */
const STATIC_AR_DICTIONARIES: Record<string, Record<string, string>> = {
  currencies: CURRENCY_ARABIC_LABELS,
};

export class ReferenceDataRefresher {
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private inFlight = new Map<string, Promise<ReferenceDataset>>();
  private started = false;

  constructor(private manager: ReferenceDataManager) {}

  /** Manually refresh a single dataset. Single-flight by slug. */
  async refreshNow(slug: string): Promise<ReferenceDataset> {
    const existing = this.inFlight.get(slug);
    if (existing) return existing;

    const promise = this.doRefresh(slug).finally(() => {
      this.inFlight.delete(slug);
    });
    this.inFlight.set(slug, promise);
    return promise;
  }

  /** Start the auto-refresh loop. Idempotent. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.scheduleAll();
  }

  /** Stop all timers. */
  stop(): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
    this.started = false;
  }

  /** Re-scan datasets and add timers for any new ones with refreshSource. */
  async rescheduleAll(): Promise<void> {
    if (!this.started) return;
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
    await this.scheduleAll();
  }

  private async scheduleAll(): Promise<void> {
    const datasets = await this.manager.listDatasets();
    for (const ds of datasets) {
      const src = ds.refreshSource;
      if (!src || src.intervalMs <= 0) continue;
      const timer = setInterval(() => {
        this.refreshNow(ds.datasetSlug).catch(() => {
          /* errors are recorded on the dataset; nothing to log here */
        });
      }, src.intervalMs);
      this.timers.set(ds.datasetSlug, timer);
    }
  }

  private async doRefresh(slug: string): Promise<ReferenceDataset> {
    const dataset = await this.manager.getDataset(slug);
    if (!dataset) throw new Error(`Dataset "${slug}" not found`);
    if (!dataset.refreshSource) {
      throw new Error(`Dataset "${slug}" has no refreshSource configured`);
    }

    try {
      const apiEntries = await fetchAndMap(dataset.refreshSource, slug);
      const mergedEntries = merge(
        dataset.entries,
        apiEntries,
        dataset.refreshSource.mergeStrategy,
      );
      return await this.writeWithRetry(dataset.id, {
        entries: mergedEntries,
        lastRefreshedAt: new Date().toISOString(),
        lastRefreshStatus: 'ok',
        lastRefreshError: undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        await this.writeWithRetry(dataset.id, {
          lastRefreshedAt: dataset.lastRefreshedAt,
          lastRefreshStatus: 'error',
          lastRefreshError: msg,
        });
      } catch {
        /* swallow — we already lost the original error if we can't write */
      }
      throw new Error(`Refresh "${slug}" failed: ${msg}`);
    }
  }

  /**
   * Retry once on Mujarrad's `node_versions_node_id_version_number_key`
   * unique-constraint race. Re-reads the latest version and retries the
   * write so the next-version computation is fresh.
   */
  private async writeWithRetry(
    id: string,
    updates: Parameters<ReferenceDataManager['updateDataset']>[1],
    attempt = 0,
  ): Promise<ReferenceDataset> {
    try {
      return await this.manager.updateDataset(id, updates);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isVersionRace =
        msg.includes('node_versions_node_id_version_number_key') ||
        msg.includes('duplicate key value violates unique constraint');
      if (isVersionRace && attempt < 2) {
        // Brief jittered delay so a concurrent writer can finish.
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
        // Drop cache so re-read gets the latest version number.
        this.manager.invalidateCache();
        return this.writeWithRetry(id, updates, attempt + 1);
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch + map
// ---------------------------------------------------------------------------

async function fetchAndMap(
  src: RefreshSource,
  datasetSlug: string,
): Promise<ReferenceEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    src.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await fetch(src.url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${src.url}`);
  }
  const body = await response.json();
  const entries = mapResponse(body, src.mapping);
  // Apply Arabic-label enrichment from two sources:
  //   1. RefreshSource.staticArLabels — admin-defined inline dictionary
  //   2. STATIC_AR_DICTIONARIES[slug]  — dictionary baked into code by slug
  // Both are applied; the inline source wins on conflict.
  const codeMap = STATIC_AR_DICTIONARIES[datasetSlug];
  if (codeMap || src.staticArLabels) {
    for (const e of entries) {
      if (e.label_ar) continue;
      const fromInline = src.staticArLabels?.[e.value];
      const fromCode = codeMap?.[e.value];
      const ar = fromInline ?? fromCode;
      if (ar) e.label_ar = ar;
    }
  }
  return entries;
}

function mapResponse(body: unknown, mapping: ResponseMapping): ReferenceEntry[] {
  const target = resolvePath(body, mapping.arrayPath);

  // Object-map shape: iterate { key: value } pairs.
  if (mapping.arrayPath.endsWith('$object') || isObjectMap(target, mapping)) {
    if (target == null || typeof target !== 'object') {
      throw new Error(`mapping arrayPath "${mapping.arrayPath}" did not resolve to an object`);
    }
    const entries: ReferenceEntry[] = [];
    for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
      const item = { $key: key, $value: value };
      const projected = projectItem(item, mapping, value);
      if (projected) entries.push(projected);
    }
    return entries;
  }

  // Array shape.
  if (!Array.isArray(target)) {
    throw new Error(`mapping arrayPath "${mapping.arrayPath}" did not resolve to an array`);
  }
  const entries: ReferenceEntry[] = [];
  for (const item of target) {
    const projected = projectItem(item, mapping, item);
    if (projected) entries.push(projected);
  }
  return entries;
}

function isObjectMap(target: unknown, mapping: ResponseMapping): boolean {
  return (
    mapping.valueField === '$key' &&
    target != null &&
    typeof target === 'object' &&
    !Array.isArray(target)
  );
}

function projectItem(
  item: unknown,
  mapping: ResponseMapping,
  fallbackForValue: unknown,
): ReferenceEntry | null {
  const rawValue = readField(item, mapping.valueField);
  const labelEn = readField(item, mapping.labelEnField);
  if (rawValue == null || labelEn == null) return null;
  void fallbackForValue;
  let valueStr = String(rawValue);
  if (mapping.valueTransform === 'upper') valueStr = valueStr.toUpperCase();
  else if (mapping.valueTransform === 'lower') valueStr = valueStr.toLowerCase();
  const entry: ReferenceEntry = {
    value: valueStr,
    label_en: String(labelEn),
  };
  if (mapping.labelArField) {
    const ar = readField(item, mapping.labelArField);
    if (ar != null) entry.label_ar = String(ar);
  }
  if (mapping.groupField) {
    const g = readField(item, mapping.groupField);
    if (g != null) entry.group = String(g);
  }
  if (mapping.orderField) {
    const o = readField(item, mapping.orderField);
    if (typeof o === 'number') entry.order = o;
    else if (o != null && !Number.isNaN(Number(o))) entry.order = Number(o);
  }
  return entry;
}

function readField(item: unknown, path: string): unknown {
  if (path === '$key') return (item as { $key?: unknown })?.$key;
  if (path === '$value') return (item as { $value?: unknown })?.$value;
  return resolvePath(item, path);
}

function resolvePath(root: unknown, path: string): unknown {
  if (path === '.' || path === '' || path === '$object') return root;
  const segments = path.split('.').filter(Boolean);
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

function merge(
  existing: ReferenceEntry[],
  fromApi: ReferenceEntry[],
  strategy: 'enrich' | 'replace',
): ReferenceEntry[] {
  const byValue = new Map<string, ReferenceEntry>();
  for (const e of existing) byValue.set(e.value, e);

  if (strategy === 'replace') {
    const result: ReferenceEntry[] = [];
    // Keep user-edited entries even on replace.
    for (const e of existing) if (e.isUserEdited) result.push(e);
    const keptValues = new Set(result.map((e) => e.value));
    for (const apiEntry of fromApi) {
      if (keptValues.has(apiEntry.value)) continue;
      result.push(apiEntry);
    }
    return result;
  }

  // enrich: update existing non-edited entries; append new entries.
  const result: ReferenceEntry[] = [];
  const seenApiValues = new Set<string>();
  for (const apiEntry of fromApi) {
    seenApiValues.add(apiEntry.value);
    const existingEntry = byValue.get(apiEntry.value);
    if (!existingEntry) {
      result.push(apiEntry);
      continue;
    }
    if (existingEntry.isUserEdited) {
      result.push(existingEntry);
      continue;
    }
    // Update EN, group, order from API. Preserve curated AR if present.
    const merged: ReferenceEntry = {
      ...existingEntry,
      label_en: apiEntry.label_en,
      group: apiEntry.group ?? existingEntry.group,
      order: apiEntry.order ?? existingEntry.order,
    };
    if (apiEntry.label_ar && !existingEntry.label_ar) {
      merged.label_ar = apiEntry.label_ar;
    }
    result.push(merged);
  }
  // Preserve existing entries not in the API response (curated additions).
  for (const e of existing) {
    if (!seenApiValues.has(e.value)) result.push(e);
  }
  return result;
}
