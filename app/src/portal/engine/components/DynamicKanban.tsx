/**
 * DynamicKanban — a read-only Kanban board where columns are flow stages
 * and cards are flow sessions.
 *
 * Uses Tailwind flex layout for columns (no drag-and-drop for now).
 */

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FlowDefinition, FlowSession, FlowSessionStatus, StageDefinition } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DynamicKanbanProps {
  flow: FlowDefinition;
  sessions: FlowSession[];
  onSessionClick?: (session: FlowSession) => void;
  locale: 'en' | 'ar';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<FlowSessionStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  paused: 'bg-amber-500/15 text-amber-700 border-amber-300',
  completed: 'bg-sky-500/15 text-sky-700 border-sky-300',
  abandoned: 'bg-red-500/15 text-red-700 border-red-300',
};

const COLUMN_ACCENT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#ec4899', // pink
];

function stageLabel(stage: StageDefinition, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? stage.metadata.label_ar : stage.metadata.label_en;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Session Card
// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onClick,
}: {
  session: FlowSession;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/40' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium truncate">
          {session.userId}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {formatDate(session.lastActivityAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[session.status]}`}>
          {session.status}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicKanban({
  flow,
  sessions,
  onSessionClick,
  locale,
}: DynamicKanbanProps) {
  const isRtl = locale === 'ar';

  // Group sessions by their current stage
  const sessionsByStage = useMemo(() => {
    const map: Record<string, FlowSession[]> = {};
    for (const stage of flow.stages) {
      map[stage.id] = [];
    }
    for (const session of sessions) {
      if (map[session.currentStageId]) {
        map[session.currentStageId].push(session);
      }
    }
    return map;
  }, [flow.stages, sessions]);

  return (
    <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {locale === 'ar' ? flow.metadata.name_ar : flow.metadata.name_en}
        </h2>
        <span className="text-xs text-muted-foreground">
          {sessions.length} {locale === 'ar' ? '\u062C\u0644\u0633\u0629' : 'session'}{sessions.length !== 1 && locale === 'en' ? 's' : ''}
        </span>
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {flow.stages.map((stage, idx) => {
          const color = COLUMN_ACCENT_COLORS[idx % COLUMN_ACCENT_COLORS.length];
          const stageSessions = sessionsByStage[stage.id] ?? [];

          return (
            <div
              key={stage.id}
              className="flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-lg border bg-muted/30"
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-t-lg"
                style={{ backgroundColor: color }}
              >
                <span className="text-sm font-semibold text-white truncate">
                  {stageLabel(stage, locale)}
                </span>
                <span className="text-xs font-medium text-white/80 bg-white/20 rounded-full px-2 py-0.5">
                  {stageSessions.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-240px)]">
                {stageSessions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {locale === 'ar' ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0644\u0633\u0627\u062A' : 'No sessions'}
                  </p>
                )}
                {stageSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={onSessionClick ? () => onSessionClick(session) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
