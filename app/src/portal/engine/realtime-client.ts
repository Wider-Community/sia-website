/**
 * Dynamic Component Engine — Real-Time WebSocket Client
 *
 * Connects to a WebSocket endpoint for server-side node mutation events,
 * maps them to EngineEvent types, and emits on the engineEventBus.
 * Falls back to polling if WebSocket is unavailable.
 */

import type { EngineEvent, EngineEventType } from './types';
import { engineEventBus } from './event-bus';
import { definitionCache, instanceCache } from './cache-manager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RealtimeConnectionMode = 'websocket' | 'polling' | 'disconnected';

export interface RealtimeClientOptions {
  /** WebSocket URL. Defaults to Mujarrad API URL with https→wss / http→ws. */
  url?: string;
  /** Maximum reconnect delay in ms. Default: 30 000. */
  reconnectMaxDelay?: number;
  /** Polling interval in ms when falling back. Default: 30 000. */
  pollFallbackInterval?: number;
  /** Called whenever the connection state changes. */
  onConnectionChange?: (connected: boolean) => void;
}

interface SubscriptionFilter {
  nodeIds?: string[];
  types?: string[];
}

/** Shape of a message received from the WS server. */
interface ServerMessage {
  type: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_API_URL =
  (typeof import.meta !== 'undefined'
    ? (import.meta as Record<string, Record<string, string>>).env?.VITE_MUJARRAD_API_URL ??
      (import.meta as Record<string, Record<string, string>>).env?.VITE_API_BASE_URL
    : undefined) ?? 'https://mujarrad.onrender.com';

function deriveWsUrl(apiUrl: string): string {
  return apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
}

/** Gap threshold for full cache invalidation on reconnect (5 minutes). */
const RECONNECT_GAP_THRESHOLD = 5 * 60 * 1000;

/** Known EngineEvent types that the WS server may push. */
const KNOWN_EVENT_TYPES = new Set<string>([
  'definition.updated',
  'definition.created',
  'definition.deleted',
  'flow.restructured',
  'flow.started',
  'flow.completed',
  'flow.abandoned',
  'stage.entered',
  'stage.submitted',
  'stage.skipped',
  'component.value_changed',
  'component.action_triggered',
  'branch.selected',
  'match.discovered',
  'match.accepted',
  'match.rejected',
  'data.extracted',
  'data.threshold_breached',
  'notification.delivered',
  'notification.acknowledged',
  'notification.escalated',
]);

// ---------------------------------------------------------------------------
// RealtimeClient
// ---------------------------------------------------------------------------

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: Required<RealtimeClientOptions>;
  private _connected = false;
  private _mode: RealtimeConnectionMode = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageAt: number = Date.now();
  private disconnectedAt: number | null = null;
  private subscriptions: SubscriptionFilter[] = [];
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private connectionChangeListeners = new Set<(connected: boolean) => void>();

  constructor(options?: RealtimeClientOptions) {
    this.options = {
      url: options?.url ?? deriveWsUrl(DEFAULT_API_URL),
      reconnectMaxDelay: options?.reconnectMaxDelay ?? 30_000,
      pollFallbackInterval: options?.pollFallbackInterval ?? 30_000,
      onConnectionChange: options?.onConnectionChange ?? (() => {}),
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Current connection state. */
  get connected(): boolean {
    return this._connected;
  }

  /** Current connection mode. */
  get mode(): RealtimeConnectionMode {
    return this._mode;
  }

  /** Register a listener for connection-state changes. Returns unsubscribe. */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionChangeListeners.add(listener);
    return () => {
      this.connectionChangeListeners.delete(listener);
    };
  }

  /** Register a listener for mode changes. Returns unsubscribe. */
  onModeChange(listener: (mode: RealtimeConnectionMode) => void): () => void {
    // Wrap into the connection-change listener — mode is derived from connected + ws state
    const wrapped = () => listener(this._mode);
    this.connectionChangeListeners.add(wrapped as (connected: boolean) => void);
    return () => {
      this.connectionChangeListeners.delete(wrapped as (connected: boolean) => void);
    };
  }

  /** Open the WebSocket connection. */
  connect(): void {
    this.destroyed = false;
    this.attemptWebSocket();
  }

  /** Gracefully close the connection and stop polling. */
  disconnect(): void {
    this.destroyed = true;
    this.cleanup();
    this.setMode('disconnected', false);
  }

  /** Subscribe to events matching the given filter (additive). */
  subscribe(filter: SubscriptionFilter): void {
    this.subscriptions.push(filter);
    this.sendSubscriptions();
  }

  /** Remove a subscription matching the given filter. */
  unsubscribe(filter: SubscriptionFilter): void {
    this.subscriptions = this.subscriptions.filter(
      (s) =>
        JSON.stringify(s) !== JSON.stringify(filter),
    );
    this.sendSubscriptions();
  }

  // -----------------------------------------------------------------------
  // WebSocket lifecycle
  // -----------------------------------------------------------------------

  private attemptWebSocket(): void {
    if (this.destroyed) return;

    try {
      this.ws = new WebSocket(this.options.url);
    } catch {
      // WebSocket constructor can throw in some environments (e.g. SSR)
      this.fallbackToPolling();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;

      // If we were disconnected for > 5 min, invalidate all caches
      if (
        this.disconnectedAt !== null &&
        Date.now() - this.disconnectedAt > RECONNECT_GAP_THRESHOLD
      ) {
        this.invalidateAllCaches();
      }
      this.disconnectedAt = null;

      this.setMode('websocket', true);
      this.stopPolling();
      this.sendSubscriptions();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.lastMessageAt = Date.now();
      this.handleMessage(event.data);
    };

    this.ws.onerror = () => {
      // onerror is always followed by onclose — handle reconnect there
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.destroyed) return;

      if (this._mode === 'websocket') {
        // Track when we lost the connection
        this.disconnectedAt = this.disconnectedAt ?? Date.now();
      }

      this.setMode('disconnected', false);
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;

    const baseDelay = 1000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempt),
      this.options.reconnectMaxDelay,
    );
    this.reconnectAttempt++;

    // After several failed attempts, fall back to polling
    if (this.reconnectAttempt > 5) {
      this.fallbackToPolling();
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptWebSocket();
    }, delay);
  }

  // -----------------------------------------------------------------------
  // Message handling
  // -----------------------------------------------------------------------

  private handleMessage(raw: unknown): void {
    let msg: ServerMessage;
    try {
      msg =
        typeof raw === 'string'
          ? (JSON.parse(raw) as ServerMessage)
          : (raw as ServerMessage);
    } catch {
      console.warn('[RealtimeClient] Failed to parse WS message:', raw);
      return;
    }

    if (!msg.type || !KNOWN_EVENT_TYPES.has(msg.type)) {
      // Unknown event type — ignore silently
      return;
    }

    // Build the EngineEvent from the server payload
    const engineEvent = {
      type: msg.type,
      ...msg.payload,
    } as EngineEvent;

    // Side-effects: cache invalidation for definition / flow events
    this.handleCacheInvalidation(engineEvent);

    // Emit on the shared event bus
    engineEventBus.emit(engineEvent);
  }

  private handleCacheInvalidation(event: EngineEvent): void {
    switch (event.type) {
      case 'definition.updated':
      case 'definition.deleted':
        definitionCache.invalidate(event.nodeId);
        break;
      case 'definition.created':
        // No cache to invalidate, but downstream listeners may want to refresh
        break;
      case 'flow.restructured':
        // Invalidate any cached instances that belong to this flow
        instanceCache.invalidateWhere((_key, entry) => {
          return entry.data.placement?.flowId === event.flowId;
        });
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Subscription management
  // -----------------------------------------------------------------------

  private sendSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      this.ws.send(
        JSON.stringify({
          action: 'subscribe',
          filters: this.subscriptions,
        }),
      );
    } catch {
      // Silently fail — the connection may have been closed between check and send
    }
  }

  // -----------------------------------------------------------------------
  // Polling fallback
  // -----------------------------------------------------------------------

  private fallbackToPolling(): void {
    if (this.destroyed) return;
    this.startPolling();
    this.setMode('polling', false);
  }

  private startPolling(): void {
    this.stopPolling();
    if (this.destroyed) return;

    // Immediate first poll
    this.pollForChanges().catch(() => {});

    this.pollTimer = setInterval(() => {
      this.pollForChanges().catch(() => {});
    }, this.options.pollFallbackInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollForChanges(): Promise<void> {
    // Polling implementation:
    // We attempt to fetch recent changes from a REST endpoint.
    // If the endpoint is unavailable, we periodically retry the WS connection.
    try {
      const apiUrl = this.options.url
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');

      const since = new Date(this.lastMessageAt).toISOString();
      const response = await fetch(
        `${apiUrl}/api/engine/changes?since=${encodeURIComponent(since)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      );

      if (!response.ok) {
        // Endpoint might not exist yet — try to reconnect via WS
        this.retryWebSocketFromPolling();
        return;
      }

      const changes = (await response.json()) as ServerMessage[];
      for (const change of changes) {
        this.handleMessage(JSON.stringify(change));
      }

      this.lastMessageAt = Date.now();
    } catch {
      // Network error — try to re-establish WS
      this.retryWebSocketFromPolling();
    }
  }

  /** While polling, periodically try to upgrade back to WebSocket. */
  private retryWebSocketFromPolling(): void {
    // Only retry WS every 5th poll cycle to avoid excessive attempts
    if (this.reconnectAttempt % 5 === 0) {
      this.stopPolling();
      this.reconnectAttempt = 0;
      this.attemptWebSocket();
    }
    this.reconnectAttempt++;
  }

  // -----------------------------------------------------------------------
  // State management
  // -----------------------------------------------------------------------

  private setMode(mode: RealtimeConnectionMode, connected: boolean): void {
    const changed = this._mode !== mode || this._connected !== connected;
    this._mode = mode;
    this._connected = connected;

    if (changed) {
      this.options.onConnectionChange(connected);
      for (const listener of this.connectionChangeListeners) {
        try {
          listener(connected);
        } catch {
          // Swallow listener errors
        }
      }
    }
  }

  private invalidateAllCaches(): void {
    definitionCache.clear();
    instanceCache.clear();
    console.info(
      '[RealtimeClient] Reconnected after >5 min gap — all caches invalidated.',
    );
  }

  private cleanup(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPolling();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.reconnectAttempt = 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const realtimeClient = new RealtimeClient();
