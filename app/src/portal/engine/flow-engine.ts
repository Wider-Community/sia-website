/**
 * Dynamic Component Engine — Flow Engine
 *
 * Orchestrates multi-stage flows: CRUD for flow definitions (TEMPLATE nodes),
 * session management (CONTEXT nodes), stage transitions, and branch evaluation.
 */

import type {
  FlowDefinition,
  StageDefinition,
  FlowSession,
  TransitionEdge,
  BranchCondition,
} from './types';
import type { EntityControlLayer } from '../lib/entity-control-layer';
import { evaluateCondition } from './hooks';
import { engineEventBus } from './event-bus';

export class FlowEngine {
  constructor(private entityLayer: EntityControlLayer) {}

  // ---------------------------------------------------------------------------
  // Flow CRUD (TEMPLATE nodes — 'flow-definitions' resource)
  // ---------------------------------------------------------------------------

  async createFlow(
    flow: Omit<FlowDefinition, 'id' | 'nodeType' | 'version'>,
  ): Promise<FlowDefinition> {
    const record = await this.entityLayer.createEntity('flow-definitions', {
      ...flow,
      version: 1,
      status: flow.status ?? 'draft',
    });
    return this.toFlowDefinition(record);
  }

  async getFlow(id: string): Promise<FlowDefinition | null> {
    try {
      const record = await this.entityLayer.getEntity('flow-definitions', id);
      return this.toFlowDefinition(record);
    } catch {
      return null;
    }
  }

  async listFlows(filters?: {
    status?: string;
  }): Promise<FlowDefinition[]> {
    const crudFilters = [];
    if (filters?.status) {
      crudFilters.push({
        field: 'status',
        operator: 'eq' as const,
        value: filters.status,
      });
    }
    const result = await this.entityLayer.listEntities('flow-definitions', {
      filters: crudFilters,
    });
    return result.data.map((r) => this.toFlowDefinition(r));
  }

  async updateFlow(
    id: string,
    updates: Partial<FlowDefinition>,
  ): Promise<FlowDefinition> {
    const existing = await this.getFlow(id);
    const nextVersion = (existing?.version ?? 0) + 1;
    const record = await this.entityLayer.updateEntity('flow-definitions', id, {
      ...updates,
      version: nextVersion,
    });
    return this.toFlowDefinition(record);
  }

  async deleteFlow(id: string): Promise<void> {
    await this.entityLayer.deleteEntity('flow-definitions', id);
  }

  // ---------------------------------------------------------------------------
  // Session management (CONTEXT nodes — 'flow-sessions' resource)
  // ---------------------------------------------------------------------------

  async startSession(flowId: string, userId: string): Promise<FlowSession> {
    const flow = await this.getFlow(flowId);
    if (!flow) {
      throw new Error(`Flow "${flowId}" not found`);
    }

    const now = new Date().toISOString();
    const record = await this.entityLayer.createEntity('flow-sessions', {
      flowId,
      flowVersion: flow.version,
      userId,
      currentStageId: flow.entryStageId,
      visitedStages: [flow.entryStageId],
      collectedData: {},
      status: 'active',
      startedAt: now,
      lastActivityAt: now,
    });

    const session = this.toFlowSession(record);

    engineEventBus.emit({
      type: 'flow.started',
      flowId,
      sessionId: session.id,
      userId,
    });

    engineEventBus.emit({
      type: 'stage.entered',
      flowId,
      stageId: flow.entryStageId,
      sessionId: session.id,
      userId,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<FlowSession | null> {
    try {
      const record = await this.entityLayer.getEntity(
        'flow-sessions',
        sessionId,
      );
      return this.toFlowSession(record);
    } catch {
      return null;
    }
  }

  async submitStage(
    sessionId: string,
    stageData: Record<string, unknown>,
  ): Promise<{ nextStageId: string | null; session: FlowSession }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    if (session.status !== 'active') {
      throw new Error(`Session "${sessionId}" is not active (${session.status})`);
    }

    const flow = await this.getFlow(session.flowId);
    if (!flow) {
      throw new Error(`Flow "${session.flowId}" not found`);
    }

    // Save stage data into collectedData keyed by current stage ID
    const updatedCollectedData = {
      ...session.collectedData,
      [session.currentStageId]: stageData,
    };

    engineEventBus.emit({
      type: 'stage.submitted',
      flowId: session.flowId,
      stageId: session.currentStageId,
      sessionId,
      data: stageData,
    });

    // Determine next stage
    const nextStageId = this.evaluateNextStage(
      flow,
      session.currentStageId,
      updatedCollectedData,
    );

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      collectedData: updatedCollectedData,
      lastActivityAt: now,
    };

    if (nextStageId) {
      updates.currentStageId = nextStageId;
      updates.visitedStages = [...session.visitedStages, nextStageId];

      // Check if next stage is terminal
      const nextStage = flow.stages.find((s) => s.id === nextStageId);
      if (nextStage?.isTerminal) {
        updates.status = 'completed';
        updates.completedAt = now;
      }
    } else {
      // No next stage means current stage was terminal or no valid transition
      updates.status = 'completed';
      updates.completedAt = now;
    }

    const updatedRecord = await this.entityLayer.updateEntity(
      'flow-sessions',
      sessionId,
      updates,
    );
    const updatedSession = this.toFlowSession(updatedRecord);

    if (nextStageId) {
      engineEventBus.emit({
        type: 'stage.entered',
        flowId: session.flowId,
        stageId: nextStageId,
        sessionId,
        userId: session.userId,
      });
    }

    if (updatedSession.status === 'completed') {
      engineEventBus.emit({
        type: 'flow.completed',
        flowId: session.flowId,
        sessionId,
        userId: session.userId,
        data: updatedCollectedData,
      });
    }

    return { nextStageId, session: updatedSession };
  }

  async goBack(sessionId: string): Promise<FlowSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }
    if (session.status !== 'active') {
      throw new Error(`Session "${sessionId}" is not active (${session.status})`);
    }
    if (session.visitedStages.length <= 1) {
      throw new Error('Cannot go back from the first stage');
    }

    // Pop the current stage from visited and go to the previous one
    const newVisited = session.visitedStages.slice(0, -1);
    const previousStageId = newVisited[newVisited.length - 1];

    const updatedRecord = await this.entityLayer.updateEntity(
      'flow-sessions',
      sessionId,
      {
        currentStageId: previousStageId,
        visitedStages: newVisited,
        lastActivityAt: new Date().toISOString(),
      },
    );

    const updatedSession = this.toFlowSession(updatedRecord);

    engineEventBus.emit({
      type: 'stage.entered',
      flowId: session.flowId,
      stageId: previousStageId,
      sessionId,
      userId: session.userId,
    });

    return updatedSession;
  }

  async abandonSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    await this.entityLayer.updateEntity('flow-sessions', sessionId, {
      status: 'abandoned',
      lastActivityAt: new Date().toISOString(),
    });

    engineEventBus.emit({
      type: 'flow.abandoned',
      flowId: session.flowId,
      sessionId,
      userId: session.userId,
      lastStageId: session.currentStageId,
    });
  }

  // ---------------------------------------------------------------------------
  // Stage orchestration
  // ---------------------------------------------------------------------------

  /**
   * Evaluate which stage comes next given the current stage and collected data.
   *
   * Logic:
   * 1. Find the current stage in the flow definition.
   * 2. If it's terminal, return null.
   * 3. Get all transitions from the current stage, sorted by priority (ascending).
   * 4. For each transition with conditions, evaluate them (first match wins).
   * 5. Fall through to the default transition (one with no conditions).
   * 6. Return null if no valid transition found.
   */
  evaluateNextStage(
    flow: FlowDefinition,
    currentStageId: string,
    collectedData: Record<string, Record<string, unknown>>,
  ): string | null {
    const currentStage = flow.stages.find((s) => s.id === currentStageId);
    if (!currentStage || currentStage.isTerminal) {
      return null;
    }

    // Sort transitions by priority (lower number = higher priority)
    const transitions = [...currentStage.transitions].sort(
      (a, b) => a.priority - b.priority,
    );

    // Flatten collected data for condition evaluation
    const flatData = this.flattenCollectedData(collectedData);

    let defaultTransition: TransitionEdge | null = null;

    for (const transition of transitions) {
      // A transition with no conditions is the default/fallback
      if (!transition.conditions || transition.conditions.length === 0) {
        if (!defaultTransition) {
          defaultTransition = transition;
        }
        continue;
      }

      // Evaluate conditions based on logic (AND / OR)
      const matches =
        transition.logic === 'AND'
          ? transition.conditions.every((c) => evaluateCondition(c, flatData))
          : transition.conditions.some((c) => evaluateCondition(c, flatData));

      if (matches) {
        return transition.toStageId;
      }
    }

    // Fall back to default transition
    return defaultTransition?.toStageId ?? null;
  }

  /**
   * Validate that a flow graph is well-formed:
   * - Entry stage exists
   * - All stages are reachable from the entry stage
   * - At least one terminal stage exists
   * - Every non-terminal stage has at least one default transition (no conditions)
   * - No references to non-existent stages in transitions
   */
  validateFlowGraph(
    flow: FlowDefinition,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stageIds = new Set(flow.stages.map((s) => s.id));

    // 1. Verify entry stage exists
    if (!stageIds.has(flow.entryStageId)) {
      errors.push(
        `Entry stage "${flow.entryStageId}" does not exist in the flow`,
      );
    }

    // 2. Check for at least one terminal stage
    const terminalStages = flow.stages.filter((s) => s.isTerminal);
    if (terminalStages.length === 0) {
      errors.push('Flow must have at least one terminal stage');
    }

    // 3. Validate transition references and default transitions
    for (const stage of flow.stages) {
      // Check transition target references
      for (const transition of stage.transitions) {
        if (!stageIds.has(transition.toStageId)) {
          errors.push(
            `Stage "${stage.id}" has transition to non-existent stage "${transition.toStageId}"`,
          );
        }
        if (transition.fromStageId !== stage.id) {
          errors.push(
            `Stage "${stage.id}" contains transition with mismatched fromStageId "${transition.fromStageId}"`,
          );
        }
      }

      // Non-terminal stages must have at least one default transition
      if (!stage.isTerminal && stage.transitions.length > 0) {
        const hasDefault = stage.transitions.some(
          (t) => !t.conditions || t.conditions.length === 0,
        );
        if (!hasDefault) {
          errors.push(
            `Non-terminal stage "${stage.id}" has no default transition (all transitions have conditions)`,
          );
        }
      }

      // Non-terminal stages must have at least one transition
      if (!stage.isTerminal && stage.transitions.length === 0) {
        errors.push(
          `Non-terminal stage "${stage.id}" has no transitions`,
        );
      }
    }

    // 4. Check reachability from entry stage (BFS)
    if (stageIds.has(flow.entryStageId)) {
      const reachable = new Set<string>();
      const queue = [flow.entryStageId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;
        reachable.add(current);

        const stage = flow.stages.find((s) => s.id === current);
        if (stage) {
          for (const transition of stage.transitions) {
            if (!reachable.has(transition.toStageId)) {
              queue.push(transition.toStageId);
            }
          }
        }
      }

      for (const stageId of stageIds) {
        if (!reachable.has(stageId)) {
          errors.push(
            `Stage "${stageId}" is not reachable from the entry stage`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private toFlowDefinition(
    record: Record<string, unknown>,
  ): FlowDefinition {
    return {
      id: record.id as string,
      nodeType: 'TEMPLATE',
      slug: record.slug as string,
      entryStageId: record.entryStageId as string,
      stages: (record.stages ?? []) as StageDefinition[],
      entryConditions: record.entryConditions as FlowDefinition['entryConditions'],
      metadata: (record.metadata ?? {
        name_en: record.slug as string,
        name_ar: record.slug as string,
      }) as FlowDefinition['metadata'],
      version: (record.version as number) ?? 1,
      status: (record.status as FlowDefinition['status']) ?? 'draft',
    };
  }

  private toFlowSession(record: Record<string, unknown>): FlowSession {
    return {
      id: record.id as string,
      nodeType: 'CONTEXT',
      flowId: record.flowId as string,
      flowVersion: (record.flowVersion as number) ?? 1,
      userId: record.userId as string,
      currentStageId: record.currentStageId as string,
      visitedStages: (record.visitedStages ?? []) as string[],
      collectedData: (record.collectedData ?? {}) as Record<
        string,
        Record<string, unknown>
      >,
      status: (record.status as FlowSession['status']) ?? 'active',
      startedAt: record.startedAt as string,
      lastActivityAt: record.lastActivityAt as string,
      completedAt: record.completedAt as string | undefined,
    };
  }

  /**
   * Flatten collected data from `{ stageId: { field: value } }` into
   * a single `{ "stageId.field": value, field: value }` map for condition evaluation.
   */
  private flattenCollectedData(
    collectedData: Record<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const flat: Record<string, unknown> = {};
    for (const [stageId, stageData] of Object.entries(collectedData)) {
      for (const [field, value] of Object.entries(stageData)) {
        // Allow referencing as "stageId.field" or just "field" (last write wins)
        flat[`${stageId}.${field}`] = value;
        flat[field] = value;
      }
    }
    return flat;
  }
}
