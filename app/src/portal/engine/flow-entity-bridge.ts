/**
 * Flow-Entity Bridge
 *
 * Listens for `flow.completed` events on the engine event bus and automatically
 * creates real Mujarrad entities from the data collected during the flow.
 *
 * Each mapped flow slug has a config that describes which Mujarrad resource to
 * create and how to translate component slugs into entity field names.
 */

import { engineEventBus } from './event-bus';
import { getEntityLayer, getFlowEngine, getRegistry } from './hooks-internal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlowEntityConfig {
  /** Mujarrad resource to create (e.g. 'organizations') */
  resource: string;
  /** Map from component slug → entity field name */
  fieldMap: Record<string, string>;
  /** Default values to include in every created entity */
  defaults?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Flow → Entity mapping
// ---------------------------------------------------------------------------

const FLOW_ENTITY_MAP: Record<string, FlowEntityConfig> = {
  'create-organization': {
    resource: 'organizations',
    fieldMap: {
      'org-create-name': 'name',
      'org-create-type': 'type',
      'org-create-status': 'status',
      'org-create-country': 'country',
      'org-create-city': 'city',
      'org-create-website': 'website',
      'org-create-description': 'description',
      'org-create-tags': 'tags',
    },
    defaults: { status: 'prospect' },
  },
  'create-contact': {
    resource: 'contacts',
    fieldMap: {
      'contact-create-first': 'firstName',
      'contact-create-last': 'lastName',
      'contact-create-email': 'email',
      'contact-create-phone': 'phone',
      'contact-create-role': 'role',
      'contact-create-org': 'organizationId',
    },
  },
  'create-engagement': {
    resource: 'engagements',
    fieldMap: {
      'eng-create-title': 'title',
      'eng-create-org': 'organizationId',
      'eng-create-category': 'category',
      'eng-create-stage': 'stage',
      'eng-create-priority': 'priority',
      'eng-create-description': 'description',
      'eng-create-start': 'startDate',
      'eng-create-target': 'targetDate',
      'eng-create-value': 'value',
      'eng-create-tags': 'tags',
    },
    defaults: { stage: 'prospect', priority: 'medium', createdBy: 'user-1' },
  },
  'create-task': {
    resource: 'tasks',
    fieldMap: {
      'task-create-title': 'title',
      'task-create-description': 'description',
      'task-create-due': 'dueDate',
      'task-create-priority': 'priority',
      'task-create-org': 'organizationId',
      'task-create-engagement': 'engagementId',
    },
    defaults: { status: 'open', priority: 'medium' },
  },
  'create-match': {
    resource: 'matches',
    fieldMap: {
      'match-create-org-a': 'organizationAId',
      'match-create-org-b': 'organizationBId',
      'match-create-score': 'matchScore',
      'match-create-reason': 'matchReason',
      'match-create-category': 'category',
      'match-create-sector': 'sector',
      'match-create-expires': 'expiresAt',
    },
    defaults: { status: 'pending', suggestedBy: 'user-1' },
  },
};

// ---------------------------------------------------------------------------
// Bridge initializer
// ---------------------------------------------------------------------------

export function initializeFlowEntityBridge(): () => void {
  const unsubscribe = engineEventBus.subscribeToType(
    'flow.completed',
    async (event) => {
      try {
        // Get the flow definition to find its slug
        const flowEngine = getFlowEngine();
        const flow = await flowEngine.getFlow(event.flowId);
        if (!flow) return;

        const config = FLOW_ENTITY_MAP[flow.slug];
        if (!config) return; // Not a mapped flow — ignore

        // Get the session to access collected data
        const session = await flowEngine.getSession(event.sessionId);
        if (!session) return;

        // Flatten collected data: iterate all stages, collect all field values.
        // Keys in collectedData are stage IDs; values are Records keyed by
        // component instance/definition IDs.
        const flatData: Record<string, unknown> = {};
        for (const stageData of Object.values(session.collectedData)) {
          if (stageData && typeof stageData === 'object') {
            Object.assign(flatData, stageData as Record<string, unknown>);
          }
        }

        // Build a reverse map: definition ID → slug so we can resolve
        // instance/definition IDs back to the slugs used in the fieldMap.
        const registry = getRegistry();
        const allDefs = await registry.listDefinitions();
        const idToSlug = new Map<string, string>();
        for (const def of allDefs) {
          idToSlug.set(def.id, def.slug);
        }

        // Map flow field keys to entity fields
        const entityData: Record<string, unknown> = { ...config.defaults };

        for (const [key, value] of Object.entries(flatData)) {
          // Try direct slug match (if key IS a slug already)
          if (config.fieldMap[key]) {
            entityData[config.fieldMap[key]] = value;
            continue;
          }
          // Try resolving key as a definition ID
          const slug = idToSlug.get(key);
          if (slug && config.fieldMap[slug]) {
            entityData[config.fieldMap[slug]] = value;
            continue;
          }
        }

        // Skip if we have no data beyond defaults
        const defaultKeyCount = Object.keys(config.defaults ?? {}).length;
        if (Object.keys(entityData).length <= defaultKeyCount) {
          console.warn(
            `[FlowEntityBridge] No data mapped for flow "${flow.slug}"`,
          );
          return;
        }

        // Override defaults with userId from event
        if ('createdBy' in entityData || config.defaults?.createdBy) {
          entityData.createdBy = event.userId || entityData.createdBy;
        }
        if ('suggestedBy' in entityData || config.defaults?.suggestedBy) {
          entityData.suggestedBy = event.userId || entityData.suggestedBy;
        }

        // Create the entity
        const entityLayer = getEntityLayer();
        const created = await entityLayer.createEntity(
          config.resource,
          entityData,
        );

        console.log(
          `[FlowEntityBridge] Created ${config.resource} entity from flow "${flow.slug}":`,
          created.id,
        );

        // Log activity event (non-fatal)
        try {
          await entityLayer.createEntity('activity-events', {
            action: 'created',
            entityType: config.resource,
            entityId: created.id as string,
            performedBy: event.userId || 'system',
            source: `flow:${flow.slug}`,
            createdAt: new Date().toISOString(),
          });
        } catch {
          /* non-fatal */
        }
      } catch (err) {
        console.error(
          '[FlowEntityBridge] Failed to create entity from flow:',
          err,
        );
      }
    },
  );

  console.log(
    '[FlowEntityBridge] Initialized — listening for flow completions',
  );
  return unsubscribe;
}
