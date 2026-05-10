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
import {
  getRegistry,
  getEntityLayer,
  getReferenceDataManager,
  getReferenceDataRefresher,
} from './hooks-internal';
import type { ComponentDefinition } from './types';
import type { ReferenceEntry, RefreshSource } from './reference-data';

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

  // Always sync reference datasets first (idempotent, attaches refreshSource
  // to existing system datasets even when the seed marker is present).
  await syncReferenceDatasets(result);
  try {
    await getReferenceDataRefresher().rescheduleAll();
  } catch { /* non-fatal */ }

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

  // (Reference datasets are synced at the top of seedEngine via syncReferenceDatasets.)

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
 * Idempotent sync of reference datasets — runs every seed call regardless of
 * the seed-marker so that existing installations get updated `refreshSource`
 * configurations attached to system datasets.
 */
async function syncReferenceDatasets(result: SeedResult): Promise<void> {
  const refManager = getReferenceDataManager();
  for (const ds of DEFAULT_DATASETS) {
    try {
      const existing = await refManager.getDataset(ds.datasetSlug);
      if (!existing) {
        await refManager.createDataset(ds);
        result.created++;
      } else {
        // Backfill: if the seed declares a refreshSource that the existing
        // record lacks (or differs from), update it. Doesn't touch entries.
        const existingSrcJson = JSON.stringify(existing.refreshSource ?? null);
        const seedSrcJson = JSON.stringify(ds.refreshSource ?? null);
        if (ds.refreshSource && existingSrcJson !== seedSrcJson) {
          try {
            await refManager.updateDataset(existing.id, {
              refreshSource: ds.refreshSource,
            });
          } catch { /* non-fatal */ }
        }
        result.skipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Reference ${ds.datasetSlug}: ${msg}`);
    }
  }
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

interface SystemDataset {
  datasetSlug: string;
  name_en: string;
  name_ar: string;
  entries: ReferenceEntry[];
  isSystem: true;
  refreshSource?: RefreshSource;
}

const DEFAULT_DATASETS: SystemDataset[] = [
  // ── Geographic & Financial ───────────────────────────────────────────────
  {
    datasetSlug: 'countries',
    name_en: 'Countries',
    name_ar: 'الدول',
    isSystem: true,
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
      { value: 'JP', label_en: 'Japan', label_ar: 'اليابان', order: 12 },
      { value: 'CN', label_en: 'China', label_ar: 'الصين', order: 13 },
      { value: 'IN', label_en: 'India', label_ar: 'الهند', order: 14 },
      { value: 'DE', label_en: 'Germany', label_ar: 'ألمانيا', order: 15 },
      { value: 'FR', label_en: 'France', label_ar: 'فرنسا', order: 16 },
    ],
    refreshSource: {
      url: 'https://restcountries.com/v3.1/all?fields=cca2,name,translations',
      intervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
      mergeStrategy: 'enrich',
      mapping: {
        arrayPath: '.',
        valueField: 'cca2',
        labelEnField: 'name.common',
        labelArField: 'translations.ara.common',
      },
    },
  },
  {
    datasetSlug: 'currencies',
    name_en: 'Currencies',
    name_ar: 'العملات',
    isSystem: true,
    entries: [
      { value: 'SAR', label_en: 'Saudi Riyal (SAR)', label_ar: 'ريال سعودي', order: 1 },
      { value: 'MYR', label_en: 'Malaysian Ringgit (MYR)', label_ar: 'رينغيت ماليزي', order: 2 },
      { value: 'AED', label_en: 'UAE Dirham (AED)', label_ar: 'درهم إماراتي', order: 3 },
      { value: 'USD', label_en: 'US Dollar (USD)', label_ar: 'دولار أمريكي', order: 4 },
      { value: 'GBP', label_en: 'British Pound (GBP)', label_ar: 'جنيه إسترليني', order: 5 },
      { value: 'SGD', label_en: 'Singapore Dollar (SGD)', label_ar: 'دولار سنغافوري', order: 6 },
      { value: 'EUR', label_en: 'Euro (EUR)', label_ar: 'يورو', order: 7 },
      { value: 'JPY', label_en: 'Japanese Yen (JPY)', label_ar: 'ين ياباني', order: 8 },
      { value: 'CNY', label_en: 'Chinese Yuan (CNY)', label_ar: 'يوان صيني', order: 9 },
    ],
    refreshSource: {
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json',
      intervalMs: 30 * 24 * 60 * 60 * 1000, // monthly
      mergeStrategy: 'enrich',
      mapping: {
        arrayPath: '$object',
        valueField: '$key',
        labelEnField: '$value',
        valueTransform: 'upper', // jsDelivr currency-api uses lowercase ISO codes
      },
    },
  },

  // ── Industry & Business ──────────────────────────────────────────────────
  {
    datasetSlug: 'sectors',
    name_en: 'Sectors',
    name_ar: 'القطاعات',
    isSystem: true,
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
      { value: 'logistics', label_en: 'Logistics & Supply Chain', label_ar: 'الخدمات اللوجستية', order: 11 },
      { value: 'defense', label_en: 'Defense & Security', label_ar: 'الدفاع والأمن', order: 12 },
    ],
  },
  {
    datasetSlug: 'organization-types',
    name_en: 'Organization Types',
    name_ar: 'أنواع المنظمات',
    isSystem: true,
    entries: [
      { value: 'investor', label_en: 'Investor', label_ar: 'مستثمر', order: 1 },
      { value: 'company', label_en: 'Company', label_ar: 'شركة', order: 2 },
      { value: 'government', label_en: 'Government Entity', label_ar: 'جهة حكومية', order: 3 },
      { value: 'ngo', label_en: 'NGO', label_ar: 'منظمة غير ربحية', order: 4 },
      { value: 'fund', label_en: 'Investment Fund', label_ar: 'صندوق استثماري', order: 5 },
      { value: 'accelerator', label_en: 'Accelerator / Incubator', label_ar: 'مسرّعة أعمال', order: 6 },
      { value: 'partner', label_en: 'Partner', label_ar: 'شريك', order: 7 },
      { value: 'vendor', label_en: 'Vendor', label_ar: 'مورّد', order: 8 },
      { value: 'client', label_en: 'Client', label_ar: 'عميل', order: 9 },
      { value: 'market_entity', label_en: 'Market Entity', label_ar: 'كيان سوقي', order: 10 },
    ],
  },
  {
    datasetSlug: 'organization-statuses',
    name_en: 'Organization Statuses',
    name_ar: 'حالات المنظمات',
    isSystem: true,
    entries: [
      { value: 'active', label_en: 'Active', label_ar: 'نشط', order: 1 },
      { value: 'prospect', label_en: 'Prospect', label_ar: 'محتمل', order: 2 },
      { value: 'inactive', label_en: 'Inactive', label_ar: 'غير نشط', order: 3 },
    ],
  },

  // ── Deal & Pipeline ──────────────────────────────────────────────────────
  {
    datasetSlug: 'deal-stages',
    name_en: 'Deal Stages',
    name_ar: 'مراحل الصفقة',
    isSystem: true,
    entries: [
      { value: 'prospect', label_en: 'Prospect', label_ar: 'احتمال', order: 1 },
      { value: 'introduction', label_en: 'Introduction', label_ar: 'تعارف', order: 2 },
      { value: 'engaged', label_en: 'Engaged', label_ar: 'مشارك', order: 3 },
      { value: 'due-diligence', label_en: 'Due Diligence', label_ar: 'العناية الواجبة', order: 4 },
      { value: 'negotiation', label_en: 'Negotiation', label_ar: 'تفاوض', order: 5 },
      { value: 'signing', label_en: 'Signing', label_ar: 'توقيع', order: 6 },
      { value: 'active_partner', label_en: 'Active Partner', label_ar: 'شريك نشط', order: 7 },
      { value: 'closed', label_en: 'Closed', label_ar: 'مغلق', order: 8 },
    ],
  },
  {
    datasetSlug: 'partnership-types',
    name_en: 'Partnership Types',
    name_ar: 'أنواع الشراكة',
    isSystem: true,
    entries: [
      { value: 'joint-venture', label_en: 'Joint Venture', label_ar: 'مشروع مشترك', order: 1 },
      { value: 'investment', label_en: 'Direct Investment', label_ar: 'استثمار مباشر', order: 2 },
      { value: 'licensing', label_en: 'Licensing', label_ar: 'ترخيص', order: 3 },
      { value: 'acquisition', label_en: 'Acquisition', label_ar: 'استحواذ', order: 4 },
      { value: 'strategic-alliance', label_en: 'Strategic Alliance', label_ar: 'تحالف استراتيجي', order: 5 },
    ],
  },
  {
    datasetSlug: 'timeline-options',
    name_en: 'Deal Timelines',
    name_ar: 'الجداول الزمنية',
    isSystem: true,
    entries: [
      { value: '3m', label_en: '3 months', label_ar: '3 أشهر', order: 1 },
      { value: '6m', label_en: '6 months', label_ar: '6 أشهر', order: 2 },
      { value: '12m', label_en: '12 months', label_ar: '12 شهرًا', order: 3 },
      { value: '24m', label_en: '24+ months', label_ar: '24+ شهرًا', order: 4 },
    ],
  },

  // ── Engagement ───────────────────────────────────────────────────────────
  {
    datasetSlug: 'engagement-stages',
    name_en: 'Engagement Stages',
    name_ar: 'مراحل المشاركة',
    isSystem: true,
    entries: [
      { value: 'prospect', label_en: 'Prospect', label_ar: 'محتمل', order: 1 },
      { value: 'in_progress', label_en: 'In Progress', label_ar: 'قيد التقدم', order: 2 },
      { value: 'negotiating', label_en: 'Negotiating', label_ar: 'تفاوض', order: 3 },
      { value: 'formalized', label_en: 'Formalized', label_ar: 'رسمي', order: 4 },
      { value: 'active', label_en: 'Active', label_ar: 'نشط', order: 5 },
      { value: 'completed', label_en: 'Completed', label_ar: 'مكتمل', order: 6 },
      { value: 'dormant', label_en: 'Dormant', label_ar: 'خامل', order: 7 },
    ],
  },
  {
    datasetSlug: 'engagement-categories',
    name_en: 'Engagement Categories',
    name_ar: 'فئات المشاركة',
    isSystem: true,
    entries: [
      { value: 'deal', label_en: 'Deal', label_ar: 'صفقة', order: 1 },
      { value: 'project', label_en: 'Project', label_ar: 'مشروع', order: 2 },
      { value: 'opportunity', label_en: 'Opportunity', label_ar: 'فرصة', order: 3 },
      { value: 'initiative', label_en: 'Initiative', label_ar: 'مبادرة', order: 4 },
      { value: 'regulatory', label_en: 'Regulatory', label_ar: 'تنظيمي', order: 5 },
      { value: 'diplomatic', label_en: 'Diplomatic', label_ar: 'دبلوماسي', order: 6 },
    ],
  },

  // ── Match ────────────────────────────────────────────────────────────────
  {
    datasetSlug: 'match-statuses',
    name_en: 'Match Statuses',
    name_ar: 'حالات المطابقة',
    isSystem: true,
    entries: [
      { value: 'pending', label_en: 'Pending', label_ar: 'معلق', order: 1 },
      { value: 'accepted_a', label_en: 'Accepted (Party A)', label_ar: 'مقبول (طرف أ)', order: 2 },
      { value: 'accepted_b', label_en: 'Accepted (Party B)', label_ar: 'مقبول (طرف ب)', order: 3 },
      { value: 'mutual', label_en: 'Mutual', label_ar: 'متبادل', order: 4 },
      { value: 'declined', label_en: 'Declined', label_ar: 'مرفوض', order: 5 },
      { value: 'expired', label_en: 'Expired', label_ar: 'منتهي الصلاحية', order: 6 },
    ],
  },
  {
    datasetSlug: 'match-categories',
    name_en: 'Match Categories',
    name_ar: 'فئات المطابقة',
    isSystem: true,
    entries: [
      { value: 'investment', label_en: 'Investment', label_ar: 'استثمار', order: 1 },
      { value: 'partnership', label_en: 'Partnership', label_ar: 'شراكة', order: 2 },
      { value: 'joint_venture', label_en: 'Joint Venture', label_ar: 'مشروع مشترك', order: 3 },
      { value: 'technology', label_en: 'Technology Transfer', label_ar: 'نقل تكنولوجيا', order: 4 },
      { value: 'regulatory', label_en: 'Regulatory', label_ar: 'تنظيمي', order: 5 },
    ],
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  {
    datasetSlug: 'task-statuses',
    name_en: 'Task Statuses',
    name_ar: 'حالات المهام',
    isSystem: true,
    entries: [
      { value: 'open', label_en: 'Open', label_ar: 'مفتوح', order: 1 },
      { value: 'in_progress', label_en: 'In Progress', label_ar: 'قيد التنفيذ', order: 2 },
      { value: 'done', label_en: 'Done', label_ar: 'مكتمل', order: 3 },
    ],
  },
  {
    datasetSlug: 'priority-levels',
    name_en: 'Priority Levels',
    name_ar: 'مستويات الأولوية',
    isSystem: true,
    entries: [
      { value: 'low', label_en: 'Low', label_ar: 'منخفض', order: 1 },
      { value: 'medium', label_en: 'Medium', label_ar: 'متوسط', order: 2 },
      { value: 'high', label_en: 'High', label_ar: 'عالي', order: 3 },
      { value: 'critical', label_en: 'Critical', label_ar: 'حرج', order: 4 },
    ],
  },

  // ── Compliance & Due Diligence ───────────────────────────────────────────
  {
    datasetSlug: 'kyc-statuses',
    name_en: 'KYC Statuses',
    name_ar: 'حالات اعرف عميلك',
    isSystem: true,
    entries: [
      { value: 'pending', label_en: 'Pending', label_ar: 'معلق', order: 1 },
      { value: 'in_review', label_en: 'In Review', label_ar: 'قيد المراجعة', order: 2 },
      { value: 'verified', label_en: 'Verified', label_ar: 'تم التحقق', order: 3 },
      { value: 'rejected', label_en: 'Rejected', label_ar: 'مرفوض', order: 4 },
    ],
  },
  {
    datasetSlug: 'sanctions-check-statuses',
    name_en: 'Sanctions Check Statuses',
    name_ar: 'حالات فحص العقوبات',
    isSystem: true,
    entries: [
      { value: 'clear', label_en: 'Clear', label_ar: 'نظيف', order: 1 },
      { value: 'flagged', label_en: 'Flagged', label_ar: 'مُبلَّغ', order: 2 },
      { value: 'pending', label_en: 'Pending', label_ar: 'معلق', order: 3 },
    ],
  },
  {
    datasetSlug: 'approval-decisions',
    name_en: 'Approval Decisions',
    name_ar: 'قرارات الموافقة',
    isSystem: true,
    entries: [
      { value: 'approved', label_en: 'Approved', label_ar: 'موافق', order: 1 },
      { value: 'rejected', label_en: 'Rejected', label_ar: 'مرفوض', order: 2 },
      { value: 'deferred', label_en: 'Deferred', label_ar: 'مؤجل', order: 3 },
    ],
  },

  // ── Engine Configuration ─────────────────────────────────────────────────
  {
    datasetSlug: 'renderer-types',
    name_en: 'Component Field Types',
    name_ar: 'أنواع حقول المكونات',
    isSystem: true,
    entries: [
      { value: 'text-input', label_en: 'Text Input', order: 1 },
      { value: 'textarea', label_en: 'Text Area', order: 2 },
      { value: 'number', label_en: 'Number', order: 3 },
      { value: 'select', label_en: 'Dropdown', order: 4 },
      { value: 'multi-select', label_en: 'Multi-Select', order: 5 },
      { value: 'toggle', label_en: 'Toggle / Switch', order: 6 },
      { value: 'date', label_en: 'Date Picker', order: 7 },
      { value: 'email-input', label_en: 'Email', order: 8 },
      { value: 'phone-input', label_en: 'Phone', order: 9 },
      { value: 'file-upload', label_en: 'File Upload', order: 10 },
    ],
  },
  {
    datasetSlug: 'notification-trigger-types',
    name_en: 'Notification Triggers',
    name_ar: 'مشغلات الإشعارات',
    isSystem: true,
    entries: [
      { value: 'flow.started', label_en: 'Flow Started', order: 1 },
      { value: 'flow.completed', label_en: 'Flow Completed', order: 2 },
      { value: 'stage.entered', label_en: 'Stage Entered', order: 3 },
      { value: 'stage.submitted', label_en: 'Stage Submitted', order: 4 },
      { value: 'component.value_changed', label_en: 'Value Changed', order: 5 },
      { value: 'branch.selected', label_en: 'Branch Selected', order: 6 },
      { value: 'match.discovered', label_en: 'Match Discovered', order: 7 },
      { value: 'data.threshold_breached', label_en: 'Threshold Breached', order: 8 },
      { value: 'schedule', label_en: 'Scheduled', order: 9 },
    ],
  },
];
