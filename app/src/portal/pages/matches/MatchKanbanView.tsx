/**
 * MatchKanbanView — Kanban board for all Deal Matching flow sessions.
 *
 * URL: /portal/matches/kanban
 *
 * Fetches the "deal-matching" flow definition and all its sessions,
 * then renders them on a DynamicKanban board. Cards show organization
 * names (from collectedData), match score, and session status.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import { DynamicKanban } from "../../engine/components/DynamicKanban";
import type { FlowDefinition, FlowSession, FlowSessionStatus, StageDefinition } from "../../engine/types";

const DEAL_MATCHING_SLUG = "deal-matching-flow";

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<FlowSessionStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  paused: "bg-amber-500/15 text-amber-700 border-amber-300",
  completed: "bg-sky-500/15 text-sky-700 border-sky-300",
  abandoned: "bg-red-500/15 text-red-700 border-red-300",
};

// ---------------------------------------------------------------------------
// Enhanced Session Card for matching context
// ---------------------------------------------------------------------------

function MatchSessionCard({
  session,
  stage,
  onClick,
}: {
  session: FlowSession;
  stage?: StageDefinition;
  onClick: () => void;
}) {
  // Extract org summary and deal info from collected data
  const orgProfileData = session.collectedData["stage-org-profile"] ?? {};
  const criteriaData = session.collectedData["stage-criteria"] ?? {};

  const orgSummary = orgProfileData["comp-org-summary"]
    ? String(orgProfileData["comp-org-summary"]).slice(0, 60)
    : null;
  const dealSector = orgProfileData["comp-deal-sector"]
    ? String(orgProfileData["comp-deal-sector"])
    : null;
  const dealSize = orgProfileData["comp-deal-size"]
    ? Number(orgProfileData["comp-deal-size"])
    : null;
  const targetCountries = criteriaData["comp-target-countries"];

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm font-medium truncate">
          {orgSummary ?? `Session ${session.id.slice(0, 8)}`}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {formatDate(session.lastActivityAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[session.status]}`}>
            {session.status}
          </Badge>
          {dealSector && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {dealSector}
            </Badge>
          )}
        </div>
        {dealSize !== null && (
          <p className="text-xs text-muted-foreground">
            Deal: <span className="font-medium">${dealSize.toLocaleString()}</span>
          </p>
        )}
        {Array.isArray(targetCountries) && targetCountries.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Countries: <span className="font-medium">{(targetCountries as string[]).join(", ")}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main MatchKanbanView
// ---------------------------------------------------------------------------

export function MatchKanbanView() {
  const navigate = useNavigate();
  const { flows, loading: flowsLoading } = useFlowEngine({ status: "active" });

  const [flow, setFlow] = useState<FlowDefinition | null>(null);
  const [sessions, setSessions] = useState<FlowSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [flowNotFound, setFlowNotFound] = useState(false);

  // Locate the deal-matching flow
  useEffect(() => {
    if (flowsLoading) return;

    const found = flows.find((f) => f.slug === DEAL_MATCHING_SLUG);
    if (found) {
      setFlow(found);
      setFlowNotFound(false);
    } else {
      setFlowNotFound(true);
      setLoading(false);
    }
  }, [flows, flowsLoading]);

  // Fetch all sessions for the flow
  useEffect(() => {
    if (!flow) return;

    setLoading(true);
    getFlowEngine()
      .listSessions(flow.id)
      .then((results) => {
        setSessions(results);
      })
      .catch(() => {
        setSessions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [flow]);

  // Build a stage map for the enhanced cards
  const stageMap = useMemo(() => {
    if (!flow) return {};
    const map: Record<string, StageDefinition> = {};
    for (const stage of flow.stages) {
      map[stage.id] = stage;
    }
    return map;
  }, [flow]);

  // Group sessions by stage for our custom rendering
  const sessionsByStage = useMemo(() => {
    if (!flow) return {};
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
  }, [flow, sessions]);

  const handleSessionClick = (session: FlowSession) => {
    navigate(`/portal/matches/flow?sessionId=${session.id}`);
  };

  const isLoading = flowsLoading || loading;

  // Stats
  const activeCount = sessions.filter((s) => s.status === "active").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  return (
    <PageShell loading={isLoading}>
      <PageHeader
        title="Match Flow Kanban"
        backTo="/portal/matches"
        subtitle={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} across ${flow?.stages.length ?? 0} stages`}
        actions={
          <Button onClick={() => navigate("/portal/matches/flow")}>
            <Plus className="mr-2 h-4 w-4" />
            New Match Flow
          </Button>
        }
      />

      {/* Flow not found */}
      {!isLoading && flowNotFound && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Deal Matching flow not found. Seed the engine from the Control Board.
            </p>
            <Button variant="outline" onClick={() => navigate("/portal/control-board")}>
              Go to Control Board
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      {flow && !isLoading && (
        <div className="flex gap-4">
          <div className="rounded-lg border px-4 py-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{sessions.length}</p>
          </div>
          <div className="rounded-lg border px-4 py-2">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-emerald-600">{activeCount}</p>
          </div>
          <div className="rounded-lg border px-4 py-2">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold text-sky-600">{completedCount}</p>
          </div>
        </div>
      )}

      {/* Kanban board */}
      {flow && !isLoading && (
        <DynamicKanban
          flow={flow}
          sessions={sessions}
          onSessionClick={handleSessionClick}
          locale="en"
        />
      )}
    </PageShell>
  );
}
