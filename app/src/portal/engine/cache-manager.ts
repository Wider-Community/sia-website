/**
 * Dynamic Component Engine — Cache Manager
 *
 * Version-keyed L1 memory cache with LRU eviction.
 * Used to cache component definitions and instances so the resolver
 * doesn't hit Mujarrad on every render.
 */

import type {
  CacheEntry,
  CacheStats,
  ComponentDefinition,
  ComponentInstance,
} from './types';

export class CacheManager<T = ComponentDefinition> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxEntries: number;
  private ttl: number | null;
  private stats: { hits: number; misses: number; evictions: number } = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options?: { maxEntries?: number; ttl?: number }) {
    this.maxEntries = options?.maxEntries ?? 500;
    this.ttl = options?.ttl ?? null;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    // LRU: move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.data;
  }

  getIfVersion(key: string, version: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || entry.version !== version) {
      this.stats.misses++;
      return undefined;
    }
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }
    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.data;
  }

  set(key: string, data: T, version: number): void {
    // If key exists, delete first (for LRU ordering)
    this.cache.delete(key);
    this.evictIfNeeded();
    this.cache.set(key, { data, version, cachedAt: Date.now() });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateWhere(
    predicate: (key: string, entry: CacheEntry<T>) => boolean,
  ): number {
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (predicate(key, entry)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  setBulk(entries: Array<{ key: string; data: T; version: number }>): void {
    for (const { key, data, version } of entries) {
      this.set(key, data, version);
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  get size(): number {
    return this.cache.size;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (this.ttl === null) return false;
    return Date.now() - entry.cachedAt > this.ttl;
  }

  private evictIfNeeded(): void {
    while (this.cache.size >= this.maxEntries) {
      // Map iterates in insertion order — first key is LRU
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }
}

/** Pre-configured cache for component definitions (TEMPLATE nodes). */
export const definitionCache = new CacheManager<ComponentDefinition>({
  maxEntries: 500,
});

/** Pre-configured cache for component instances (REGULAR nodes). */
export const instanceCache = new CacheManager<ComponentInstance>({
  maxEntries: 1000,
});
