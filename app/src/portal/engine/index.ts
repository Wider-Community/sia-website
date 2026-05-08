/**
 * Dynamic Component Engine — Public API
 *
 * This barrel file exports everything consumers need from the engine.
 */

// Types (re-export all)
export type {
  ComponentDefinition,
  ComponentInstance,
  ComponentCategory,
  ComponentPlacement,
  ResolvedComponent,
  DynamicComponentProps,
  ValidationRule,
  I18nLabels,
  JSONSchema7,
  FlowDefinition,
  FlowMetadata,
  StageDefinition,
  StageMetadata,
  TransitionEdge,
  BranchCondition,
  BranchOperator,
  BranchRule,
  FlowSession,
  FlowSessionStatus,
  NotificationDefinition,
  NotificationTrigger,
  NotificationTriggerType,
  NotificationChannel,
  NotificationPriority,
  MessageTemplate,
  ChannelConfig,
  RecipientRule,
  EscalationConfig,
  EscalationLevel,
  EngineRole,
  PermissionAction,
  PermissionRelationship,
  PermissionResourceType,
  PermissionScope,
  PermissionGrant,
  AuthorizationRequest,
  AuthorizationResult,
  EngineEvent,
  EngineEventType,
  MatchDimension,
  FilterDimension,
  FilterOperator,
  FilterState,
  DiscoveredSchema,
  DiscoveredField,
  RendererEntry,
  CacheEntry,
  CacheStats,
} from './types';

// Engine initialization
export { initializeEngine } from './hooks';

// React hooks (public API for pages)
export {
  useComponent,
  useFlowStage,
  useDynamicForm,
  useComponentRegistry,
  useFlowEngine,
  useNotificationEngine,
  useAuthorization,
  evaluateCondition,
} from './hooks';

// Registries & managers
export { rendererRegistry } from './renderer-registry';
export { ComponentRegistry } from './component-registry';
export { ComponentResolver } from './component-resolver';
export { FlowEngine } from './flow-engine';
export { NotificationEngine } from './notification-engine';
export { AuthorizationEngine } from './authorization';
export { engineEventBus } from './event-bus';
export { definitionCache, instanceCache, CacheManager } from './cache-manager';

// Schema-adaptive
export {
  inferRenderer,
  resolveRendererForSchema,
  deriveFilterDimensions,
} from './schema-adaptive';

// Built-in renderers
export { BUILT_IN_RENDERERS } from './renderers/index.js';
