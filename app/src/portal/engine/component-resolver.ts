/**
 * Dynamic Component Engine — Component Resolver
 *
 * The core resolution pipeline:
 * Instance ID → Cache check → Mujarrad fetch → Definition resolve →
 * Config merge → Validation compile → Renderer lookup → ResolvedComponent
 */

import type {
  ComponentDefinition,
  ComponentInstance,
  ResolvedComponent,
  DynamicComponentProps,
  I18nLabels,
  DataSourceBinding,
} from './types';
import { definitionCache, instanceCache } from './cache-manager';
import { rendererRegistry } from './renderer-registry';
import { resolveRendererForSchema } from './schema-adaptive';
import type { ComponentRegistry } from './component-registry';
import { getReferenceDataManager, getEntityLayer } from './hooks-internal';
import { ENTITY_REGISTRY } from '../lib/entity-registry';

export class ComponentResolver {
  constructor(private registry: ComponentRegistry) {}

  /**
   * Resolve a component into a renderable component.
   *
   * Accepts either an instance ID or a definition ID:
   * - If an instance is found, it merges instance overrides with the definition.
   * - If no instance is found, it falls back to treating the ID as a definition
   *   ID and renders directly from the definition (no overrides).
   */
  async resolve(
    id: string,
    locale: 'en' | 'ar' = 'en',
  ): Promise<ResolvedComponent> {
    // 1. Try to get instance
    const instance = await this.tryResolveInstance(id);

    let definition: ComponentDefinition;
    let config: Record<string, unknown>;
    let i18n: I18nLabels;
    let resolvedInstanceId: string;

    if (instance) {
      // Instance found — resolve its definition and merge overrides
      definition = await this.resolveDefinition(instance.definitionId);
      config = this.mergeConfig(definition.defaultConfig, instance.configOverrides);
      i18n = this.resolveI18n(definition, instance, locale);
      resolvedInstanceId = instance.id;
    } else {
      // No instance — treat the ID as a definition ID (fallback)
      definition = await this.resolveDefinition(id);
      config = { ...definition.defaultConfig };
      i18n = definition.i18n[locale] ?? definition.i18n.en;
      resolvedInstanceId = id;
    }

    // 2. Get renderer component + merge schema-adaptive config if needed
    const { Component, schemaConfig } = this.resolveRendererWithConfig(definition);

    // Merge: definition defaults → schema-adaptive inferences → instance overrides
    // Schema-adaptive config fills gaps (e.g. select options from enum) that
    // defaultConfig might not have.
    const finalConfig = { ...schemaConfig, ...config };

    // 3. If component has a data source binding, resolve options into config
    if (definition.dataSource && definition.dataSource.type !== 'none') {
      try {
        const dsOptions = await this.resolveDataSourceOptions(
          definition.dataSource,
          locale,
        );
        if (dsOptions.length > 0) {
          finalConfig.options = dsOptions;
        }
      } catch (err) {
        console.warn(`[Resolver] Failed to resolve data source for ${definition.slug}:`, err);
      }
    }

    console.log(`[Resolver] ${definition.slug}: renderer="${definition.renderer}", config keys=${Object.keys(finalConfig).join(',')}, i18n.label="${i18n.label}"`);

    return {
      Component,
      config: finalConfig,
      validations: definition.validations,
      i18n,
      dataSchema: definition.dataSchema,
      definitionId: definition.id,
      instanceId: resolvedInstanceId,
    };
  }

  /**
   * Resolve multiple instances at once (for a stage).
   * Uses cache effectively — definitions shared across instances only fetched once.
   */
  async resolveMany(
    ids: string[],
    locale: 'en' | 'ar' = 'en',
  ): Promise<ResolvedComponent[]> {
    const results: ResolvedComponent[] = [];
    for (const id of ids) {
      try {
        const resolved = await this.resolve(id, locale);
        results.push(resolved);
      } catch (err) {
        console.warn(`[ComponentResolver] Skipping component "${id}":`, err);
      }
    }
    return results;
  }

  /**
   * Pre-fetch all definitions used by a set of instances.
   * Call this on flow entry to warm the cache.
   */
  async prefetchDefinitions(definitionIds: string[]): Promise<void> {
    const uncached = definitionIds.filter((id) => !definitionCache.has(id));
    await Promise.all(
      uncached.map(async (id) => {
        const def = await this.registry.getDefinition(id);
        if (def) {
          definitionCache.set(id, def, def.version);
        }
      }),
    );
  }

  /**
   * Invalidate cached definition (called on WebSocket update events).
   */
  invalidateDefinition(definitionId: string): void {
    definitionCache.invalidate(definitionId);
  }

  /**
   * Invalidate cached instance.
   */
  invalidateInstance(instanceId: string): void {
    instanceCache.invalidate(instanceId);
  }

  // ---------------------------------------------------------------------------
  // Internal resolution steps
  // ---------------------------------------------------------------------------

  private async tryResolveInstance(
    id: string,
  ): Promise<ComponentInstance | null> {
    // Check cache first
    const cached = instanceCache.get(id);
    if (cached) return cached;

    // Fetch from Mujarrad
    const instance = await this.registry.getInstance(id);
    if (!instance) return null;

    // Validate it's actually an instance (has a definitionId) — getEntity
    // ignores the resource type, so a definition ID would return the
    // definition node parsed as an instance with definitionId=undefined.
    if (!instance.definitionId) return null;

    // Cache it (instances don't have versions, use 1)
    instanceCache.set(id, instance, 1);
    return instance;
  }

  private async resolveDefinition(
    definitionId: string,
  ): Promise<ComponentDefinition> {
    // Check cache first
    const cached = definitionCache.get(definitionId);
    if (cached) return cached;

    // Fetch from Mujarrad
    const definition = await this.registry.getDefinition(definitionId);
    if (!definition) {
      throw new Error(`Component definition "${definitionId}" not found`);
    }

    // Cache with version key
    definitionCache.set(definitionId, definition, definition.version);
    return definition;
  }

  private mergeConfig(
    defaults: Record<string, unknown>,
    overrides: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...defaults, ...overrides };
  }

  private resolveI18n(
    definition: ComponentDefinition,
    instance: ComponentInstance,
    locale: 'en' | 'ar',
  ): I18nLabels {
    const defLabels = definition.i18n[locale] ?? definition.i18n.en;
    const instanceOverrides = instance.i18nOverrides?.[locale];

    if (!instanceOverrides) return defLabels;

    return {
      label: instanceOverrides.label ?? defLabels.label,
      placeholder: instanceOverrides.placeholder ?? defLabels.placeholder,
      helpText: instanceOverrides.helpText ?? defLabels.helpText,
    };
  }

  private async resolveDataSourceOptions(
    binding: DataSourceBinding,
    locale: 'en' | 'ar' = 'en',
  ): Promise<Array<{ value: string; label: string }>> {
    if (binding.type === 'reference' && binding.datasetSlug) {
      const manager = getReferenceDataManager();
      const dataset = await manager.getDataset(binding.datasetSlug);
      if (!dataset) return [];
      return dataset.entries.map((e) => ({
        value: e.value,
        label: locale === 'ar' ? (e.label_ar ?? e.label_en) : e.label_en,
      }));
    }

    if (binding.type === 'entity' && binding.resource) {
      const entityLayer = getEntityLayer();
      const filters = binding.filters?.map((f) => ({
        field: f.field,
        operator: f.operator as 'eq',
        value: f.value as string,
      }));
      const result = await entityLayer.listEntities(binding.resource, { filters });
      const displayField = binding.displayField ?? ENTITY_REGISTRY[binding.resource]?.titleField ?? 'id';
      const valueField = binding.valueField ?? 'id';
      return result.data.map((record) => ({
        value: String((record as Record<string, unknown>)[valueField] ?? (record as Record<string, unknown>).id),
        label: String((record as Record<string, unknown>)[displayField] ?? (record as Record<string, unknown>).id),
      }));
    }

    return [];
  }

  private resolveRendererWithConfig(
    definition: ComponentDefinition,
  ): { Component: React.ComponentType<DynamicComponentProps>; schemaConfig: Record<string, unknown> } {
    // Try explicit renderer from definition
    const explicit = rendererRegistry.get(definition.renderer);
    if (explicit) {
      // Even with an explicit renderer, derive schema config as a fallback
      // (e.g. select options from dataSchema.enum when defaultConfig has none)
      const { config: schemaConfig } = resolveRendererForSchema(
        definition.dataSchema,
        definition.slug,
      );
      return { Component: explicit, schemaConfig };
    }

    // Fall back to schema-adaptive resolution (component + config)
    const { Component, config: schemaConfig } = resolveRendererForSchema(
      definition.dataSchema,
      definition.slug,
    );
    return { Component, schemaConfig };
  }
}
