/**
 * Dynamic Component Engine — React Hooks (Public API)
 *
 * These hooks are what pages consume to render dynamic components and flows.
 * They bridge the engine internals with React's rendering lifecycle.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  ResolvedComponent,
  FlowDefinition,
  FlowSession,
  StageDefinition,
  ComponentDefinition,
  NotificationDefinition,
  BranchCondition,
  BranchOperator,
  EngineRole,
  PermissionGrant,
  AuthorizationRequest,
  AuthorizationResult,
  NotificationChannel,
  NotificationPriority,
} from './types';
import { engineEventBus } from './event-bus';
import { definitionCache } from './cache-manager';
import { realtimeClient, type RealtimeConnectionMode } from './realtime-client';
import {
  initializeEngineInternal,
  getResolver,
  getRegistry,
  getFlowEngine,
  getNotificationEngine,
  getAuthEngine,
  getNotifPrefsManager,
  getSuggestionEngine,
  getReferenceDataManager,
  getReferenceDataRefresher,
  getEntityLayer,
} from './hooks-internal';
import type { ReferenceDataset } from './reference-data';
import type { DataSourceBinding } from './types';
import { ENTITY_REGISTRY } from '../lib/entity-registry';
import type { AgentSuggestion, SuggestionStatus, SuggestionType } from './agentic-suggestions';

// Re-export getAuthEngine so auth-middleware can import it directly
export { getAuthEngine } from './hooks-internal';

// Re-export refresher accessor so the control board can trigger manual refreshes.
export { getReferenceDataRefresher } from './hooks-internal';

/**
 * Initialize the engine with the entity control layer.
 * Call once at app startup (e.g., in PortalApp.tsx).
 */
export function initializeEngine(
  entityLayer: import('../lib/entity-control-layer').EntityControlLayer,
): void {
  initializeEngineInternal(entityLayer);
}

// ---------------------------------------------------------------------------
// useComponent — resolve a single component instance
// ---------------------------------------------------------------------------

interface UseComponentResult {
  resolved: ResolvedComponent | null;
  loading: boolean;
  error: Error | null;
}

export function useComponent(
  instanceId: string | null,
  locale: 'en' | 'ar' = 'en',
): UseComponentResult {
  const [resolved, setResolved] = useState<ResolvedComponent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!instanceId) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getResolver()
      .resolve(instanceId, locale)
      .then((result) => {
        if (!cancelled) {
          setResolved(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [instanceId, locale]);

  // Listen for definition updates via event bus
  useEffect(() => {
    if (!resolved) return;

    const unsub = engineEventBus.subscribeToType(
      'definition.updated',
      (event) => {
        if (event.nodeId === resolved.definitionId) {
          // Re-resolve on definition change
          getResolver()
            .resolve(resolved.instanceId, locale)
            .then(setResolved)
            .catch(console.error);
        }
      },
    );
    return unsub;
  }, [resolved?.definitionId, resolved?.instanceId, locale]);

  return { resolved, loading, error };
}

// ---------------------------------------------------------------------------
// useFlowStage — resolve all components for a stage
// ---------------------------------------------------------------------------

interface UseFlowStageResult {
  components: ResolvedComponent[];
  loading: boolean;
  error: Error | null;
}

export function useFlowStage(
  componentInstanceIds: string[],
  locale: 'en' | 'ar' = 'en',
): UseFlowStageResult {
  const [components, setComponents] = useState<ResolvedComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable reference for the IDs array
  const idsRef = useRef(componentInstanceIds);
  idsRef.current = componentInstanceIds;
  const idsKey = componentInstanceIds.join(',');

  useEffect(() => {
    if (!idsRef.current.length) {
      setComponents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getResolver()
      .resolveMany(idsRef.current, locale)
      .then((results) => {
        if (!cancelled) {
          setComponents(results);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useFlowStage] Resolution failed:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey, locale]);

  return { components, loading, error };
}

// ---------------------------------------------------------------------------
// useDynamicForm — form state management for a set of dynamic components
// ---------------------------------------------------------------------------

interface UseDynamicFormResult {
  components: ResolvedComponent[];
  values: Record<string, unknown>;
  errors: Record<string, string[]>;
  loading: boolean;
  setValue: (instanceId: string, value: unknown) => void;
  validate: () => boolean;
  getFormData: () => Record<string, unknown>;
  reset: () => void;
}

export function useDynamicForm(
  componentInstanceIds: string[],
  locale: 'en' | 'ar' = 'en',
  requiredComponentIds?: string[],
): UseDynamicFormResult {
  const { components, loading, error } = useFlowStage(
    componentInstanceIds,
    locale,
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Build a set of required component IDs for quick lookup
  const requiredSet = useMemo(
    () => new Set(requiredComponentIds ?? []),
    [requiredComponentIds],
  );

  const setValue = useCallback(
    (instanceId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [instanceId]: value }));
      // Clear errors for this field on change
      setErrors((prev) => {
        if (!prev[instanceId]) return prev;
        const next = { ...prev };
        delete next[instanceId];
        return next;
      });

      // Emit value change event
      const comp = components.find((c) => c.instanceId === instanceId);
      if (comp) {
        engineEventBus.emit({
          type: 'component.value_changed',
          componentId: comp.definitionId,
          instanceId,
          field: comp.i18n.label,
          oldValue: values[instanceId],
          newValue: value,
          userId: '', // filled by caller
        });
      }
    },
    [components, values],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string[]> = {};
    let valid = true;

    for (const comp of components) {
      const fieldErrors: string[] = [];
      const value = values[comp.instanceId];

      // Check stage-level required (from flow designer)
      const isStageRequired = requiredSet.has(comp.instanceId);
      if (isStageRequired) {
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          fieldErrors.push(`${comp.i18n.label} is required`);
        }
      }

      // Check definition-level validations
      for (const rule of comp.validations) {
        switch (rule.rule) {
          case 'required':
            if (
              value === undefined ||
              value === null ||
              value === '' ||
              (Array.isArray(value) && value.length === 0)
            ) {
              fieldErrors.push(rule.message_en);
            }
            break;
          case 'min':
            if (typeof value === 'number' && value < (rule.value as number)) {
              fieldErrors.push(rule.message_en);
            }
            break;
          case 'max':
            if (typeof value === 'number' && value > (rule.value as number)) {
              fieldErrors.push(rule.message_en);
            }
            break;
          case 'pattern':
            if (
              typeof value === 'string' &&
              !new RegExp(rule.value as string).test(value)
            ) {
              fieldErrors.push(rule.message_en);
            }
            break;
        }
      }

      if (fieldErrors.length > 0) {
        newErrors[comp.instanceId] = fieldErrors;
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  }, [components, values, requiredSet]);

  const getFormData = useCallback((): Record<string, unknown> => {
    return { ...values };
  }, [values]);

  const reset = useCallback(() => {
    setValues({});
    setErrors({});
  }, []);

  return {
    components,
    values,
    errors,
    loading,
    setValue,
    validate,
    getFormData,
    reset,
  };
}

// ---------------------------------------------------------------------------
// useComponentRegistry — admin CRUD for definitions
// ---------------------------------------------------------------------------

interface UseComponentRegistryResult {
  definitions: ComponentDefinition[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createDefinition: (
    def: Omit<ComponentDefinition, 'id' | 'nodeType' | 'version'>,
  ) => Promise<ComponentDefinition>;
  updateDefinition: (
    id: string,
    updates: Partial<ComponentDefinition>,
  ) => Promise<ComponentDefinition>;
  deleteDefinition: (id: string) => Promise<void>;
}

export function useComponentRegistry(filters?: {
  category?: string;
  status?: string;
}): UseComponentRegistryResult {
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRegistry()
      .listDefinitions(filters)
      .then((defs) => {
        if (!cancelled) {
          setDefinitions(defs);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters?.category, filters?.status, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createDefinition = useCallback(
    async (
      def: Omit<ComponentDefinition, 'id' | 'nodeType' | 'version'>,
    ) => {
      const created = await getRegistry().createDefinition(def);
      refresh();
      engineEventBus.emit({ type: 'definition.created', nodeId: created.id });
      return created;
    },
    [refresh],
  );

  const updateDefinition = useCallback(
    async (id: string, updates: Partial<ComponentDefinition>) => {
      const updated = await getRegistry().updateDefinition(id, updates);
      definitionCache.invalidate(id);
      refresh();
      engineEventBus.emit({
        type: 'definition.updated',
        nodeId: id,
        version: updated.version,
      });
      return updated;
    },
    [refresh],
  );

  const deleteDefinition = useCallback(
    async (id: string) => {
      await getRegistry().deleteDefinition(id);
      definitionCache.invalidate(id);
      refresh();
      engineEventBus.emit({ type: 'definition.deleted', nodeId: id });
    },
    [refresh],
  );

  return {
    definitions,
    loading,
    error,
    refresh,
    createDefinition,
    updateDefinition,
    deleteDefinition,
  };
}

// ---------------------------------------------------------------------------
// Branch evaluation utility (used by flow orchestration)
// ---------------------------------------------------------------------------

export function evaluateCondition(
  condition: BranchCondition,
  data: Record<string, unknown>,
): boolean {
  const value = getNestedValue(data, condition.field);
  const target = condition.value;

  switch (condition.operator) {
    case 'eq':
      return value === target;
    case 'neq':
      return value !== target;
    case 'gt':
      return typeof value === 'number' && value > (target as number);
    case 'lt':
      return typeof value === 'number' && value < (target as number);
    case 'gte':
      return typeof value === 'number' && value >= (target as number);
    case 'lte':
      return typeof value === 'number' && value <= (target as number);
    case 'in':
      return Array.isArray(target) && target.includes(value);
    case 'nin':
      return Array.isArray(target) && !target.includes(value);
    case 'contains':
      if (typeof value === 'string')
        return value.includes(String(target));
      if (Array.isArray(value)) return value.includes(target);
      return false;
    case 'matches':
      return (
        typeof value === 'string' &&
        new RegExp(String(target)).test(value)
      );
    case 'exists':
      return value !== undefined && value !== null;
    default:
      return false;
  }
}

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// useReferenceData — fetch a reference dataset by slug
// ---------------------------------------------------------------------------

interface UseReferenceDataResult {
  dataset: ReferenceDataset | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useReferenceData(datasetSlug: string | undefined): UseReferenceDataResult {
  const [dataset, setDataset] = useState<ReferenceDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!datasetSlug) { setDataset(null); return; }
    let cancelled = false;
    setLoading(true);
    getReferenceDataManager()
      .getDataset(datasetSlug)
      .then((d) => { if (!cancelled) { setDataset(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [datasetSlug, refreshKey]);

  const refresh = useCallback(() => {
    if (datasetSlug) getReferenceDataManager().invalidateCache(datasetSlug);
    setRefreshKey((k) => k + 1);
  }, [datasetSlug]);

  return { dataset, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useReferenceDatasets — list all available datasets
// ---------------------------------------------------------------------------

export function useReferenceDatasets(): { datasets: ReferenceDataset[]; loading: boolean } {
  const [datasets, setDatasets] = useState<ReferenceDataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getReferenceDataManager()
      .listDatasets()
      .then((d) => { if (!cancelled) setDatasets(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { datasets, loading };
}

// ---------------------------------------------------------------------------
// useEntityResources — list all available entity registry keys
// ---------------------------------------------------------------------------

export function useEntityResources(): { resources: Array<{ key: string; titleField: string }> } {
  return useMemo(() => ({
    resources: Object.entries(ENTITY_REGISTRY).map(([key, def]) => ({
      key,
      titleField: def.titleField,
    })),
  }), []);
}

// ---------------------------------------------------------------------------
// useDataSource — resolve options from a DataSourceBinding
// ---------------------------------------------------------------------------

interface DataSourceOption {
  value: string;
  label: string;
}

interface UseDataSourceResult {
  options: DataSourceOption[];
  loading: boolean;
}

export function useDataSource(binding?: DataSourceBinding): UseDataSourceResult {
  const [options, setOptions] = useState<DataSourceOption[]>([]);
  const [loading, setLoading] = useState(false);

  const bindingKey = binding ? `${binding.type}:${binding.datasetSlug ?? ''}:${binding.resource ?? ''}:${binding.displayField ?? ''}` : '';

  useEffect(() => {
    if (!binding || binding.type === 'none') {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (binding.type === 'reference' && binding.datasetSlug) {
      getReferenceDataManager()
        .getDataset(binding.datasetSlug)
        .then((dataset) => {
          if (!cancelled && dataset) {
            setOptions(dataset.entries.map((e) => ({ value: e.value, label: e.label_en })));
          }
          if (!cancelled) setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    } else if (binding.type === 'entity' && binding.resource) {
      const entityLayer = getEntityLayer();
      const filters = binding.filters?.map((f) => ({
        field: f.field,
        operator: f.operator as 'eq',
        value: f.value as string,
      }));
      entityLayer
        .listEntities(binding.resource, { filters })
        .then((result) => {
          if (!cancelled) {
            const displayField = binding.displayField ?? ENTITY_REGISTRY[binding.resource!]?.titleField ?? 'id';
            const valueField = binding.valueField ?? 'id';
            setOptions(
              result.data.map((record) => ({
                value: String((record as Record<string, unknown>)[valueField] ?? record.id),
                label: String((record as Record<string, unknown>)[displayField] ?? record.id),
              })),
            );
            setLoading(false);
          }
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [bindingKey]);

  return { options, loading };
}

// ---------------------------------------------------------------------------
// useFlowEngine — flow CRUD + session management
// ---------------------------------------------------------------------------

interface UseFlowEngineResult {
  flows: FlowDefinition[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createFlow: (flow: Omit<FlowDefinition, 'id' | 'nodeType' | 'version'>) => Promise<FlowDefinition>;
  updateFlow: (id: string, updates: Partial<FlowDefinition>) => Promise<FlowDefinition>;
  deleteFlow: (id: string) => Promise<void>;
  listSessions: (flowId: string, filters?: { status?: string }) => Promise<FlowSession[]>;
  startSession: (flowId: string, userId: string) => Promise<FlowSession>;
  submitStage: (sessionId: string, data: Record<string, unknown>) => Promise<{ nextStageId: string | null; session: FlowSession }>;
  goBack: (sessionId: string) => Promise<FlowSession>;
}

export function useFlowEngine(filters?: { status?: string }): UseFlowEngineResult {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFlowEngine()
      .listFlows(filters)
      .then((f) => { if (!cancelled) { setFlows(f); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filters?.status, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createFlow = useCallback(async (flow: Omit<FlowDefinition, 'id' | 'nodeType' | 'version'>) => {
    const created = await getFlowEngine().createFlow(flow);
    refresh();
    return created;
  }, [refresh]);

  const updateFlow = useCallback(async (id: string, updates: Partial<FlowDefinition>) => {
    const updated = await getFlowEngine().updateFlow(id, updates);
    refresh();
    engineEventBus.emit({ type: 'flow.restructured', flowId: id, version: updated.version });
    return updated;
  }, [refresh]);

  const deleteFlow = useCallback(async (id: string) => {
    await getFlowEngine().deleteFlow(id);
    refresh();
  }, [refresh]);

  const listSessions = useCallback(async (flowId: string, sessionFilters?: { status?: string }) => {
    return getFlowEngine().listSessions(flowId, sessionFilters);
  }, []);

  const startSession = useCallback(async (flowId: string, userId: string) => {
    return getFlowEngine().startSession(flowId, userId);
  }, []);

  const submitStage = useCallback(async (sessionId: string, data: Record<string, unknown>) => {
    return getFlowEngine().submitStage(sessionId, data);
  }, []);

  const goBack = useCallback(async (sessionId: string) => {
    return getFlowEngine().goBack(sessionId);
  }, []);

  return { flows, loading, error, refresh, createFlow, updateFlow, deleteFlow, listSessions, startSession, submitStage, goBack };
}

// ---------------------------------------------------------------------------
// useNotificationEngine — notification definition CRUD
// ---------------------------------------------------------------------------

interface UseNotificationEngineResult {
  definitions: NotificationDefinition[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createDefinition: (def: Omit<NotificationDefinition, 'id' | 'nodeType' | 'version'>) => Promise<NotificationDefinition>;
  updateDefinition: (id: string, updates: Partial<NotificationDefinition>) => Promise<NotificationDefinition>;
  deleteDefinition: (id: string) => Promise<void>;
}

export function useNotificationEngine(): UseNotificationEngineResult {
  const [definitions, setDefinitions] = useState<NotificationDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getNotificationEngine()
      .listDefinitions()
      .then((d) => { if (!cancelled) { setDefinitions(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createDefinition = useCallback(async (def: Omit<NotificationDefinition, 'id' | 'nodeType' | 'version'>) => {
    const created = await getNotificationEngine().createDefinition(def);
    refresh();
    return created;
  }, [refresh]);

  const updateDefinition = useCallback(async (id: string, updates: Partial<NotificationDefinition>) => {
    const updated = await getNotificationEngine().updateDefinition(id, updates);
    refresh();
    return updated;
  }, [refresh]);

  const deleteDefinition = useCallback(async (id: string) => {
    await getNotificationEngine().deleteDefinition(id);
    refresh();
  }, [refresh]);

  return { definitions, loading, error, refresh, createDefinition, updateDefinition, deleteDefinition };
}

// ---------------------------------------------------------------------------
// useAuthorization — permission checks + management
// ---------------------------------------------------------------------------

interface UseAuthorizationResult {
  authorize: (request: AuthorizationRequest) => Promise<AuthorizationResult>;
  grantPermission: (grant: Omit<PermissionGrant, 'id' | 'nodeType'>) => Promise<PermissionGrant>;
  revokePermission: (grantId: string) => Promise<void>;
  getPermissionsForUser: (userId: string) => Promise<PermissionGrant[]>;
  assignRole: (userId: string, role: EngineRole) => Promise<void>;
  getUserRoles: (userId: string) => Promise<EngineRole[]>;
  removeRole: (userId: string, role: EngineRole) => Promise<void>;
}

export function useAuthorization(): UseAuthorizationResult {
  const authorize = useCallback(async (request: AuthorizationRequest) => {
    return getAuthEngine().authorize(request);
  }, []);

  const grantPermission = useCallback(async (grant: Omit<PermissionGrant, 'id' | 'nodeType'>) => {
    return getAuthEngine().grantPermission(grant);
  }, []);

  const revokePermission = useCallback(async (grantId: string) => {
    return getAuthEngine().revokePermission(grantId);
  }, []);

  const getPermissionsForUser = useCallback(async (userId: string) => {
    return getAuthEngine().getPermissionsForUser(userId);
  }, []);

  const assignRole = useCallback(async (userId: string, role: EngineRole) => {
    return getAuthEngine().assignRole(userId, role);
  }, []);

  const getUserRoles = useCallback(async (userId: string) => {
    return getAuthEngine().getUserRoles(userId);
  }, []);

  const removeRole = useCallback(async (userId: string, role: EngineRole) => {
    return getAuthEngine().removeRole(userId, role);
  }, []);

  return { authorize, grantPermission, revokePermission, getPermissionsForUser, assignRole, getUserRoles, removeRole };
}

// ---------------------------------------------------------------------------
// useRealtimeStatus — connection status for the real-time client
// ---------------------------------------------------------------------------

export interface RealtimeStatus {
  connected: boolean;
  mode: RealtimeConnectionMode;
}

/**
 * Returns the current real-time connection status.
 * Re-renders when the connection state changes.
 */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>({
    connected: realtimeClient.connected,
    mode: realtimeClient.mode,
  });

  useEffect(() => {
    const unsubConnection = realtimeClient.onConnectionChange(() => {
      setStatus({
        connected: realtimeClient.connected,
        mode: realtimeClient.mode,
      });
    });

    const unsubMode = realtimeClient.onModeChange(() => {
      setStatus({
        connected: realtimeClient.connected,
        mode: realtimeClient.mode,
      });
    });

    return () => {
      unsubConnection();
      unsubMode();
    };
  }, []);

  return status;
}

// ---------------------------------------------------------------------------
// useSuggestions — agentic suggestions CRUD
// ---------------------------------------------------------------------------

interface UseSuggestionsResult {
  suggestions: AgentSuggestion[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  propose: (suggestion: Omit<AgentSuggestion, 'id' | 'status' | 'createdAt'>) => Promise<AgentSuggestion>;
  approve: (id: string) => Promise<AgentSuggestion>;
  reject: (id: string) => Promise<AgentSuggestion>;
}

export function useSuggestions(filters?: {
  status?: SuggestionStatus;
  type?: SuggestionType;
}): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSuggestionEngine()
      .listSuggestions(filters)
      .then((s) => { if (!cancelled) { setSuggestions(s); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filters?.status, filters?.type, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const propose = useCallback(async (suggestion: Omit<AgentSuggestion, 'id' | 'status' | 'createdAt'>) => {
    const created = await getSuggestionEngine().proposeSuggestion(suggestion);
    refresh();
    return created;
  }, [refresh]);

  const approve = useCallback(async (id: string) => {
    const approved = await getSuggestionEngine().approveSuggestion(id);
    refresh();
    return approved;
  }, [refresh]);

  const reject = useCallback(async (id: string) => {
    const rejected = await getSuggestionEngine().rejectSuggestion(id);
    refresh();
    return rejected;
  }, [refresh]);

  return { suggestions, loading, error, refresh, propose, approve, reject };
}

// ---------------------------------------------------------------------------
// useNotificationPreferences — per-user notification channel preferences
// ---------------------------------------------------------------------------

import type { NotificationPreferences } from './notification-preferences';

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<Omit<NotificationPreferences, 'id' | 'userId'>>) => Promise<void>;
  toggleCategoryChannel: (category: string, channel: NotificationChannel, enabled: boolean) => Promise<void>;
  updateCategoryPriority: (category: string, priority: NotificationPriority) => Promise<void>;
}

export function useNotificationPreferences(userId: string): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    getNotifPrefsManager()
      .getOrCreatePreferences(userId)
      .then((prefs) => {
        if (!cancelled) {
          setPreferences(prefs);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'id' | 'userId'>>,
  ) => {
    if (!preferences) return;
    setSaving(true);
    try {
      const updated = await getNotifPrefsManager().updatePreferences(preferences.id, updates);
      setPreferences(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  const toggleCategoryChannel = useCallback(async (
    category: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) => {
    if (!preferences) return;
    setSaving(true);
    try {
      const updated = await getNotifPrefsManager().toggleCategoryChannel(
        preferences.id,
        preferences,
        category,
        channel,
        enabled,
      );
      setPreferences(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  const updateCategoryPriority = useCallback(async (
    category: string,
    priority: NotificationPriority,
  ) => {
    if (!preferences) return;
    setSaving(true);
    try {
      const categories = preferences.categories.map((cat) =>
        cat.category === category ? { ...cat, minimumPriority: priority } : cat,
      );
      const updated = await getNotifPrefsManager().updatePreferences(
        preferences.id,
        { categories },
      );
      setPreferences(updated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  return { preferences, loading, saving, error, updatePreferences, toggleCategoryChannel, updateCategoryPriority };
}
