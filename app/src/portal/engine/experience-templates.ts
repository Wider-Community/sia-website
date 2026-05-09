/**
 * Dynamic Component Engine — Experience Templates
 *
 * Pre-configured templates that combine flow definitions + component sets
 * into complete experiences. Templates can be instantiated into real
 * Mujarrad nodes via the entity control layer.
 */

import type {
  FlowDefinition,
  ComponentDefinition,
  StageDefinition,
  TransitionEdge,
} from './types';
import type { PageConfig, PageSection } from './components/DynamicPage';
import type { EntityControlLayer } from '../lib/entity-control-layer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExperienceTemplate {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description: string;
  category: 'onboarding' | 'matching' | 'due-diligence' | 'deal-room' | 'compliance';
  flowTemplate: Omit<FlowDefinition, 'id' | 'nodeType' | 'version'>;
  componentTemplates: Array<Omit<ComponentDefinition, 'id' | 'nodeType' | 'version'>>;
  pageConfig: PageConfig;
}

export interface InstantiatedExperience {
  flow: FlowDefinition;
  components: ComponentDefinition[];
  pageConfig: PageConfig;
}

// ---------------------------------------------------------------------------
// Template helper builders
// ---------------------------------------------------------------------------

function makeTransition(
  id: string,
  fromStageId: string,
  toStageId: string,
  priority: number,
  conditions: TransitionEdge['conditions'] = [],
  logic: TransitionEdge['logic'] = 'AND',
): TransitionEdge {
  return { id, fromStageId, toStageId, conditions, logic, priority };
}

function makeStage(
  id: string,
  slug: string,
  label_en: string,
  label_ar: string,
  isTerminal: boolean,
  componentOrder: string[],
  transitions: TransitionEdge[],
): StageDefinition {
  return {
    id,
    slug,
    metadata: { label_en, label_ar },
    isTerminal,
    componentOrder,
    transitions,
  };
}

function makeComponentDef(
  slug: string,
  renderer: string,
  category: ComponentDefinition['category'],
  label_en: string,
  label_ar: string,
  dataSchema: ComponentDefinition['dataSchema'],
  defaultConfig: Record<string, unknown> = {},
  validations: ComponentDefinition['validations'] = [],
  dataSource?: ComponentDefinition['dataSource'],
): Omit<ComponentDefinition, 'id' | 'nodeType' | 'version'> {
  return {
    slug,
    renderer,
    category,
    dataSchema,
    defaultConfig,
    validations,
    dataSource,
    i18n: {
      en: { label: label_en },
      ar: { label: label_ar },
    },
    status: 'published',
  };
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

const organizationOnboarding: ExperienceTemplate = {
  id: 'tpl-org-onboarding',
  slug: 'organization-onboarding',
  name_en: 'Organization Onboarding',
  name_ar: 'تسجيل المنظمة',
  description: 'Three-stage onboarding: basic info, sector selection, and contact details.',
  category: 'onboarding',
  flowTemplate: {
    slug: 'org-onboarding-flow',
    entryStageId: 'stage-basic-info',
    stages: [
      makeStage(
        'stage-basic-info',
        'basic-info',
        'Basic Information',
        'المعلومات الأساسية',
        false,
        ['comp-org-name', 'comp-org-country', 'comp-org-type'],
        [makeTransition('t-basic-to-sector', 'stage-basic-info', 'stage-sector', 1)],
      ),
      makeStage(
        'stage-sector',
        'sector-selection',
        'Sector Selection',
        'اختيار القطاع',
        false,
        ['comp-primary-sector', 'comp-sub-sectors'],
        [makeTransition('t-sector-to-contact', 'stage-sector', 'stage-contact', 1)],
      ),
      makeStage(
        'stage-contact',
        'contact-details',
        'Contact Details',
        'تفاصيل الاتصال',
        true,
        ['comp-contact-name', 'comp-contact-email', 'comp-contact-phone'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Organization Onboarding',
      name_ar: 'تسجيل المنظمة',
      description: 'Collect basic organization details, sector, and primary contact.',
      purpose: 'onboarding',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('org-name', 'text-input', 'field', 'Organization Name', 'اسم المنظمة', { type: 'string', minLength: 2 }, {}, [
      { rule: 'required', message_en: 'Organization name is required', message_ar: 'اسم المنظمة مطلوب' },
    ]),
    makeComponentDef('org-country', 'select', 'field', 'Country', 'الدولة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Country is required', message_ar: 'الدولة مطلوبة' },
    ], { type: 'reference', datasetSlug: 'countries' }),
    makeComponentDef('org-type', 'select', 'field', 'Organization Type', 'نوع المنظمة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Type is required', message_ar: 'النوع مطلوب' },
    ], { type: 'reference', datasetSlug: 'organization-types' }),
    makeComponentDef('primary-sector', 'select', 'field', 'Primary Sector', 'القطاع الرئيسي', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Primary sector is required', message_ar: 'القطاع الرئيسي مطلوب' },
    ], { type: 'reference', datasetSlug: 'sectors' }),
    makeComponentDef('sub-sectors', 'multi-select', 'field', 'Sub-sectors', 'القطاعات الفرعية', { type: 'array', items: { type: 'string' } }),
    makeComponentDef('contact-name', 'text-input', 'field', 'Contact Name', 'اسم جهة الاتصال', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Contact name is required', message_ar: 'اسم جهة الاتصال مطلوب' },
    ]),
    makeComponentDef('contact-email', 'email-input', 'field', 'Email', 'البريد الإلكتروني', { type: 'string', format: 'email' }, {}, [
      { rule: 'required', message_en: 'Email is required', message_ar: 'البريد الإلكتروني مطلوب' },
      { rule: 'pattern', value: '^[^@]+@[^@]+\\.[^@]+$', message_en: 'Invalid email', message_ar: 'بريد إلكتروني غير صالح' },
    ]),
    makeComponentDef('contact-phone', 'phone-input', 'field', 'Phone', 'الهاتف', { type: 'string' }),
  ],
  pageConfig: {
    id: 'page-org-onboarding',
    slug: 'org-onboarding',
    title_en: 'Organization Onboarding',
    title_ar: 'تسجيل المنظمة',
    layout: 'single-column',
    sections: [
      { id: 'sec-basic', title_en: 'Basic Information', title_ar: 'المعلومات الأساسية', componentInstanceIds: ['comp-org-name', 'comp-org-country', 'comp-org-type'] },
      { id: 'sec-sector', title_en: 'Sector', title_ar: 'القطاع', componentInstanceIds: ['comp-primary-sector', 'comp-sub-sectors'], layout: 'grid-2' },
      { id: 'sec-contact', title_en: 'Contact Details', title_ar: 'تفاصيل الاتصال', componentInstanceIds: ['comp-contact-name', 'comp-contact-email', 'comp-contact-phone'], layout: 'grid-3' },
    ],
  },
};

const dealMatching: ExperienceTemplate = {
  id: 'tpl-deal-matching',
  slug: 'deal-matching',
  name_en: 'Deal Matching',
  name_ar: 'مطابقة الصفقات',
  description: 'Four-stage deal matching: org profile, matching criteria, preferences, and review with conditional branching on sector.',
  category: 'matching',
  flowTemplate: {
    slug: 'deal-matching-flow',
    entryStageId: 'stage-org-profile',
    stages: [
      makeStage(
        'stage-org-profile',
        'org-profile',
        'Organization Profile',
        'ملف المنظمة',
        false,
        ['comp-org-select', 'comp-deal-size', 'comp-deal-sector'],
        [makeTransition('t-profile-to-criteria', 'stage-org-profile', 'stage-criteria', 1)],
      ),
      makeStage(
        'stage-criteria',
        'matching-criteria',
        'Matching Criteria',
        'معايير المطابقة',
        false,
        ['comp-target-sectors', 'comp-target-countries', 'comp-deal-range'],
        [
          // Conditional: energy sector goes to energy-specific preferences
          makeTransition('t-criteria-to-energy', 'stage-criteria', 'stage-preferences', 1, [
            { field: 'deal-sector', operator: 'eq', value: 'energy' },
          ]),
          // Default: go to standard preferences
          makeTransition('t-criteria-to-prefs', 'stage-criteria', 'stage-preferences', 10),
        ],
      ),
      makeStage(
        'stage-preferences',
        'preferences',
        'Preferences',
        'التفضيلات',
        false,
        ['comp-timeline', 'comp-partnership-type', 'comp-additional-notes'],
        [makeTransition('t-prefs-to-review', 'stage-preferences', 'stage-review', 1)],
      ),
      makeStage(
        'stage-review',
        'review',
        'Review & Submit',
        'المراجعة والإرسال',
        true,
        ['comp-review-summary'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Deal Matching',
      name_ar: 'مطابقة الصفقات',
      description: 'Match organizations across the KSA-Malaysia corridor based on sector, deal size, and preferences.',
      purpose: 'matching',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('org-select', 'select', 'field', 'Organization', 'المنظمة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Organization is required', message_ar: 'المنظمة مطلوبة' },
    ], { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('deal-size', 'number-input', 'field', 'Deal Size (USD)', 'حجم الصفقة (دولار)', { type: 'number', minimum: 0 }, {}, [
      { rule: 'required', message_en: 'Deal size is required', message_ar: 'حجم الصفقة مطلوب' },
      { rule: 'min', value: 0, message_en: 'Must be positive', message_ar: 'يجب أن يكون إيجابيًا' },
    ]),
    makeComponentDef('deal-sector', 'select', 'field', 'Primary Deal Sector', 'قطاع الصفقة الرئيسي', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Sector is required', message_ar: 'القطاع مطلوب' },
    ], { type: 'reference', datasetSlug: 'sectors' }),
    makeComponentDef('target-sectors', 'multi-select', 'field', 'Target Sectors', 'القطاعات المستهدفة', { type: 'array', items: { type: 'string' } }, {},
      [], { type: 'reference', datasetSlug: 'sectors' }),
    makeComponentDef('target-countries', 'multi-select', 'field', 'Target Countries', 'الدول المستهدفة', { type: 'array', items: { type: 'string' } }, {},
      [], { type: 'reference', datasetSlug: 'countries' }),
    makeComponentDef('deal-range', 'range-input', 'field', 'Deal Range (USD)', 'نطاق الصفقة (دولار)', { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } }),
    makeComponentDef('timeline', 'select', 'field', 'Expected Timeline', 'الجدول الزمني المتوقع', { type: 'string' }, {}, [],
      { type: 'reference', datasetSlug: 'timeline-options' }),
    makeComponentDef('partnership-type', 'select', 'field', 'Partnership Type', 'نوع الشراكة', { type: 'string' }, {}, [],
      { type: 'reference', datasetSlug: 'partnership-types' }),
    makeComponentDef('additional-notes', 'textarea', 'field', 'Additional Notes', 'ملاحظات إضافية', { type: 'string' }, { rows: 4 }),
    makeComponentDef('review-summary', 'review-panel', 'composite', 'Review Summary', 'ملخص المراجعة', { type: 'object' }, { readOnly: true }),
  ],
  pageConfig: {
    id: 'page-deal-matching',
    slug: 'deal-matching',
    title_en: 'Deal Matching',
    title_ar: 'مطابقة الصفقات',
    layout: 'tabs',
    sections: [
      { id: 'sec-profile', title_en: 'Organization Profile', title_ar: 'ملف المنظمة', componentInstanceIds: ['comp-org-select', 'comp-deal-size', 'comp-deal-sector'] },
      { id: 'sec-criteria', title_en: 'Matching Criteria', title_ar: 'معايير المطابقة', componentInstanceIds: ['comp-target-sectors', 'comp-target-countries', 'comp-deal-range'], layout: 'grid-2' },
      { id: 'sec-prefs', title_en: 'Preferences', title_ar: 'التفضيلات', componentInstanceIds: ['comp-timeline', 'comp-partnership-type', 'comp-additional-notes'] },
      { id: 'sec-review', title_en: 'Review', title_ar: 'المراجعة', componentInstanceIds: ['comp-review-summary'] },
    ],
  },
};

const dueDiligence: ExperienceTemplate = {
  id: 'tpl-due-diligence',
  slug: 'due-diligence',
  name_en: 'Due Diligence',
  name_ar: 'العناية الواجبة',
  description: 'Three-stage due diligence: document upload, compliance check, and approval.',
  category: 'due-diligence',
  flowTemplate: {
    slug: 'due-diligence-flow',
    entryStageId: 'stage-documents',
    stages: [
      makeStage(
        'stage-documents',
        'document-upload',
        'Document Upload',
        'رفع المستندات',
        false,
        ['comp-dd-org-select', 'comp-company-docs', 'comp-financial-docs', 'comp-legal-docs'],
        [makeTransition('t-docs-to-compliance', 'stage-documents', 'stage-compliance', 1)],
      ),
      makeStage(
        'stage-compliance',
        'compliance-check',
        'Compliance Check',
        'فحص الامتثال',
        false,
        ['comp-kyc-status', 'comp-sanctions-check', 'comp-compliance-notes'],
        [makeTransition('t-compliance-to-approval', 'stage-compliance', 'stage-approval', 1)],
      ),
      makeStage(
        'stage-approval',
        'approval',
        'Approval',
        'الموافقة',
        true,
        ['comp-approval-decision', 'comp-approval-notes'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Due Diligence',
      name_ar: 'العناية الواجبة',
      description: 'Collect documents, run compliance checks, and finalize approval.',
      purpose: 'due-diligence',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('dd-org-select', 'select', 'field', 'Organization', 'المنظمة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Organization is required', message_ar: 'المنظمة مطلوبة' },
    ], { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('company-docs', 'file-upload', 'field', 'Company Documents', 'مستندات الشركة', { type: 'array', items: { type: 'string', format: 'uri' } }, { accept: '.pdf,.docx', maxFiles: 5 }, [
      { rule: 'required', message_en: 'At least one document is required', message_ar: 'يجب رفع مستند واحد على الأقل' },
    ]),
    makeComponentDef('financial-docs', 'file-upload', 'field', 'Financial Statements', 'البيانات المالية', { type: 'array', items: { type: 'string', format: 'uri' } }, { accept: '.pdf,.xlsx', maxFiles: 10 }),
    makeComponentDef('legal-docs', 'file-upload', 'field', 'Legal Documents', 'المستندات القانونية', { type: 'array', items: { type: 'string', format: 'uri' } }, { accept: '.pdf', maxFiles: 10 }),
    makeComponentDef('kyc-status', 'select', 'field', 'KYC Status', 'حالة اعرف عميلك', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'KYC status is required', message_ar: 'حالة اعرف عميلك مطلوبة' },
    ], { type: 'reference', datasetSlug: 'kyc-statuses' }),
    makeComponentDef('sanctions-check', 'select', 'field', 'Sanctions Screening', 'فحص العقوبات', { type: 'string' }, {}, [],
      { type: 'reference', datasetSlug: 'sanctions-check-statuses' }),
    makeComponentDef('compliance-notes', 'textarea', 'field', 'Compliance Notes', 'ملاحظات الامتثال', { type: 'string' }, { rows: 4 }),
    makeComponentDef('approval-decision', 'select', 'action', 'Approval Decision', 'قرار الموافقة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Decision is required', message_ar: 'القرار مطلوب' },
    ], { type: 'reference', datasetSlug: 'approval-decisions' }),
    makeComponentDef('approval-notes', 'textarea', 'field', 'Approval Notes', 'ملاحظات الموافقة', { type: 'string' }, { rows: 3 }),
  ],
  pageConfig: {
    id: 'page-due-diligence',
    slug: 'due-diligence',
    title_en: 'Due Diligence',
    title_ar: 'العناية الواجبة',
    layout: 'two-column',
    sections: [
      { id: 'sec-docs', title_en: 'Documents', title_ar: 'المستندات', componentInstanceIds: ['comp-dd-org-select', 'comp-company-docs', 'comp-financial-docs', 'comp-legal-docs'] },
      { id: 'sec-compliance', title_en: 'Compliance', title_ar: 'الامتثال', componentInstanceIds: ['comp-kyc-status', 'comp-sanctions-check', 'comp-compliance-notes'] },
      { id: 'sec-approval', title_en: 'Approval', title_ar: 'الموافقة', componentInstanceIds: ['comp-approval-decision', 'comp-approval-notes'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  organizationOnboarding,
  dealMatching,
  dueDiligence,
];

export function getTemplateBySlug(slug: string): ExperienceTemplate | undefined {
  return EXPERIENCE_TEMPLATES.find((t) => t.slug === slug);
}

export function getTemplateById(id: string): ExperienceTemplate | undefined {
  return EXPERIENCE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: ExperienceTemplate['category'],
): ExperienceTemplate[] {
  return EXPERIENCE_TEMPLATES.filter((t) => t.category === category);
}

// ---------------------------------------------------------------------------
// Instantiation — creates real Mujarrad nodes from a template
// ---------------------------------------------------------------------------

export async function instantiateTemplate(
  template: ExperienceTemplate,
  entityLayer: EntityControlLayer,
): Promise<InstantiatedExperience> {
  // 1. Create component definitions
  const components: ComponentDefinition[] = [];
  const componentDefIdMap = new Map<string, string>(); // slug -> definition ID

  for (const compTemplate of template.componentTemplates) {
    const record = await entityLayer.createEntity('component-definitions', {
      ...compTemplate,
      componentCategory: compTemplate.category,
      version: 1,
    });
    const created = {
      id: record.id,
      nodeType: 'TEMPLATE' as const,
      version: 1,
      ...compTemplate,
    };
    components.push(created);
    componentDefIdMap.set(compTemplate.slug, record.id);
  }

  // 2. Create component instances for each definition and build slug -> instance ID map
  const componentInstanceIdMap = new Map<string, string>(); // slug -> instance ID

  for (const compTemplate of template.componentTemplates) {
    const definitionId = componentDefIdMap.get(compTemplate.slug);
    if (!definitionId) continue;

    const instanceRecord = await entityLayer.createEntity('component-instances', {
      definitionId,
      configOverrides: {},
      placement: { flowId: '', stageId: '', order: 0 },
    });
    componentInstanceIdMap.set(compTemplate.slug, instanceRecord.id as string);
  }

  // 3. Create flow definition — remap component references to instance IDs
  const remappedStages = template.flowTemplate.stages.map((stage) => ({
    ...stage,
    componentOrder: stage.componentOrder.map(
      (slug) => componentInstanceIdMap.get(slug.replace('comp-', '')) ?? slug,
    ),
  }));

  const flowRecord = await entityLayer.createEntity('flow-definitions', {
    ...template.flowTemplate,
    stages: remappedStages,
    version: 1,
  });

  const flow: FlowDefinition = {
    id: flowRecord.id,
    nodeType: 'TEMPLATE',
    version: 1,
    ...template.flowTemplate,
    stages: remappedStages,
  };

  // 4. Build pageConfig with remapped component instance IDs
  const pageConfig: PageConfig = {
    ...template.pageConfig,
    sections: template.pageConfig.sections.map((section) => ({
      ...section,
      componentInstanceIds: section.componentInstanceIds.map(
        (slug) => componentInstanceIdMap.get(slug.replace('comp-', '')) ?? slug,
      ),
    })),
  };

  return { flow, components, pageConfig };
}
