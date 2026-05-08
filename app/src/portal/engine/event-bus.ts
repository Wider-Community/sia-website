/**
 * Dynamic Component Engine — Event Bus
 *
 * Lightweight typed pub/sub event bus that decouples engine modules.
 * The notification engine subscribes to all events; the flow engine emits
 * stage transitions; components emit value changes.
 */

import type { EngineEvent, EngineEventType } from './types';

type EventHandler = (event: EngineEvent) => void;
type TypedEventHandler<T extends EngineEventType> = (
  event: Extract<EngineEvent, { type: T }>,
) => void;
type Unsubscribe = () => void;

class EngineEventBus {
  private globalHandlers: Set<EventHandler> = new Set();
  private typedHandlers: Map<EngineEventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to ALL events emitted on the bus.
   * Returns an unsubscribe function.
   */
  subscribe(handler: EventHandler): Unsubscribe {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to a specific event type.
   * Returns an unsubscribe function.
   */
  subscribeToType<T extends EngineEventType>(
    type: T,
    handler: TypedEventHandler<T>,
  ): Unsubscribe {
    let handlers = this.typedHandlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.typedHandlers.set(type, handlers);
    }
    // Cast is safe: we only call this handler with events matching `type`
    const wrapped = handler as EventHandler;
    handlers.add(wrapped);
    return () => {
      handlers!.delete(wrapped);
      if (handlers!.size === 0) {
        this.typedHandlers.delete(type);
      }
    };
  }

  /**
   * Emit an event to all relevant subscribers.
   * Global handlers are called first, then typed handlers for the event type.
   * Each handler is wrapped in try/catch so one failure doesn't block others.
   */
  emit(event: EngineEvent): void {
    // Global handlers first
    for (const handler of this.globalHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(
          `[EngineEventBus] Error in global handler for "${event.type}":`,
          error,
        );
      }
    }

    // Typed handlers matching the event type
    const handlers = this.typedHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(
            `[EngineEventBus] Error in typed handler for "${event.type}":`,
            error,
          );
        }
      }
    }
  }

  /**
   * Get the number of subscribers.
   * If a type is provided, returns the count for that specific type.
   * Otherwise, returns the total count across all handlers.
   */
  getSubscriberCount(type?: EngineEventType): number {
    if (type !== undefined) {
      return (this.typedHandlers.get(type)?.size ?? 0);
    }
    let count = this.globalHandlers.size;
    for (const handlers of this.typedHandlers.values()) {
      count += handlers.size;
    }
    return count;
  }

  /**
   * Remove all subscribers. Useful for cleanup and testing.
   */
  clear(): void {
    this.globalHandlers.clear();
    this.typedHandlers.clear();
  }
}

/** Singleton event bus instance shared across all engine modules. */
export const engineEventBus = new EngineEventBus();

export { EngineEventBus };
export type { EventHandler, TypedEventHandler, Unsubscribe };
