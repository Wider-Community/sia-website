/**
 * Dynamic Component Engine — Renderer Registry
 *
 * Maps string renderer keys to React components.
 * Pre-registers built-in renderers and allows runtime registration of custom ones.
 */

import type { DynamicComponentProps } from './types';
import { BUILT_IN_RENDERERS, FallbackRenderer } from './renderers/index.js';

class RendererRegistry {
  private renderers: Map<
    string,
    React.ComponentType<DynamicComponentProps>
  > = new Map();

  constructor() {
    // Pre-register all built-in renderers
    for (const [key, component] of Object.entries(BUILT_IN_RENDERERS)) {
      this.renderers.set(key, component);
    }
  }

  /** Register a renderer component for a given key. */
  register(
    key: string,
    component: React.ComponentType<DynamicComponentProps>,
  ): void {
    this.renderers.set(key, component);
  }

  /** Get the renderer for a key, or undefined if not registered. */
  get(key: string): React.ComponentType<DynamicComponentProps> | undefined {
    return this.renderers.get(key);
  }

  /** Check if a renderer key is registered. */
  has(key: string): boolean {
    return this.renderers.has(key);
  }

  /** Get all registered renderer keys. */
  getAll(): string[] {
    return Array.from(this.renderers.keys());
  }

  /** Get the fallback renderer for unknown types. */
  getFallback(): React.ComponentType<DynamicComponentProps> {
    return FallbackRenderer;
  }
}

/** Singleton renderer registry shared across the engine. */
export const rendererRegistry = new RendererRegistry();

export { RendererRegistry };
