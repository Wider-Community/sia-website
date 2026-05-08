/**
 * Dynamic Component Engine — Notification Engine
 *
 * Evaluates every engine event against notification definitions and dispatches
 * notifications through configured channels. Supports cooldowns, escalation
 * chains, and template interpolation.
 *
 * Actual channel delivery (email, SMS, etc.) is deferred — for now we emit
 * a `notification.delivered` event on the bus and log to the console.
 */

import type {
  NotificationDefinition,
  EngineEvent,
  MessageTemplate,
  NotificationChannel,
  BranchCondition,
  NotificationTriggerType,
  EscalationConfig,
} from './types';
import type { EntityControlLayer } from '../lib/entity-control-layer';
import { engineEventBus } from './event-bus';

// ---------------------------------------------------------------------------
// Escalation state
// ---------------------------------------------------------------------------

interface EscalationState {
  definitionId: string;
  currentLevel: number;
  sentAt: number;
  timeout: number;
  maxLevel: number;
  acknowledged: boolean;
  timerId?: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// NotificationEngine
// ---------------------------------------------------------------------------

export class NotificationEngine {
  private unsubscribe: (() => void) | null = null;
  private cooldowns: Map<string, number> = new Map();
  private escalations: Map<string, EscalationState> = new Map();

  constructor(private entityLayer: EntityControlLayer) {}

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  initialize(): void {
    this.unsubscribe = engineEventBus.subscribe((event) => {
      this.evaluate(event).catch((err) => {
        console.error('[NotificationEngine] Error evaluating event:', err);
      });
    });
    console.log('[NotificationEngine] Initialized — listening for all events');
  }

  // -------------------------------------------------------------------------
  // Definition CRUD
  // -------------------------------------------------------------------------

  async createDefinition(
    def: Omit<NotificationDefinition, 'id' | 'nodeType' | 'version'>,
  ): Promise<NotificationDefinition> {
    const record = await this.entityLayer.createEntity(
      'notification-definitions',
      { ...def, version: 1 },
    );
    return this.toDefinition(record);
  }

  async getDefinition(id: string): Promise<NotificationDefinition | null> {
    try {
      const record = await this.entityLayer.getEntity(
        'notification-definitions',
        id,
      );
      return this.toDefinition(record);
    } catch {
      return null;
    }
  }

  async listDefinitions(): Promise<NotificationDefinition[]> {
    const result = await this.entityLayer.listEntities(
      'notification-definitions',
    );
    return result.data.map((r) => this.toDefinition(r));
  }

  async updateDefinition(
    id: string,
    updates: Partial<NotificationDefinition>,
  ): Promise<NotificationDefinition> {
    const existing = await this.getDefinition(id);
    const nextVersion = (existing?.version ?? 0) + 1;
    const record = await this.entityLayer.updateEntity(
      'notification-definitions',
      id,
      { ...updates, version: nextVersion },
    );
    return this.toDefinition(record);
  }

  async deleteDefinition(id: string): Promise<void> {
    await this.entityLayer.deleteEntity('notification-definitions', id);
  }

  // -------------------------------------------------------------------------
  // Core evaluation — called on every event
  // -------------------------------------------------------------------------

  private async evaluate(event: EngineEvent): Promise<void> {
    // 1. Load all enabled definitions
    const definitions = await this.listDefinitions();
    const enabled = definitions.filter((d) => d.enabled);

    for (const def of enabled) {
      // 2. Check event type match
      if (!this.eventMatchesTrigger(event, def.trigger.eventType)) continue;

      // 3. Check source match (flowId / stageId / componentId — null means "all")
      if (!this.sourceMatches(event, def.trigger.source)) continue;

      // 4. Evaluate filter conditions
      if (def.trigger.filter && def.trigger.filter.length > 0) {
        if (!this.evaluateFilters(event, def.trigger.filter)) continue;
      }

      // 5. Check cooldown
      if (this.isInCooldown(def.id, def.cooldown)) {
        console.log(
          `[NotificationEngine] Skipping "${def.slug}" — in cooldown`,
        );
        continue;
      }

      // 6. Record cooldown timestamp
      this.cooldowns.set(def.id, Date.now());

      // 7. Build context from event payload
      const context: Record<string, unknown> = { ...event };

      // 8. Interpolate template
      const interpolatedTemplate = {
        en: this.interpolateTemplate(def.template.en, context),
        ar: this.interpolateTemplate(def.template.ar, context),
      };

      // 9. Dispatch to channels
      const notificationId = `notif-${def.id}-${Date.now()}`;
      this.dispatch(notificationId, def, interpolatedTemplate);

      // 10. Set up escalation if configured
      if (def.escalation) {
        this.setupEscalation(notificationId, def);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event / trigger matching
  // -------------------------------------------------------------------------

  private eventMatchesTrigger(
    event: EngineEvent,
    triggerType: NotificationTriggerType,
  ): boolean {
    return event.type === triggerType;
  }

  private sourceMatches(
    event: EngineEvent,
    source: { flowId?: string; stageId?: string; componentId?: string },
  ): boolean {
    const ev = event as Record<string, unknown>;

    if (source.flowId && ev.flowId !== source.flowId) return false;
    if (source.stageId && ev.stageId !== source.stageId) return false;
    if (source.componentId && ev.componentId !== source.componentId)
      return false;

    return true;
  }

  // -------------------------------------------------------------------------
  // Filter evaluation (same pattern as branch conditions)
  // -------------------------------------------------------------------------

  private evaluateFilters(
    event: EngineEvent,
    conditions: BranchCondition[],
  ): boolean {
    const payload = event as Record<string, unknown>;
    return conditions.every((cond) =>
      this.evaluateCondition(payload, cond),
    );
  }

  private evaluateCondition(
    data: Record<string, unknown>,
    condition: BranchCondition,
  ): boolean {
    const fieldValue = data[condition.field];

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return (
          typeof fieldValue === 'number' &&
          typeof condition.value === 'number' &&
          fieldValue > condition.value
        );
      case 'lt':
        return (
          typeof fieldValue === 'number' &&
          typeof condition.value === 'number' &&
          fieldValue < condition.value
        );
      case 'gte':
        return (
          typeof fieldValue === 'number' &&
          typeof condition.value === 'number' &&
          fieldValue >= condition.value
        );
      case 'lte':
        return (
          typeof fieldValue === 'number' &&
          typeof condition.value === 'number' &&
          fieldValue <= condition.value
        );
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'contains':
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          fieldValue.includes(condition.value)
        );
      case 'matches':
        return (
          typeof fieldValue === 'string' &&
          typeof condition.value === 'string' &&
          new RegExp(condition.value).test(fieldValue)
        );
      case 'exists':
        return condition.value
          ? fieldValue !== undefined && fieldValue !== null
          : fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  // -------------------------------------------------------------------------
  // Template interpolation
  // -------------------------------------------------------------------------

  interpolateTemplate(
    template: MessageTemplate,
    context: Record<string, unknown>,
  ): MessageTemplate {
    const interpolate = (text: string): string =>
      text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
        const value = this.resolveContextValue(context, key);
        return value !== undefined && value !== null ? String(value) : '';
      });

    return {
      ...template,
      subject: template.subject ? interpolate(template.subject) : undefined,
      body: interpolate(template.body),
      actionUrl: template.actionUrl
        ? interpolate(template.actionUrl)
        : undefined,
      actionLabel: template.actionLabel
        ? interpolate(template.actionLabel)
        : undefined,
    };
  }

  private resolveContextValue(
    context: Record<string, unknown>,
    key: string,
  ): unknown {
    const parts = key.split('.');
    let current: unknown = context;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  // -------------------------------------------------------------------------
  // Cooldown tracking
  // -------------------------------------------------------------------------

  private isInCooldown(definitionId: string, cooldown?: number): boolean {
    if (!cooldown || cooldown <= 0) return false;
    const lastFired = this.cooldowns.get(definitionId);
    if (lastFired === undefined) return false;
    return Date.now() - lastFired < cooldown;
  }

  // -------------------------------------------------------------------------
  // Dispatch — emit event + console log (actual delivery deferred)
  // -------------------------------------------------------------------------

  private dispatch(
    notificationId: string,
    def: NotificationDefinition,
    template: { en: MessageTemplate; ar: MessageTemplate },
  ): void {
    console.log(
      `[NotificationEngine] Dispatching "${def.slug}" (${notificationId})`,
      {
        channels: def.channels.map((c) => c.channel),
        priority: def.priority,
        template: template.en.subject ?? template.en.body.slice(0, 80),
      },
    );

    // Emit a notification.delivered event for each channel
    for (const channelConfig of def.channels) {
      engineEventBus.emit({
        type: 'notification.delivered',
        notificationId,
        channel: channelConfig.channel,
        recipientId: this.resolveRecipientId(def.recipients),
      });
    }
  }

  /**
   * Resolve a single representative recipient ID from the recipient rule.
   * Full recipient resolution (role lookups, dynamic resolvers) is deferred.
   */
  private resolveRecipientId(
    rule: NotificationDefinition['recipients'],
  ): string {
    if (rule.userIds && rule.userIds.length > 0) return rule.userIds[0];
    if (rule.roles && rule.roles.length > 0) return `role:${rule.roles[0]}`;
    if (rule.relationship) return `rel:${rule.relationship}`;
    if (rule.dynamicResolver) return `dynamic:${rule.dynamicResolver}`;
    return 'unknown';
  }

  // -------------------------------------------------------------------------
  // Escalation tracking
  // -------------------------------------------------------------------------

  private setupEscalation(
    notificationId: string,
    def: NotificationDefinition,
  ): void {
    const esc = def.escalation as EscalationConfig;
    if (!esc.escalationChain.length) return;

    const state: EscalationState = {
      definitionId: def.id,
      currentLevel: 0,
      sentAt: Date.now(),
      timeout: esc.timeout,
      maxLevel: esc.maxEscalations,
      acknowledged: false,
    };

    state.timerId = setTimeout(() => {
      this.escalate(notificationId, state, def);
    }, esc.timeout);

    this.escalations.set(notificationId, state);
  }

  private escalate(
    notificationId: string,
    state: EscalationState,
    def: NotificationDefinition,
  ): void {
    if (state.acknowledged) return;
    if (state.currentLevel >= state.maxLevel) {
      console.log(
        `[NotificationEngine] Max escalation reached for ${notificationId}`,
      );
      this.escalations.delete(notificationId);
      return;
    }

    state.currentLevel += 1;
    const esc = def.escalation as EscalationConfig;
    const levelConfig = esc.escalationChain.find(
      (l) => l.level === state.currentLevel,
    );

    const channel: NotificationChannel =
      levelConfig?.channelOverride ?? def.channels[0]?.channel ?? 'in_app';

    console.log(
      `[NotificationEngine] Escalating ${notificationId} to level ${state.currentLevel}`,
    );

    engineEventBus.emit({
      type: 'notification.escalated',
      notificationId,
      level: state.currentLevel,
    });

    // Re-dispatch at the escalated level
    engineEventBus.emit({
      type: 'notification.delivered',
      notificationId,
      channel,
      recipientId: levelConfig
        ? this.resolveRecipientId(levelConfig.recipientRule)
        : 'unknown',
    });

    // Schedule next escalation
    if (state.currentLevel < state.maxLevel) {
      state.timerId = setTimeout(() => {
        this.escalate(notificationId, state, def);
      }, state.timeout);
    } else {
      this.escalations.delete(notificationId);
    }
  }

  acknowledge(notificationId: string, userId: string): void {
    const state = this.escalations.get(notificationId);
    if (!state) return;

    state.acknowledged = true;
    if (state.timerId) clearTimeout(state.timerId);
    this.escalations.delete(notificationId);

    console.log(
      `[NotificationEngine] ${notificationId} acknowledged by ${userId}`,
    );

    engineEventBus.emit({
      type: 'notification.acknowledged',
      notificationId,
      recipientId: userId,
    });
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    // Unsubscribe from event bus
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clear all escalation timers
    for (const state of this.escalations.values()) {
      if (state.timerId) clearTimeout(state.timerId);
    }
    this.escalations.clear();
    this.cooldowns.clear();

    console.log('[NotificationEngine] Destroyed — unsubscribed and cleaned up');
  }

  // -------------------------------------------------------------------------
  // Mapping helper
  // -------------------------------------------------------------------------

  private toDefinition(
    record: Record<string, unknown>,
  ): NotificationDefinition {
    return {
      id: record.id as string,
      nodeType: 'TEMPLATE',
      slug: record.slug as string,
      trigger: record.trigger as NotificationDefinition['trigger'],
      channels: (record.channels ?? []) as NotificationDefinition['channels'],
      template: record.template as NotificationDefinition['template'],
      recipients: record.recipients as NotificationDefinition['recipients'],
      escalation: record.escalation as NotificationDefinition['escalation'],
      cooldown: record.cooldown as number | undefined,
      enabled: (record.enabled as boolean) ?? false,
      priority:
        (record.priority as NotificationDefinition['priority']) ?? 'medium',
      version: (record.version as number) ?? 1,
    };
  }
}
