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
  /** True if a human edited this entry — refresher leaves it alone */
  isUserEdited?: boolean;
  /**
   * Optional per-entry extras (e.g. dialCode, currencySymbol, fxRate).
   * Populated by mapping.extraFields when refreshing from an API.
   */
  data?: Record<string, unknown>;
}

/**
 * Maps an API response path or template expression to a per-entry extra field.
 * Either path or template must be set.
 *
 * Path examples:
 *   - "idd.root"          -> read a single value
 *   - "idd.suffixes.0"    -> read an array element by numeric index
 *
 * Template examples:
 *   - "${idd.root}${idd.suffixes.0}"   -> compose "+966" from REST Countries
 *   - "${currency.symbol} ${name}"     -> compose "$ US Dollar"
 */
export interface ExtraFieldMapping {
  /** Dot-path into each item. Mutually exclusive with template. */
  path?: string;
  /** Template with ${path} placeholders. Mutually exclusive with path. */
  template?: string;
}

/**
 * Maps an external API response to ReferenceEntry shape.
 *
 * Supports two response shapes:
 *  - Array: arrayPath points to an array; valueField/labelEnField/etc. are
 *    dot-paths into each item.
 *  - Object map: arrayPath uses the synthetic token '$object' to iterate
 *    object entries; valueField/labelEnField use '$key' / '$value' / nested
 *    paths within the value.
 */
export interface ResponseMapping {
  /** Path to the array (or object map) in the response. '.' = root. */
  arrayPath: string;
  /** Field on each item used as the stable value. Use '$key' for object maps. */
  valueField: string;
  /** Field on each item used as the EN label. Use '$value' for object maps. */
  labelEnField: string;
  /** Optional path to AR label. Untouched on enrich if absent. */
  labelArField?: string;
  /** Optional grouping field. */
  groupField?: string;
  /** Optional sort-order field. */
  orderField?: string;
  /** Normalize value casing (e.g. lowercase ISO codes → uppercase). */
  valueTransform?: 'upper' | 'lower';
  /**
   * Optional per-entry extras populated into ReferenceEntry.data.
   * Keyed by the property name on `data` (e.g. "dialCode").
   */
  extraFields?: Record<string, ExtraFieldMapping>;
}

export interface RefreshSource {
  /** Public URL the refresher hits. No auth in this iteration. */
  url: string;
  /** How often to refresh (ms). 0 = manual only (no auto-refresh). */
  intervalMs: number;
  /** How to interpret the response. */
  mapping: ResponseMapping;
  /**
   * enrich: update existing entries' EN/group/order from API; preserve curated AR;
   * never delete; append new entries from API.
   * replace: drop all non-isUserEdited entries and rebuild from API.
   */
  mergeStrategy: 'enrich' | 'replace';
  /** Per-request timeout in ms (default 10000). */
  timeoutMs?: number;
  /**
   * Optional secondary live source for Arabic labels when the primary API
   * returns English only. Fetched after the primary; failures are tolerated
   * (entries simply remain English-only and the refresh still succeeds).
   */
  arEnrichmentSource?: ArEnrichmentSource;
}

/**
 * Live source for Arabic label enrichment. Currently supports Wikidata's
 * public SPARQL endpoint, which has bilingual labels for ISO entities
 * (currencies, languages, country subdivisions, etc.).
 */
export type ArEnrichmentSource = {
  type: 'wikidata-sparql';
  /** SPARQL query — must select two bindings: a code and an Arabic label. */
  query: string;
  /** Name of the SPARQL binding holding the entry value (e.g. ISO code). */
  codeBinding: string;
  /** Name of the SPARQL binding holding the Arabic label. */
  arLabelBinding: string;
  /** Normalize fetched code casing to match primary entries. */
  valueTransform?: 'upper' | 'lower';
  /** Per-request timeout in ms (default 15000 — Wikidata can be slow). */
  timeoutMs?: number;
};

export type RefreshStatus = 'never' | 'ok' | 'error';

/** One entry in the per-dataset refresh history log. */
export interface RefreshHistoryEntry {
  /** ISO timestamp of the attempt. */
  at: string;
  status: 'ok' | 'error';
  /** Error message when status === 'error'. */
  error?: string;
  /** Number of entries after merge (null when refresh failed). */
  entryCount?: number;
}

/** Maximum number of refresh-history entries kept per dataset. */
export const REFRESH_HISTORY_LIMIT = 10;

export interface ReferenceDataset {
  id: string;
  datasetSlug: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  entries: ReferenceEntry[];
  version: number;
  /** System datasets are seeded by default and cannot be deleted */
  isSystem?: boolean;
  /** Optional external API source. Absent = curated only. */
  refreshSource?: RefreshSource;
  /** ISO timestamp of last successful refresh. */
  lastRefreshedAt?: string;
  /** Outcome of last refresh attempt. */
  lastRefreshStatus?: RefreshStatus;
  /** Error message when lastRefreshStatus === 'error'. */
  lastRefreshError?: string;
  /** Rolling log of recent refresh attempts (newest first, capped). */
  refreshHistory?: RefreshHistoryEntry[];
}

// In-memory cache with TTL
const datasetCache = new Map<string, { data: ReferenceDataset; fetchedAt: number }>();
const CACHE_TTL = 60_000; // 1 minute

export class ReferenceDataManager {
  constructor(private entityLayer: EntityControlLayer) {}

  async getDataset(slug: string): Promise<ReferenceDataset | null> {
    const cached = datasetCache.get(slug);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.data;
    }

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
    // Check if system dataset — prevent deletion
    const dataset = await this.getDatasetById(id);
    if (dataset?.isSystem) {
      throw new Error(`Cannot delete system dataset "${dataset.datasetSlug}". System datasets are protected.`);
    }
    await this.entityLayer.deleteEntity('reference-data', id);
    for (const [slug, cached] of datasetCache) {
      if (cached.data.id === id) {
        datasetCache.delete(slug);
        break;
      }
    }
  }

  private async getDatasetById(id: string): Promise<ReferenceDataset | null> {
    try {
      const record = await this.entityLayer.getEntity('reference-data', id);
      return this.toDataset(record);
    } catch { return null; }
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
    let refreshSource = record.refreshSource;
    if (typeof refreshSource === 'string') {
      try { refreshSource = JSON.parse(refreshSource); } catch { refreshSource = undefined; }
    }
    let refreshHistory = record.refreshHistory;
    if (typeof refreshHistory === 'string') {
      try { refreshHistory = JSON.parse(refreshHistory); } catch { refreshHistory = []; }
    }
    return {
      id: record.id as string,
      datasetSlug: record.datasetSlug as string,
      name_en: record.name_en as string,
      name_ar: record.name_ar as string | undefined,
      description: record.description as string | undefined,
      entries: (entries ?? []) as ReferenceEntry[],
      version: (record.version as number) ?? 1,
      isSystem: (record.isSystem as boolean) ?? false,
      refreshSource: refreshSource as RefreshSource | undefined,
      lastRefreshedAt: record.lastRefreshedAt as string | undefined,
      lastRefreshStatus: record.lastRefreshStatus as RefreshStatus | undefined,
      lastRefreshError: record.lastRefreshError as string | undefined,
      refreshHistory: (refreshHistory as RefreshHistoryEntry[] | undefined) ?? [],
    };
  }
}
