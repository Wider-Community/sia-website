/**
 * Dynamic Component Engine — Agentic Suggestions
 *
 * A framework for AI agent suggestions. Suggestions are stored as ASSUMPTION
 * nodes in Mujarrad and can be approved (promoted to real config) or rejected.
 */

import type { EntityControlLayer } from '../lib/entity-control-layer';
import { engineEventBus } from './event-bus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestionType =
  | 'component'
  | 'flow_stage'
  | 'matching_dimension'
  | 'notification';

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface AgentSuggestion {
  id: string;
  type: SuggestionType;
  confidence: number;
  title: string;
  description: string;
  suggestedConfig: Record<string, unknown>;
  status: SuggestionStatus;
  suggestedBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// SuggestionEngine class
// ---------------------------------------------------------------------------

const RESOURCE = 'agent-suggestions';

export class SuggestionEngine {
  constructor(private entityLayer: EntityControlLayer) {}

  /**
   * Propose a new suggestion — stores it as an ASSUMPTION node.
   */
  async proposeSuggestion(
    suggestion: Omit<AgentSuggestion, 'id' | 'status' | 'createdAt'>,
  ): Promise<AgentSuggestion> {
    const now = new Date().toISOString();
    const record = await this.entityLayer.createEntity(RESOURCE, {
      ...suggestion,
      status: 'pending',
      createdAt: now,
    });

    const created = this.toSuggestion(record);

    engineEventBus.emit({
      type: 'definition.created',
      nodeId: created.id,
    });

    return created;
  }

  /**
   * List all pending (unreviewed) suggestions.
   */
  async listPendingSuggestions(): Promise<AgentSuggestion[]> {
    const result = await this.entityLayer.listEntities(RESOURCE, {
      filters: [{ field: 'status', operator: 'eq' as const, value: 'pending' }],
    });
    return result.data.map((r) => this.toSuggestion(r));
  }

  /**
   * List all suggestions, optionally filtered by status.
   */
  async listSuggestions(filters?: {
    status?: SuggestionStatus;
    type?: SuggestionType;
  }): Promise<AgentSuggestion[]> {
    const crudFilters = [];
    if (filters?.status) {
      crudFilters.push({ field: 'status', operator: 'eq' as const, value: filters.status });
    }
    if (filters?.type) {
      crudFilters.push({ field: 'type', operator: 'eq' as const, value: filters.type });
    }
    const result = await this.entityLayer.listEntities(RESOURCE, {
      filters: crudFilters,
    });
    return result.data.map((r) => this.toSuggestion(r));
  }

  /**
   * Approve a suggestion — promote it to real config.
   *
   * Depending on the suggestion type, this creates the appropriate
   * entity (component definition, flow stage, etc.) from suggestedConfig.
   */
  async approveSuggestion(id: string): Promise<AgentSuggestion> {
    const record = await this.entityLayer.updateEntity(RESOURCE, id, {
      status: 'approved',
    });

    const suggestion = this.toSuggestion(record);

    // Promote the suggestion config to a real entity based on type
    await this.promoteSuggestion(suggestion);

    engineEventBus.emit({
      type: 'definition.updated',
      nodeId: id,
      version: 1,
    });

    return suggestion;
  }

  /**
   * Reject a suggestion.
   */
  async rejectSuggestion(id: string): Promise<AgentSuggestion> {
    const record = await this.entityLayer.updateEntity(RESOURCE, id, {
      status: 'rejected',
    });

    const suggestion = this.toSuggestion(record);

    engineEventBus.emit({
      type: 'definition.updated',
      nodeId: id,
      version: 1,
    });

    return suggestion;
  }

  /**
   * Get a single suggestion by ID.
   */
  async getSuggestion(id: string): Promise<AgentSuggestion | null> {
    try {
      const record = await this.entityLayer.getEntity(RESOURCE, id);
      return this.toSuggestion(record);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async promoteSuggestion(suggestion: AgentSuggestion): Promise<void> {
    const config = suggestion.suggestedConfig;

    switch (suggestion.type) {
      case 'component':
        await this.entityLayer.createEntity('component-definitions', {
          ...config,
          status: 'published',
          version: 1,
        });
        break;

      case 'flow_stage':
        // Flow stages are embedded in flow definitions — the caller
        // must update the flow definition with the new stage.
        // We store the promoted config for downstream consumption.
        break;

      case 'matching_dimension':
        // Matching dimensions are configuration data — no separate entity
        // needed. The config is available on the approved suggestion.
        break;

      case 'notification':
        await this.entityLayer.createEntity('notification-definitions', {
          ...config,
          enabled: true,
          version: 1,
        });
        break;
    }
  }

  private toSuggestion(record: Record<string, unknown>): AgentSuggestion {
    return {
      id: record.id as string,
      type: (record.type as SuggestionType) ?? 'component',
      confidence: (record.confidence as number) ?? 0,
      title: (record.title as string) ?? '',
      description: (record.description as string) ?? '',
      suggestedConfig: (record.suggestedConfig as Record<string, unknown>) ?? {},
      status: (record.status as SuggestionStatus) ?? 'pending',
      suggestedBy: (record.suggestedBy as string) ?? '',
      createdAt: (record.createdAt as string) ?? new Date().toISOString(),
    };
  }
}
