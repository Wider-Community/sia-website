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
} from './types';
import { definitionCache, instanceCache } from './cache-manager';
import { rendererRegistry } from './renderer-registry';
import { resolveRendererForSchema } from './schema-adaptive';
import type { ComponentRegistry } from './component-registry';

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
