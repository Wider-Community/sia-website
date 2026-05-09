/**
 * Internal engine accessors — shared between hooks.ts and auth-middleware.ts.
 *
 * This module holds the singleton engine instances and their lazy accessors
 * so that both the public hooks and the middleware can reach the engines
 * without creating circular imports.
 */

import { ComponentResolver } from './component-resolver';
import { ComponentRegistry } from './component-registry';
import { FlowEngine } from './flow-engine';
import { NotificationEngine } from './notification-engine';
import { AuthorizationEngine } from './authorization';
import { NotificationPreferencesManager } from './notification-preferences';
import { SuggestionEngine } from './agentic-suggestions';
import { ReferenceDataManager } from './reference-data';
import type { EntityControlLayer } from '../lib/entity-control-layer';

// ---------------------------------------------------------------------------
// Singleton instances
// ---------------------------------------------------------------------------

let _entityLayer: EntityControlLayer | null = null;
let _resolver: ComponentResolver | null = null;
let _registry: ComponentRegistry | null = null;
let _flowEngine: FlowEngine | null = null;
let _notificationEngine: NotificationEngine | null = null;
let _authEngine: AuthorizationEngine | null = null;
let _notifPrefsManager: NotificationPreferencesManager | null = null;
let _suggestionEngine: SuggestionEngine | null = null;
let _referenceDataManager: ReferenceDataManager | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initializeEngineInternal(entityLayer: EntityControlLayer): void {
  _entityLayer = entityLayer;
  _registry = new ComponentRegistry(entityLayer);
  _resolver = new ComponentResolver(_registry);
  _flowEngine = new FlowEngine(entityLayer);
  _notificationEngine = new NotificationEngine(entityLayer);
  _notificationEngine.initialize();
  _authEngine = new AuthorizationEngine(entityLayer);
  _notifPrefsManager = new NotificationPreferencesManager(entityLayer);
  _suggestionEngine = new SuggestionEngine(entityLayer);
  _referenceDataManager = new ReferenceDataManager(entityLayer);
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

export function getResolver(): ComponentResolver {
  if (!_resolver) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _resolver;
}

export function getRegistry(): ComponentRegistry {
  if (!_registry) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _registry;
}

export function getFlowEngine(): FlowEngine {
  if (!_flowEngine) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _flowEngine;
}

export function getNotificationEngine(): NotificationEngine {
  if (!_notificationEngine) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _notificationEngine;
}

export function getAuthEngine(): AuthorizationEngine {
  if (!_authEngine) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _authEngine;
}

export function getNotifPrefsManager(): NotificationPreferencesManager {
  if (!_notifPrefsManager) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _notifPrefsManager;
}

export function getSuggestionEngine(): SuggestionEngine {
  if (!_suggestionEngine) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _suggestionEngine;
}

export function getReferenceDataManager(): ReferenceDataManager {
  if (!_referenceDataManager) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _referenceDataManager;
}

export function getEntityLayer(): EntityControlLayer {
  if (!_entityLayer) throw new Error('Engine not initialized. Call initializeEngine() in PortalApp.tsx.');
  return _entityLayer;
}
