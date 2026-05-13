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

const createOrganization: ExperienceTemplate = {
  id: 'tpl-create-organization',
  slug: 'create-organization',
  name_en: 'Create Organization',
  name_ar: 'إنشاء منظمة',
  description: 'Three-stage organization creation: basic info, location, and description.',
  category: 'onboarding',
  flowTemplate: {
    slug: 'create-organization-flow',
    entryStageId: 'stage-org-basic-info',
    stages: [
      makeStage(
        'stage-org-basic-info',
        'basic-info',
        'Basic Information',
        'المعلومات الأساسية',
        false,
        ['comp-org-create-name', 'comp-org-create-type', 'comp-org-create-status'],
        [makeTransition('t-org-basic-to-location', 'stage-org-basic-info', 'stage-org-location', 1)],
      ),
      makeStage(
        'stage-org-location',
        'location',
        'Location & Details',
        'الموقع والتفاصيل',
        false,
        ['comp-org-create-country', 'comp-org-create-city', 'comp-org-create-website'],
        [makeTransition('t-org-location-to-desc', 'stage-org-location', 'stage-org-description', 1)],
      ),
      makeStage(
        'stage-org-description',
        'description',
        'Description',
        'الوصف',
        true,
        ['comp-org-create-description', 'comp-org-create-tags'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Create Organization',
      name_ar: 'إنشاء منظمة',
      description: 'Create a new organization with basic info, location, and description.',
      purpose: 'onboarding',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('org-create-name', 'text-input', 'field', 'Organization Name', 'اسم المنظمة', { type: 'string', minLength: 2 }, {}, [
      { rule: 'required', message_en: 'Organization name is required', message_ar: 'اسم المنظمة مطلوب' },
    ]),
    makeComponentDef('org-create-type', 'select', 'field', 'Type', 'النوع', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Type is required', message_ar: 'النوع مطلوب' },
    ], { type: 'reference', datasetSlug: 'organization-types' }),
    makeComponentDef('org-create-status', 'select', 'field', 'Status', 'الحالة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Status is required', message_ar: 'الحالة مطلوبة' },
    ], { type: 'reference', datasetSlug: 'organization-statuses' }),
    makeComponentDef('org-create-country', 'select', 'field', 'Country', 'الدولة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Country is required', message_ar: 'الدولة مطلوبة' },
    ], { type: 'reference', datasetSlug: 'countries' }),
    makeComponentDef('org-create-city', 'text-input', 'field', 'City', 'المدينة', { type: 'string' }),
    makeComponentDef('org-create-website', 'text-input', 'field', 'Website', 'الموقع الإلكتروني', { type: 'string', format: 'uri' }),
    makeComponentDef('org-create-description', 'textarea', 'field', 'Description', 'الوصف', { type: 'string' }),
    makeComponentDef('org-create-tags', 'text-input', 'field', 'Tags (comma-separated)', 'العلامات', { type: 'string' }),
  ],
  pageConfig: {
    id: 'page-create-organization',
    slug: 'create-organization',
    title_en: 'Create Organization',
    title_ar: 'إنشاء منظمة',
    layout: 'single-column',
    sections: [
      { id: 'sec-org-basic', title_en: 'Basic Information', title_ar: 'المعلومات الأساسية', componentInstanceIds: ['comp-org-create-name', 'comp-org-create-type', 'comp-org-create-status'] },
      { id: 'sec-org-location', title_en: 'Location & Details', title_ar: 'الموقع والتفاصيل', componentInstanceIds: ['comp-org-create-country', 'comp-org-create-city', 'comp-org-create-website'] },
      { id: 'sec-org-description', title_en: 'Description', title_ar: 'الوصف', componentInstanceIds: ['comp-org-create-description', 'comp-org-create-tags'] },
    ],
  },
};

const createContact: ExperienceTemplate = {
  id: 'tpl-create-contact',
  slug: 'create-contact',
  name_en: 'Create Contact',
  name_ar: 'إنشاء جهة اتصال',
  description: 'Two-stage contact creation: contact information and organization link.',
  category: 'onboarding',
  flowTemplate: {
    slug: 'create-contact-flow',
    entryStageId: 'stage-contact-info',
    stages: [
      makeStage(
        'stage-contact-info',
        'contact-info',
        'Contact Information',
        'معلومات الاتصال',
        false,
        ['comp-contact-create-first', 'comp-contact-create-last', 'comp-contact-create-email', 'comp-contact-create-phone', 'comp-contact-create-role'],
        [makeTransition('t-contact-info-to-org', 'stage-contact-info', 'stage-contact-org-link', 1)],
      ),
      makeStage(
        'stage-contact-org-link',
        'org-link',
        'Organization',
        'المنظمة',
        true,
        ['comp-contact-create-org'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Create Contact',
      name_ar: 'إنشاء جهة اتصال',
      description: 'Create a new contact with personal information and organization link.',
      purpose: 'onboarding',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('contact-create-first', 'text-input', 'field', 'First Name', 'الاسم الأول', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'First name is required', message_ar: 'الاسم الأول مطلوب' },
    ]),
    makeComponentDef('contact-create-last', 'text-input', 'field', 'Last Name', 'اسم العائلة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Last name is required', message_ar: 'اسم العائلة مطلوب' },
    ]),
    makeComponentDef('contact-create-email', 'email-input', 'field', 'Email', 'البريد الإلكتروني', { type: 'string', format: 'email' }),
    makeComponentDef('contact-create-phone', 'phone-input', 'field', 'Phone', 'الهاتف', { type: 'string' }),
    makeComponentDef('contact-create-role', 'text-input', 'field', 'Role', 'الدور', { type: 'string' }),
    makeComponentDef('contact-create-org', 'select', 'field', 'Organization', 'المنظمة', { type: 'string' }, {}, [],
      { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
  ],
  pageConfig: {
    id: 'page-create-contact',
    slug: 'create-contact',
    title_en: 'Create Contact',
    title_ar: 'إنشاء جهة اتصال',
    layout: 'single-column',
    sections: [
      { id: 'sec-contact-info', title_en: 'Contact Information', title_ar: 'معلومات الاتصال', componentInstanceIds: ['comp-contact-create-first', 'comp-contact-create-last', 'comp-contact-create-email', 'comp-contact-create-phone', 'comp-contact-create-role'] },
      { id: 'sec-contact-org', title_en: 'Organization', title_ar: 'المنظمة', componentInstanceIds: ['comp-contact-create-org'] },
    ],
  },
};

const createEngagement: ExperienceTemplate = {
  id: 'tpl-create-engagement',
  slug: 'create-engagement',
  name_en: 'Create Engagement',
  name_ar: 'إنشاء مشاركة',
  description: 'Three-stage engagement creation: basics, details, and timeline.',
  category: 'onboarding',
  flowTemplate: {
    slug: 'create-engagement-flow',
    entryStageId: 'stage-eng-basics',
    stages: [
      makeStage(
        'stage-eng-basics',
        'basics',
        'Basics',
        'الأساسيات',
        false,
        ['comp-eng-create-title', 'comp-eng-create-org', 'comp-eng-create-category'],
        [makeTransition('t-eng-basics-to-details', 'stage-eng-basics', 'stage-eng-details', 1)],
      ),
      makeStage(
        'stage-eng-details',
        'details',
        'Details',
        'التفاصيل',
        false,
        ['comp-eng-create-stage', 'comp-eng-create-priority', 'comp-eng-create-description'],
        [makeTransition('t-eng-details-to-timeline', 'stage-eng-details', 'stage-eng-timeline', 1)],
      ),
      makeStage(
        'stage-eng-timeline',
        'timeline',
        'Timeline',
        'الجدول الزمني',
        true,
        ['comp-eng-create-start', 'comp-eng-create-target', 'comp-eng-create-value', 'comp-eng-create-tags'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Create Engagement',
      name_ar: 'إنشاء مشاركة',
      description: 'Create a new engagement with organization, category, timeline, and deal value.',
      purpose: 'onboarding',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('eng-create-title', 'text-input', 'field', 'Title', 'العنوان', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Title is required', message_ar: 'العنوان مطلوب' },
    ]),
    makeComponentDef('eng-create-org', 'select', 'field', 'Organization', 'المنظمة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Organization is required', message_ar: 'المنظمة مطلوبة' },
    ], { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('eng-create-category', 'select', 'field', 'Category', 'الفئة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Category is required', message_ar: 'الفئة مطلوبة' },
    ], { type: 'reference', datasetSlug: 'engagement-categories' }),
    makeComponentDef('eng-create-stage', 'select', 'field', 'Stage', 'المرحلة', { type: 'string' }, { default: 'prospect' }, [],
      { type: 'reference', datasetSlug: 'engagement-stages' }),
    makeComponentDef('eng-create-priority', 'select', 'field', 'Priority', 'الأولوية', { type: 'string' }, { default: 'medium' }, [],
      { type: 'reference', datasetSlug: 'priority-levels' }),
    makeComponentDef('eng-create-description', 'textarea', 'field', 'Description', 'الوصف', { type: 'string' }),
    makeComponentDef('eng-create-start', 'date', 'field', 'Start Date', 'تاريخ البدء', { type: 'string', format: 'date' }),
    makeComponentDef('eng-create-target', 'date', 'field', 'Target Date', 'التاريخ المستهدف', { type: 'string', format: 'date' }),
    makeComponentDef('eng-create-value', 'text-input', 'field', 'Deal Value', 'قيمة الصفقة', { type: 'string' }),
    makeComponentDef('eng-create-tags', 'text-input', 'field', 'Tags', 'العلامات', { type: 'string' }),
  ],
  pageConfig: {
    id: 'page-create-engagement',
    slug: 'create-engagement',
    title_en: 'Create Engagement',
    title_ar: 'إنشاء مشاركة',
    layout: 'single-column',
    sections: [
      { id: 'sec-eng-basics', title_en: 'Basics', title_ar: 'الأساسيات', componentInstanceIds: ['comp-eng-create-title', 'comp-eng-create-org', 'comp-eng-create-category'] },
      { id: 'sec-eng-details', title_en: 'Details', title_ar: 'التفاصيل', componentInstanceIds: ['comp-eng-create-stage', 'comp-eng-create-priority', 'comp-eng-create-description'] },
      { id: 'sec-eng-timeline', title_en: 'Timeline', title_ar: 'الجدول الزمني', componentInstanceIds: ['comp-eng-create-start', 'comp-eng-create-target', 'comp-eng-create-value', 'comp-eng-create-tags'] },
    ],
  },
};

const createTask: ExperienceTemplate = {
  id: 'tpl-create-task',
  slug: 'create-task',
  name_en: 'Create Task',
  name_ar: 'إنشاء مهمة',
  description: 'Two-stage task creation: task details and context.',
  category: 'onboarding',
  flowTemplate: {
    slug: 'create-task-flow',
    entryStageId: 'stage-task-info',
    stages: [
      makeStage(
        'stage-task-info',
        'task-info',
        'Task Details',
        'تفاصيل المهمة',
        false,
        ['comp-task-create-title', 'comp-task-create-description', 'comp-task-create-due', 'comp-task-create-priority'],
        [makeTransition('t-task-info-to-context', 'stage-task-info', 'stage-task-context', 1)],
      ),
      makeStage(
        'stage-task-context',
        'context',
        'Context',
        'السياق',
        true,
        ['comp-task-create-org', 'comp-task-create-engagement'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Create Task',
      name_ar: 'إنشاء مهمة',
      description: 'Create a new task with details, priority, and optional organization/engagement context.',
      purpose: 'onboarding',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('task-create-title', 'text-input', 'field', 'Title', 'العنوان', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Title is required', message_ar: 'العنوان مطلوب' },
    ]),
    makeComponentDef('task-create-description', 'textarea', 'field', 'Description', 'الوصف', { type: 'string' }),
    makeComponentDef('task-create-due', 'date', 'field', 'Due Date', 'تاريخ الاستحقاق', { type: 'string', format: 'date' }, {}, [
      { rule: 'required', message_en: 'Due date is required', message_ar: 'تاريخ الاستحقاق مطلوب' },
    ]),
    makeComponentDef('task-create-priority', 'select', 'field', 'Priority', 'الأولوية', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Priority is required', message_ar: 'الأولوية مطلوبة' },
    ], { type: 'reference', datasetSlug: 'priority-levels' }),
    makeComponentDef('task-create-org', 'select', 'field', 'Organization', 'المنظمة', { type: 'string' }, {}, [],
      { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('task-create-engagement', 'select', 'field', 'Engagement', 'المشاركة', { type: 'string' }, {}, [],
      { type: 'entity', resource: 'engagements', displayField: 'title', valueField: 'id' }),
  ],
  pageConfig: {
    id: 'page-create-task',
    slug: 'create-task',
    title_en: 'Create Task',
    title_ar: 'إنشاء مهمة',
    layout: 'single-column',
    sections: [
      { id: 'sec-task-info', title_en: 'Task Details', title_ar: 'تفاصيل المهمة', componentInstanceIds: ['comp-task-create-title', 'comp-task-create-description', 'comp-task-create-due', 'comp-task-create-priority'] },
      { id: 'sec-task-context', title_en: 'Context', title_ar: 'السياق', componentInstanceIds: ['comp-task-create-org', 'comp-task-create-engagement'] },
    ],
  },
};

const createMatch: ExperienceTemplate = {
  id: 'tpl-create-match',
  slug: 'create-match',
  name_en: 'Create Match',
  name_ar: 'إنشاء مطابقة',
  description: 'Three-stage match creation: organizations, match details, and expiration.',
  category: 'matching',
  flowTemplate: {
    slug: 'create-match-flow',
    entryStageId: 'stage-match-organizations',
    stages: [
      makeStage(
        'stage-match-organizations',
        'organizations',
        'Organizations',
        'المنظمات',
        false,
        ['comp-match-create-org-a', 'comp-match-create-org-b'],
        [makeTransition('t-match-orgs-to-details', 'stage-match-organizations', 'stage-match-details', 1)],
      ),
      makeStage(
        'stage-match-details',
        'match-details',
        'Match Details',
        'تفاصيل المطابقة',
        false,
        ['comp-match-create-score', 'comp-match-create-reason', 'comp-match-create-category', 'comp-match-create-sector'],
        [makeTransition('t-match-details-to-expiry', 'stage-match-details', 'stage-match-expiry', 1)],
      ),
      makeStage(
        'stage-match-expiry',
        'expiry',
        'Expiration',
        'انتهاء الصلاحية',
        true,
        ['comp-match-create-expires'],
        [],
      ),
    ],
    metadata: {
      name_en: 'Create Match',
      name_ar: 'إنشاء مطابقة',
      description: 'Create a new match between two organizations with score, reason, and expiration.',
      purpose: 'matching',
    },
    status: 'active',
  },
  componentTemplates: [
    makeComponentDef('match-create-org-a', 'select', 'field', 'Organization A', 'المنظمة أ', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Organization A is required', message_ar: 'المنظمة أ مطلوبة' },
    ], { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('match-create-org-b', 'select', 'field', 'Organization B', 'المنظمة ب', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Organization B is required', message_ar: 'المنظمة ب مطلوبة' },
    ], { type: 'entity', resource: 'organizations', displayField: 'name', valueField: 'id' }),
    makeComponentDef('match-create-score', 'number-input', 'field', 'Match Score (0-100)', 'درجة المطابقة', { type: 'number', minimum: 0, maximum: 100 }, {}, [
      { rule: 'required', message_en: 'Match score is required', message_ar: 'درجة المطابقة مطلوبة' },
    ]),
    makeComponentDef('match-create-reason', 'textarea', 'field', 'Match Reason', 'سبب المطابقة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Match reason is required', message_ar: 'سبب المطابقة مطلوب' },
    ]),
    makeComponentDef('match-create-category', 'select', 'field', 'Category', 'الفئة', { type: 'string' }, {}, [
      { rule: 'required', message_en: 'Category is required', message_ar: 'الفئة مطلوبة' },
    ], { type: 'reference', datasetSlug: 'match-categories' }),
    makeComponentDef('match-create-sector', 'select', 'field', 'Sector', 'القطاع', { type: 'string' }, {}, [],
      { type: 'reference', datasetSlug: 'sectors' }),
    makeComponentDef('match-create-expires', 'date', 'field', 'Expiration Date', 'تاريخ انتهاء الصلاحية', { type: 'string', format: 'date' }),
  ],
  pageConfig: {
    id: 'page-create-match',
    slug: 'create-match',
    title_en: 'Create Match',
    title_ar: 'إنشاء مطابقة',
    layout: 'single-column',
    sections: [
      { id: 'sec-match-orgs', title_en: 'Organizations', title_ar: 'المنظمات', componentInstanceIds: ['comp-match-create-org-a', 'comp-match-create-org-b'] },
      { id: 'sec-match-details', title_en: 'Match Details', title_ar: 'تفاصيل المطابقة', componentInstanceIds: ['comp-match-create-score', 'comp-match-create-reason', 'comp-match-create-category', 'comp-match-create-sector'] },
      { id: 'sec-match-expiry', title_en: 'Expiration', title_ar: 'انتهاء الصلاحية', componentInstanceIds: ['comp-match-create-expires'] },
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
  createOrganization,
  createContact,
  createEngagement,
  createTask,
  createMatch,
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
