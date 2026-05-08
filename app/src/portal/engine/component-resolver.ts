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
   * Resolve a component instance into a renderable component.
   * This is the main entry point for the engine.
   */
  async resolve(
    instanceId: string,
    locale: 'en' | 'ar' = 'en',
  ): Promise<ResolvedComponent> {
    // 1. Get instance (from cache or fetch)
    const instance = await this.resolveInstance(instanceId);

    // 2. Get definition (from cache or fetch)
    const definition = await this.resolveDefinition(instance.definitionId);

    // 3. Merge config (definition defaults + instance overrides)
    const config = this.mergeConfig(
      definition.defaultConfig,
      instance.configOverrides,
    );

    // 4. Resolve i18n (definition labels + instance overrides)
    const i18n = this.resolveI18n(definition, instance, locale);

    // 5. Get renderer component
    const Component = this.resolveRenderer(definition);

    return {
      Component,
      config,
      validations: definition.validations,
      i18n,
      dataSchema: definition.dataSchema,
      definitionId: definition.id,
      instanceId: instance.id,
    };
  }

  /**
   * Resolve multiple instances at once (for a stage).
   * Uses cache effectively — definitions shared across instances only fetched once.
   */
  async resolveMany(
    instanceIds: string[],
    locale: 'en' | 'ar' = 'en',
  ): Promise<ResolvedComponent[]> {
    return Promise.all(instanceIds.map((id) => this.resolve(id, locale)));
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

  private async resolveInstance(
    instanceId: string,
  ): Promise<ComponentInstance> {
    // Check cache first
    const cached = instanceCache.get(instanceId);
    if (cached) return cached;

    // Fetch from Mujarrad
    const instance = await this.registry.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Component instance "${instanceId}" not found`);
    }

    // Cache it (instances don't have versions, use 1)
    instanceCache.set(instanceId, instance, 1);
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

  private resolveRenderer(
    definition: ComponentDefinition,
  ): React.ComponentType<DynamicComponentProps> {
    // Try explicit renderer from definition
    const explicit = rendererRegistry.get(definition.renderer);
    if (explicit) return explicit;

    // Fall back to schema-adaptive resolution
    const { Component } = resolveRendererForSchema(
      definition.dataSchema,
      definition.slug,
    );
    return Component;
  }
}
