/**
 * Dynamic Component Engine — Notification Bridge
 *
 * Connects engine events to the portal's notification system:
 * 1. Shows sonner toasts for in-app notifications
 * 2. Persists all important engine events as alerts in Mujarrad
 *    so they appear in the navbar NotificationCenter bell icon.
 */

import { toast } from 'sonner';
import { engineEventBus } from './event-bus';
import { getNotificationEngine, getEntityLayer } from './hooks-internal';
import type { EngineEvent } from './types';

// ---------------------------------------------------------------------------
// Event → Alert mapping
// ---------------------------------------------------------------------------

interface AlertInfo {
  type: 'info' | 'at_risk' | 'overdue';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

function eventToAlert(event: EngineEvent): AlertInfo | null {
  switch (event.type) {
    case 'flow.started':
      return {
        type: 'info',
        title: 'Flow started',
        message: `User ${event.userId} started flow ${event.flowId}.`,
        entityType: 'flow',
        entityId: event.flowId,
      };
    case 'flow.completed':
      return {
        type: 'info',
        title: 'Flow completed',
        message: `User ${event.userId} completed flow ${event.flowId}.`,
        entityType: 'flow',
        entityId: event.flowId,
      };
    case 'flow.abandoned':
      return {
        type: 'at_risk',
        title: 'Flow abandoned',
        message: `User ${event.userId} abandoned flow ${event.flowId}.`,
        entityType: 'flow',
        entityId: event.flowId,
      };
    case 'stage.submitted':
      return {
        type: 'info',
        title: 'Stage submitted',
        message: `Stage ${event.stageId} submitted in flow ${event.flowId}.`,
        entityType: 'flow',
        entityId: event.flowId,
      };
    case 'match.discovered':
      return {
        type: 'info',
        title: 'New match discovered',
        message: `Match found: ${event.matchId}.`,
        entityType: 'match',
        entityId: event.matchId,
      };
    case 'match.accepted':
      return {
        type: 'info',
        title: 'Match accepted',
        message: `Match ${event.matchId} was accepted by ${event.userId}.`,
        entityType: 'match',
        entityId: event.matchId,
      };
    case 'match.rejected':
      return {
        type: 'at_risk',
        title: 'Match rejected',
        message: `Match ${event.matchId} was rejected by ${event.userId}.`,
        entityType: 'match',
        entityId: event.matchId,
      };
    case 'definition.created':
      return {
        type: 'info',
        title: 'Component created',
        message: `New component definition created: ${event.definitionId}.`,
        entityType: 'component-definition',
        entityId: event.definitionId,
      };
    case 'definition.updated':
      return {
        type: 'info',
        title: 'Component updated',
        message: `Component definition updated: ${event.definitionId}.`,
        entityType: 'component-definition',
        entityId: event.definitionId,
      };
    case 'definition.deleted':
      return {
        type: 'at_risk',
        title: 'Component deleted',
        message: `Component definition deleted: ${event.definitionId}.`,
        entityType: 'component-definition',
        entityId: event.definitionId,
      };
    case 'data.threshold_breached':
      return {
        type: 'overdue',
        title: 'Threshold breached',
        message: `${event.metric} breached threshold: ${event.currentValue} (threshold: ${event.threshold}).`,
      };
    case 'notification.escalated':
      return {
        type: 'overdue',
        title: 'Notification escalated',
        message: `Notification ${event.notificationId} escalated to level ${event.level}.`,
      };
    default:
      return null;
  }
}

// Track which event types we subscribe to for alerts
const ALERT_EVENT_TYPES: EngineEvent['type'][] = [
  'flow.started',
  'flow.completed',
  'flow.abandoned',
  'stage.submitted',
  'match.discovered',
  'match.accepted',
  'match.rejected',
  'definition.created',
  'definition.updated',
  'definition.deleted',
  'data.threshold_breached',
  'notification.escalated',
];

// ---------------------------------------------------------------------------
// Bridge initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the notification bridge.
 *
 * 1. Subscribes to `notification.delivered` for in-app sonner toasts.
 * 2. Subscribes to all important engine events and persists them as alerts
 *    in Mujarrad so they appear in the NotificationCenter bell icon.
 *
 * @returns An unsubscribe function for cleanup.
 */
export function initializeNotificationBridge(): () => void {
  const unsubscribers: Array<() => void> = [];

  // ── Toast bridge (existing behavior) ──────────────────────────────────
  const toastUnsub = engineEventBus.subscribeToType(
    'notification.delivered',
    (event) => {
      if (event.channel !== 'in_app') return;

      const notificationEngine = getNotificationEngine();

      notificationEngine
        .getDefinition(event.notificationId)
        .then((def) => {
          if (!def) {
            toast('New notification', {
              description: `Notification ${event.notificationId}`,
            });
            return;
          }

          const template = def.template.en;
          const title = template.subject ?? def.slug;
          const description = template.body;

          if (template.actionUrl) {
            toast(title, {
              description,
              action: {
                label: template.actionLabel ?? 'View',
                onClick: () => {
                  window.location.href = template.actionUrl!;
                },
              },
            });
          } else {
            toast(title, { description });
          }
        })
        .catch((err) => {
          console.error('[NotificationBridge] Failed to fetch notification definition:', err);
          toast('New notification');
        });
    },
  );
  unsubscribers.push(toastUnsub);

  // ── Alert persistence bridge ──────────────────────────────────────────
  // Persists engine events as alerts in the Mujarrad 'alerts' resource
  // so they appear in the navbar NotificationCenter for admins.

  // Debounce definition change alerts (they fire rapidly during edits)
  let definitionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingDefinitionAlerts = new Map<string, AlertInfo>();

  function flushDefinitionAlerts() {
    const entityLayer = getEntityLayer();
    for (const [, alertInfo] of pendingDefinitionAlerts) {
      entityLayer
        .createEntity('alerts', {
          type: alertInfo.type,
          title: alertInfo.title,
          message: alertInfo.message,
          read: false,
          createdAt: new Date().toISOString(),
          entityId: alertInfo.entityId ?? '',
          entityType: alertInfo.entityType ?? '',
          source: 'engine',
        })
        .catch(() => { /* slug collision or network error — non-critical */ });
    }
    pendingDefinitionAlerts.clear();
  }

  for (const eventType of ALERT_EVENT_TYPES) {
    const unsub = engineEventBus.subscribeToType(eventType, (event) => {
      const alertInfo = eventToAlert(event);
      if (!alertInfo) return;

      // Debounce definition events to avoid flooding
      if (eventType.startsWith('definition.')) {
        const key = `${alertInfo.entityId}-${eventType}`;
        pendingDefinitionAlerts.set(key, alertInfo);
        if (definitionDebounceTimer) clearTimeout(definitionDebounceTimer);
        definitionDebounceTimer = setTimeout(flushDefinitionAlerts, 2000);
        return;
      }

      const entityLayer = getEntityLayer();
      entityLayer
        .createEntity('alerts', {
          type: alertInfo.type,
          title: alertInfo.title,
          message: alertInfo.message,
          read: false,
          createdAt: new Date().toISOString(),
          entityId: alertInfo.entityId ?? '',
          entityType: alertInfo.entityType ?? '',
          source: 'engine',
        })
        .catch(() => { /* slug collision or network error — non-critical */ });
    });
    unsubscribers.push(unsub);
  }

  console.log('[NotificationBridge] Initialized — bridging toasts + persisting alerts for', ALERT_EVENT_TYPES.length, 'event types');

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}
