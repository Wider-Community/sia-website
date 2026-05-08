/**
 * Dynamic Component Engine — Connection Status Indicator
 *
 * Small UI indicator showing real-time connection health:
 *   Green dot  = WebSocket connected
 *   Yellow dot = Polling fallback
 *   Red dot    = Disconnected
 */

import React from 'react';
import { useRealtimeStatus } from '../hooks';
import type { RealtimeConnectionMode } from '../realtime-client';

export interface ConnectionStatusProps {
  /** Show the text label next to the dot. Default: true. */
  showLabel?: boolean;
  /** Additional CSS class name for the wrapper. */
  className?: string;
}

const MODE_CONFIG: Record<
  RealtimeConnectionMode,
  { color: string; label: string; title: string }
> = {
  websocket: {
    color: '#22c55e', // green-500
    label: 'Connected',
    title: 'Real-time connection active (WebSocket)',
  },
  polling: {
    color: '#eab308', // yellow-500
    label: 'Polling',
    title: 'Polling for updates (WebSocket unavailable)',
  },
  disconnected: {
    color: '#ef4444', // red-500
    label: 'Disconnected',
    title: 'No connection to server',
  },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showLabel = true,
  className,
}) => {
  const { mode } = useRealtimeStatus();
  const config = MODE_CONFIG[mode];

  return (
    <span
      className={className}
      title={config.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: mode === 'websocket' ? `0 0 4px ${config.color}` : 'none',
        }}
        aria-hidden="true"
      />
      {showLabel && (
        <span style={{ color: '#6b7280', userSelect: 'none' }}>
          {config.label}
        </span>
      )}
    </span>
  );
};
