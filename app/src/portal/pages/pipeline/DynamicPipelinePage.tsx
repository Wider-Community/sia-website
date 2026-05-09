/**
 * DynamicPipelinePage — Kanban pipeline view for dynamic flows.
 *
 * Shows a flow selector at the top and renders flow sessions as cards
 * grouped by stage columns using the DynamicKanban component.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../components/PageShell';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { DynamicKanban } from '../../engine/components/DynamicKanban';
import { useFlowEngine } from '../../engine/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';
import type { FlowDefinition, FlowSession } from '../../engine/types';

export function DynamicPipelinePage() {
  const navigate = useNavigate();
  const { flows, loading: flowsLoading, listSessions } = useFlowEngine({ status: 'published' });

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [sessions, setSessions] = useState<FlowSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Auto-select first flow when flows load
  useEffect(() => {
    if (flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  // Update selected flow object when selection changes
  useEffect(() => {
    if (selectedFlowId) {
      const flow = flows.find((f) => f.id === selectedFlowId) ?? null;
      setSelectedFlow(flow);
    } else {
      setSelectedFlow(null);
    }
  }, [selectedFlowId, flows]);

  // Fetch sessions when selected flow changes
  useEffect(() => {
    if (!selectedFlowId) {
      setSessions([]);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);

    listSessions(selectedFlowId)
      .then((result) => {
        if (!cancelled) {
          setSessions(result);
          setSessionsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSessionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFlowId, listSessions]);

  const handleSessionClick = useCallback(
    (session: FlowSession) => {
      navigate(`/portal/flows/${session.flowId}?sessionId=${session.id}`);
    },
    [navigate],
  );

  const handleFlowChange = useCallback((flowId: string) => {
    setSelectedFlowId(flowId);
    setSessions([]);
  }, []);

  const isLoading = flowsLoading || sessionsLoading;

  // Empty state: no flows at all
  if (!flowsLoading && flows.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Dynamic Pipeline" />
        <EmptyState
          icon={Layers}
          title="No flows available"
          description="There are no published flows yet. Create a flow in the control board to get started."
        />
      </PageShell>
    );
  }

  return (
    <PageShell loading={flowsLoading}>
      <PageHeader
        title="Dynamic Pipeline"
        subtitle="Kanban view of flow sessions grouped by stage"
      />

      {/* Flow selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Flow</label>
        <Select
          value={selectedFlowId ?? ''}
          onValueChange={handleFlowChange}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a flow" />
          </SelectTrigger>
          <SelectContent>
            {flows.map((flow) => (
              <SelectItem key={flow.id} value={flow.id}>
                {flow.metadata.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sessionsLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Loading sessions...
          </span>
        )}
      </div>

      {/* Kanban board */}
      {selectedFlow && !isLoading && (
        <DynamicKanban
          flow={selectedFlow}
          sessions={sessions}
          onSessionClick={handleSessionClick}
          locale="en"
        />
      )}

      {/* Empty sessions state */}
      {selectedFlow && !sessionsLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No sessions for this flow
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Sessions will appear here once users start this flow.
          </p>
        </div>
      )}
    </PageShell>
  );
}
