/**
 * Dynamic Component Engine — Seed
 *
 * Populates the registry with component definitions migrated from existing
 * Zod schemas and instantiates the built-in experience templates.
 * Idempotent: checks for a 'seed-marker' definition before running.
 */

import {
  organizationSchema,
  contactSchema,
  engagementSchema,
  matchSchema,
} from '../schemas';
import { migrateZodSchema } from './field-migration';
import { EXPERIENCE_TEMPLATES, instantiateTemplate } from './experience-templates';
import { getRegistry, getEntityLayer } from './hooks-internal';
import type { ComponentDefinition } from './types';

export interface SeedResult {
  created: number;
  skipped: number;
  templates: number;
  errors: string[];
}

const SEED_MARKER_SLUG = 'seed-marker';

/**
 * Seed the Dynamic Component Engine with definitions derived from existing
 * Zod schemas and built-in experience templates.
 *
 * Safe to call multiple times — will no-op if the seed marker already exists.
 */
export async function seedEngine(force = false): Promise<SeedResult> {
  const registry = getRegistry();
  const entityLayer = getEntityLayer();

  const result: SeedResult = { created: 0, skipped: 0, templates: 0, errors: [] };

  // ── 1. Check if already seeded ──────────────────────────────────────────
  const existing = await registry.listDefinitions();
  const alreadySeeded = existing.some((d) => d.slug === SEED_MARKER_SLUG);

  if (alreadySeeded && !force) {
    result.skipped = -1; // signal: already seeded
    return result;
  }

  // If force re-seeding, remove existing seed marker
  if (alreadySeeded && force) {
    const marker = existing.find((d) => d.slug === SEED_MARKER_SLUG);
    if (marker) {
      try { await registry.deleteDefinition(marker.id); } catch { /* ignore */ }
    }
  }

  // Build a set of existing slugs so we can skip duplicates
  const existingSlugs = new Set(existing.map((d) => d.slug));

  // ── 2. Migrate Zod schemas → component definitions ──────────────────────
  const schemas: { name: string; schema: typeof organizationSchema }[] = [
    { name: 'organization', schema: organizationSchema },
    { name: 'contact', schema: contactSchema },
    { name: 'engagement', schema: engagementSchema },
    { name: 'match', schema: matchSchema },
  ];

  for (const { name, schema } of schemas) {
    const definitions = migrateZodSchema(schema, 'portal', name);

    for (const def of definitions) {
      if (existingSlugs.has(def.slug)) {
        result.skipped++;
        continue;
      }

      try {
        await registry.createDefinition({
          slug: def.slug,
          category: def.category,
          renderer: def.renderer,
          dataSchema: def.dataSchema,
          defaultConfig: def.defaultConfig,
          validations: def.validations,
          i18n: def.i18n,
          composedOf: def.composedOf,
          status: def.status,
        });
        existingSlugs.add(def.slug);
        result.created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Definition ${def.slug}: ${msg}`);
      }
    }
  }

  // ── 3. Instantiate experience templates ─────────────────────────────────
  for (const template of EXPERIENCE_TEMPLATES) {
    try {
      await instantiateTemplate(template, entityLayer);
      result.templates++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Template ${template.slug}: ${msg}`);
    }
  }

  // ── 4. Create seed marker to prevent re-seeding ─────────────────────────
  try {
    await registry.createDefinition({
      slug: SEED_MARKER_SLUG,
      category: 'field',
      renderer: 'none',
      dataSchema: { type: 'object' },
      defaultConfig: { seededAt: new Date().toISOString() },
      validations: [],
      i18n: {
        en: { label: 'Seed Marker' },
        ar: { label: 'علامة التهيئة' },
      },
      status: 'published',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Seed marker: ${msg}`);
  }

  return result;
}

/**
 * Clear all engine data from Mujarrad — component definitions, instances,
 * flow definitions, flow sessions, and notification definitions.
 * This allows a fresh re-seed.
 */
export async function clearEngine(): Promise<{ deleted: number; errors: string[] }> {
  const entityLayer = getEntityLayer();
  let deleted = 0;
  const errors: string[] = [];

  const resources = [
    'flow-sessions',
    'component-instances',
    'notification-definitions',
    'flow-definitions',
    'component-definitions',
  ];

  for (const resource of resources) {
    try {
      const { data } = await entityLayer.listEntities(resource);
      for (const record of data) {
        try {
          await entityLayer.deleteEntity(resource, record.id as string);
          deleted++;
        } catch (err) {
          errors.push(`${resource}/${record.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`${resource}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { deleted, errors };
}
