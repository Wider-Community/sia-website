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
  /** System datasets are seeded by default and cannot be deleted */
  isSystem?: boolean;
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
    return {
      id: record.id as string,
      datasetSlug: record.datasetSlug as string,
      name_en: record.name_en as string,
      name_ar: record.name_ar as string | undefined,
      description: record.description as string | undefined,
      entries: (entries ?? []) as ReferenceEntry[],
      version: (record.version as number) ?? 1,
      isSystem: (record.isSystem as boolean) ?? false,
    };
  }
}
