/**
 * Dynamic Component Engine — Component Registry
 *
 * CRUD for component definitions (TEMPLATE nodes) and component instances
 * (REGULAR nodes) via the existing Mujarrad EntityControlLayer.
 */

import type { EntityControlLayer } from '../lib/entity-control-layer';
import type { ComponentDefinition, ComponentInstance } from './types';

export class ComponentRegistry {
  constructor(private entityLayer: EntityControlLayer) {}

  // ---------------------------------------------------------------------------
  // Definition CRUD (TEMPLATE nodes)
  // ---------------------------------------------------------------------------

  async createDefinition(
    def: Omit<ComponentDefinition, 'id' | 'nodeType' | 'version'>,
  ): Promise<ComponentDefinition> {
    const record = await this.entityLayer.createEntity(
      'component-definitions',
      this.serializeForMujarrad(def),
    );
    return this.toDefinition(record);
  }

  async getDefinition(id: string): Promise<ComponentDefinition | null> {
    try {
      const record = await this.entityLayer.getEntity(
        'component-definitions',
        id,
      );
      return this.toDefinition(record);
    } catch {
      return null;
    }
  }

  async listDefinitions(filters?: {
    category?: string;
    status?: string;
  }): Promise<ComponentDefinition[]> {
    const crudFilters = [];
    if (filters?.category) {
      crudFilters.push({
        field: 'componentCategory',
        operator: 'eq' as const,
        value: filters.category,
      });
    }
    if (filters?.status) {
      crudFilters.push({
        field: 'status',
        operator: 'eq' as const,
        value: filters.status,
      });
    }
    const result = await this.entityLayer.listEntities(
      'component-definitions',
      { filters: crudFilters },
    );
    return result.data.map((r) => this.toDefinition(r));
  }

  async updateDefinition(
    id: string,
    updates: Partial<ComponentDefinition>,
  ): Promise<ComponentDefinition> {
    // Increment version on every update for cache invalidation
    const existing = await this.getDefinition(id);
    const nextVersion = (existing?.version ?? 0) + 1;
    const serialized = this.serializeForMujarrad(updates);
    const record = await this.entityLayer.updateEntity(
      'component-definitions',
      id,
      { ...serialized, version: nextVersion },
    );
    return this.toDefinition(record);
  }

  async deleteDefinition(id: string): Promise<void> {
    await this.entityLayer.deleteEntity('component-definitions', id);
  }

  // ---------------------------------------------------------------------------
  // Instance CRUD (REGULAR nodes)
  // ---------------------------------------------------------------------------

  async createInstance(
    instance: Omit<ComponentInstance, 'id' | 'nodeType'>,
  ): Promise<ComponentInstance> {
    const record = await this.entityLayer.createEntity(
      'component-instances',
      instance,
    );
    return this.toInstance(record);
  }

  async getInstance(id: string): Promise<ComponentInstance | null> {
    try {
      const record = await this.entityLayer.getEntity(
        'component-instances',
        id,
      );
      return this.toInstance(record);
    } catch {
      return null;
    }
  }

  async listInstances(filters?: {
    flowId?: string;
    stageId?: string;
    definitionId?: string;
  }): Promise<ComponentInstance[]> {
    const crudFilters = [];
    if (filters?.flowId) {
      crudFilters.push({
        field: 'placement.flowId',
        operator: 'eq' as const,
        value: filters.flowId,
      });
    }
    if (filters?.stageId) {
      crudFilters.push({
        field: 'placement.stageId',
        operator: 'eq' as const,
        value: filters.stageId,
      });
    }
    if (filters?.definitionId) {
      crudFilters.push({
        field: 'definitionId',
        operator: 'eq' as const,
        value: filters.definitionId,
      });
    }
    const result = await this.entityLayer.listEntities(
      'component-instances',
      { filters: crudFilters },
    );
    return result.data.map((r) => this.toInstance(r));
  }

  async updateInstance(
    id: string,
    updates: Partial<ComponentInstance>,
  ): Promise<ComponentInstance> {
    const record = await this.entityLayer.updateEntity(
      'component-instances',
      id,
      updates,
    );
    return this.toInstance(record);
  }

  async deleteInstance(id: string): Promise<void> {
    await this.entityLayer.deleteEntity('component-instances', id);
  }

  // ---------------------------------------------------------------------------
  // Relationship queries
  // ---------------------------------------------------------------------------

  async getInstancesForStage(stageId: string): Promise<ComponentInstance[]> {
    return this.listInstances({ stageId });
  }

  async getInstancesForDefinition(
    definitionId: string,
  ): Promise<ComponentInstance[]> {
    return this.listInstances({ definitionId });
  }

  // ---------------------------------------------------------------------------
  // Serialization (complex objects → flat strings for Mujarrad)
  // ---------------------------------------------------------------------------

  private serializeForMujarrad(
    def: Partial<ComponentDefinition> & Record<string, unknown>,
  ): Record<string, unknown> {
    const { category, ...rest } = def;
    const out: Record<string, unknown> = { ...rest };

    if (category !== undefined) out.componentCategory = category;

    return out;
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private toDefinition(record: Record<string, unknown>): ComponentDefinition {
    return {
      id: record.id as string,
      nodeType: 'TEMPLATE',
      slug: record.slug as string,
      category: record.componentCategory as ComponentDefinition['category'],
      renderer: record.renderer as string,
      dataSchema: (record.dataSchema ?? {}) as ComponentDefinition['dataSchema'],
      defaultConfig: (record.defaultConfig ?? {}) as Record<string, unknown>,
      validations: (record.validations ?? []) as ComponentDefinition['validations'],
      i18n: (record.i18n ?? {
        en: { label: record.slug as string },
        ar: { label: record.slug as string },
      }) as ComponentDefinition['i18n'],
      composedOf: record.composedOf as string[] | undefined,
      version: (record.version as number) ?? 1,
      status: (record.status as ComponentDefinition['status']) ?? 'draft',
    };
  }

  private toInstance(record: Record<string, unknown>): ComponentInstance {
    return {
      id: record.id as string,
      nodeType: 'REGULAR',
      definitionId: record.definitionId as string,
      configOverrides: (record.configOverrides ?? {}) as Record<string, unknown>,
      i18nOverrides: record.i18nOverrides as ComponentInstance['i18nOverrides'],
      placement: (record.placement ?? {
        flowId: '',
        stageId: '',
        order: 0,
      }) as ComponentInstance['placement'],
      visibility: record.visibility as ComponentInstance['visibility'],
    };
  }
}
