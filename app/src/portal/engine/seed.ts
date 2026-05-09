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
import { getRegistry, getEntityLayer, getReferenceDataManager } from './hooks-internal';
import type { ComponentDefinition } from './types';
import type { ReferenceEntry } from './reference-data';

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
    'reference-data',
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
