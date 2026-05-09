/**
 * Dynamic Component Engine — Core Type Definitions
 *
 * These types define the shared contract for all engine modules.
 * They mirror the Mujarrad node schemas defined in the R&D data models.
 */

// ---------------------------------------------------------------------------
// JSON Schema (subset of JSON Schema 7 used by the engine)
// ---------------------------------------------------------------------------

export interface JSONSchema7 {
  type?: string | string[];
  properties?: Record<string, JSONSchema7>;
  items?: JSONSchema7;
  required?: string[];
  enum?: unknown[];
  format?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchema7;
  oneOf?: JSONSchema7[];
  anyOf?: JSONSchema7[];
  allOf?: JSONSchema7[];
  title?: string;
}

// ---------------------------------------------------------------------------
// Component Definitions (TEMPLATE nodes — blueprints)
// ---------------------------------------------------------------------------

export type ComponentCategory =
  | 'field'
  | 'composite'
  | 'layout'
  | 'action'
  | 'navigation';

export interface ValidationRule {
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message_en: string;
  message_ar: string;
}

// ---------------------------------------------------------------------------
// Data Source Binding
// ---------------------------------------------------------------------------

export interface DataSourceBinding {
  /** 'none' = static options from defaultConfig, 'reference' = system reference dataset, 'entity' = live Mujarrad resource */
  type: 'none' | 'reference' | 'entity';
  /** For type 'reference': slug of the reference dataset (e.g. 'countries', 'sectors') */
  datasetSlug?: string;
  /** For type 'entity': resource key from ENTITY_REGISTRY (e.g. 'organizations', 'contacts') */
  resource?: string;
  /** For type 'entity': which field to display as the option label */
  displayField?: string;
  /** For type 'entity': which field to use as the option value (default: 'id') */
  valueField?: string;
  /** Optional static filters to narrow the dataset */
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

export interface I18nLabels {
  label: string;
  placeholder?: string;
  helpText?: string;
}

export interface ComponentDefinition {
  id: string;
  nodeType: 'TEMPLATE';
  category: ComponentCategory;
  slug: string;
  renderer: string;
  dataSchema: JSONSchema7;
  defaultConfig: Record<string, unknown>;
  validations: ValidationRule[];
  i18n: {
    en: I18nLabels;
    ar: I18nLabels;
  };
  composedOf?: string[];
  dataSource?: DataSourceBinding;
  version: number;
  status: 'draft' | 'published' | 'deprecated';
}

// ---------------------------------------------------------------------------
// Component Instances (REGULAR nodes — placed in stages)
// ---------------------------------------------------------------------------

export interface ComponentPlacement {
  flowId: string;
  stageId: string;
  order: number;
}

export interface VisibilityCondition {
  conditions: BranchCondition[];
  logic: 'AND' | 'OR';
}

export interface ComponentInstance {
  id: string;
  nodeType: 'REGULAR';
  definitionId: string;
  configOverrides: Record<string, unknown>;
  i18nOverrides?: {
    en?: Partial<I18nLabels>;
    ar?: Partial<I18nLabels>;
  };
  placement: ComponentPlacement;
  visibility?: VisibilityCondition;
}

// ---------------------------------------------------------------------------
// Resolved Component (output of the resolver pipeline)
// ---------------------------------------------------------------------------

export interface ResolvedComponent {
  Component: React.ComponentType<DynamicComponentProps>;
  config: Record<string, unknown>;
  validations: ValidationRule[];
  i18n: I18nLabels;
  dataSchema: JSONSchema7;
  definitionId: string;
  instanceId: string;
}

export interface DynamicComponentProps {
  instanceId: string;
  config: Record<string, unknown>;
  validations: ValidationRule[];
  i18n: I18nLabels;
  value: unknown;
  onChange: (value: unknown) => void;
  onAction?: (action: string, payload?: unknown) => void;
  errors?: string[];
  disabled?: boolean;
  locale: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Flow Definitions (TEMPLATE nodes — multi-stage journeys)
// ---------------------------------------------------------------------------

export interface FlowMetadata {
  name_en: string;
  name_ar: string;
  description?: string;
  owner?: string;
  purpose?: string;
}

export interface FlowDefinition {
  id: string;
  nodeType: 'TEMPLATE';
  slug: string;
  entryStageId: string;
  stages: StageDefinition[];
  entryConditions?: BranchRule[];
  metadata: FlowMetadata;
  version: number;
  status: 'draft' | 'active' | 'archived';
}

// ---------------------------------------------------------------------------
// Stage Definitions (TEMPLATE nodes — steps within a flow)
// ---------------------------------------------------------------------------

export interface StageMetadata {
  label_en: string;
  label_ar: string;
  description?: string;
  icon?: string;
}

export interface StageDefinition {
  id: string;
  slug: string;
  metadata: StageMetadata;
  isTerminal: boolean;
  componentOrder: string[];
  /** Component IDs that must be filled before the stage can advance */
  requiredComponents?: string[];
  transitions: TransitionEdge[];
}

// ---------------------------------------------------------------------------
// Transitions & Branching
// ---------------------------------------------------------------------------

export interface TransitionEdge {
  id: string;
  fromStageId: string;
  toStageId: string;
  conditions: BranchCondition[];
  logic: 'AND' | 'OR';
  priority: number;
}

export type BranchOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'nin'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'matches'
  | 'exists';

export interface BranchCondition {
  field: string;
  operator: BranchOperator;
  value: unknown;
}

export interface BranchRule {
  id: string;
  conditions: BranchCondition[];
  logic: 'AND' | 'OR';
  targetStageId: string;
  priority: number;
}

// ---------------------------------------------------------------------------
// Flow Sessions (CONTEXT nodes — user progress)
// ---------------------------------------------------------------------------

export type FlowSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'abandoned';

export interface FlowSession {
  id: string;
  nodeType: 'CONTEXT';
  flowId: string;
  flowVersion: number;
  userId: string;
  currentStageId: string;
  visitedStages: string[];
  collectedData: Record<string, Record<string, unknown>>;
  status: FlowSessionStatus;
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Notification Definitions (TEMPLATE nodes)
// ---------------------------------------------------------------------------

export type NotificationTriggerType =
  | 'flow.started'
  | 'flow.completed'
  | 'stage.entered'
  | 'stage.submitted'
  | 'component.value_changed'
  | 'branch.selected'
  | 'match.discovered'
  | 'data.threshold_breached'
  | 'schedule';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'push'
  | 'sms'
  | 'webhook'
  | 'slack';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface NotificationTrigger {
  eventType: NotificationTriggerType;
  source: {
    flowId?: string;
    stageId?: string;
    componentId?: string;
  };
  filter?: BranchCondition[];
}

export interface MessageTemplate {
  subject?: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  config: Record<string, unknown>;
  templateOverride?: MessageTemplate;
  fallback?: NotificationChannel;
}

export interface RecipientRule {
  type: 'role' | 'user' | 'relationship' | 'dynamic';
  roles?: string[];
  userIds?: string[];
  relationship?: string;
  dynamicResolver?: string;
}

export interface EscalationLevel {
  level: number;
  recipientRule: RecipientRule;
  channelOverride?: NotificationChannel;
  templateOverride?: MessageTemplate;
}

export interface EscalationConfig {
  timeout: number;
  maxEscalations: number;
  escalationChain: EscalationLevel[];
}

export interface NotificationDefinition {
  id: string;
  nodeType: 'TEMPLATE';
  slug: string;
  trigger: NotificationTrigger;
  channels: ChannelConfig[];
  template: {
    en: MessageTemplate;
    ar: MessageTemplate;
  };
  recipients: RecipientRule;
  escalation?: EscalationConfig;
  cooldown?: number;
  enabled: boolean;
  priority: NotificationPriority;
  version: number;
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export type EngineRole =
  | 'engine_superadmin'
  | 'engine_architect'
  | 'engine_operator'
  | 'engine_publisher'
  | 'engine_viewer'
  | 'engine_analyst'
  | 'flow_owner'
  | 'corridor_admin';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'publish'
  | 'attach'
  | 'configure';

export type PermissionRelationship =
  | 'owns'
  | 'can_edit'
  | 'can_configure'
  | 'can_view'
  | 'can_publish'
  | 'can_attach_notifications'
  | 'delegates_to';

export type PermissionResourceType =
  | 'component_definition'
  | 'flow_definition'
  | 'stage_definition'
  | 'notification_definition'
  | 'corridor'
  | 'control_board';

export interface PermissionScope {
  corridor?: string;
  componentCategory?: ComponentCategory;
  notificationPriority?: NotificationPriority;
}

export interface PermissionGrant {
  id: string;
  nodeType: 'REGULAR';
  subjectType: 'user' | 'role' | 'team';
  subjectId: string;
  permission: PermissionRelationship;
  resourceType: PermissionResourceType;
  resourceId: string;
  scope?: PermissionScope;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  conditions?: BranchCondition[];
}

export interface AuthorizationRequest {
  userId: string;
  action: PermissionAction;
  resourceType: PermissionResourceType;
  resourceId: string;
  context?: Record<string, unknown>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  effectivePermissions?: PermissionRelationship[];
  auditId: string;
}

// ---------------------------------------------------------------------------
// Engine Events (Event Bus)
// ---------------------------------------------------------------------------

export type EngineEvent =
  // Flow events
  | { type: 'flow.started'; flowId: string; sessionId: string; userId: string }
  | { type: 'flow.completed'; flowId: string; sessionId: string; userId: string; data: Record<string, unknown> }
  | { type: 'flow.abandoned'; flowId: string; sessionId: string; userId: string; lastStageId: string }
  // Stage events
  | { type: 'stage.entered'; flowId: string; stageId: string; sessionId: string; userId: string }
  | { type: 'stage.submitted'; flowId: string; stageId: string; sessionId: string; data: Record<string, unknown> }
  | { type: 'stage.skipped'; flowId: string; stageId: string; sessionId: string; reason: string }
  // Component events
  | { type: 'component.value_changed'; componentId: string; instanceId: string; field: string; oldValue: unknown; newValue: unknown; userId: string }
  | { type: 'component.action_triggered'; componentId: string; instanceId: string; action: string; payload?: unknown }
  // Branch events
  | { type: 'branch.selected'; flowId: string; fromStageId: string; toStageId: string; conditions: Record<string, unknown> }
  // Match events
  | { type: 'match.discovered'; orgAId: string; orgBId: string; dimensions: MatchDimension[]; score: number }
  | { type: 'match.accepted'; matchId: string; acceptedBy: string }
  | { type: 'match.rejected'; matchId: string; rejectedBy: string; reason: string }
  // Data events
  | { type: 'data.extracted'; nodeId: string; schemaDiscovered: boolean; fields: string[] }
  | { type: 'data.threshold_breached'; nodeId: string; field: string; value: number; threshold: number; direction: 'above' | 'below' }
  // Definition events (Control Board → clients)
  | { type: 'definition.updated'; nodeId: string; version: number }
  | { type: 'definition.created'; nodeId: string }
  | { type: 'definition.deleted'; nodeId: string }
  | { type: 'flow.restructured'; flowId: string; version: number }
  // Notification meta-events
  | { type: 'notification.delivered'; notificationId: string; channel: NotificationChannel; recipientId: string }
  | { type: 'notification.acknowledged'; notificationId: string; recipientId: string }
  | { type: 'notification.escalated'; notificationId: string; level: number };

export type EngineEventType = EngineEvent['type'];

export interface MatchDimension {
  dimensionName: string;
  orgAValue: unknown;
  orgBValue: unknown;
  alignmentScore: number;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Filter Engine
// ---------------------------------------------------------------------------

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'between'
  | 'contains'
  | 'overlaps'
  | 'all_of'
  | 'matches'
  | 'exists';

export interface FilterDimension {
  field: string;
  label_en: string;
  label_ar: string;
  operators: FilterOperator[];
  inputType: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'range' | 'toggle';
  options?: { value: unknown; label_en: string; label_ar: string }[];
}

export interface FilterState {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Discovered Schema (ASSUMPTION nodes — from data extraction)
// ---------------------------------------------------------------------------

export interface DiscoveredField {
  name: string;
  inferredType: string;
  confidence: number;
  sampleValues: unknown[];
  suggestedRenderer?: string;
  suggestedAsMatchDimension: boolean;
}

export interface DiscoveredSchema {
  id: string;
  nodeType: 'ASSUMPTION';
  sourceDocumentId: string;
  extractedFields: DiscoveredField[];
  overallConfidence: number;
  status: 'pending_review' | 'approved' | 'rejected' | 'promoted';
  reviewedBy?: string;
  promotedDefinitionIds?: string[];
}

// ---------------------------------------------------------------------------
// Renderer Registry
// ---------------------------------------------------------------------------

export type RendererEntry = {
  key: string;
  component: React.LazyExoticComponent<React.ComponentType<DynamicComponentProps>> | React.ComponentType<DynamicComponentProps>;
  schemaTypes?: string[];
};

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  data: T;
  version: number;
  cachedAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}
