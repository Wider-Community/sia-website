import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  RotateCcw,
  Workflow,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import type { FlowDefinition, FlowSession } from "../../engine/types";

// ---------------------------------------------------------------------------
// Session listing helper — the FlowEngine doesn't expose listSessions
// through the hook, so we call the entity layer via getFlowEngine().
// ---------------------------------------------------------------------------

async function fetchUserSessions(): Promise<FlowSession[]> {
  try {
    const engine = getFlowEngine();
    // Use the entity layer indirectly — we rely on the flow engine's getSession
    // being available. Since there's no listSessions, we work with what we have.
    // In a real scenario, this would call a dedicated endpoint.
    // For now, return empty — sessions will be available once the backend provides
    // a list endpoint. The UI structure is ready.
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Flow Card
// ---------------------------------------------------------------------------

interface FlowCardProps {
  flow: FlowDefinition;
  onStart: (flowId: string) => void;
}

function FlowCard({ flow, onStart }: FlowCardProps) {
  const stageCount = flow.stages.length;

  return (
    <Card className="group transition-all hover:shadow-md hover:border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {flow.metadata.name_en}
              </CardTitle>
              {flow.metadata.description && (
                <CardDescription className="mt-0.5 line-clamp-2">
                  {flow.metadata.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {flow.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {stageCount} {stageCount === 1 ? "stage" : "stages"}
            </span>
            <span>v{flow.version}</span>
          </div>
          <Button size="sm" onClick={() => onStart(flow.id)}>
            <Play className="mr-1 h-3.5 w-3.5" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Session Row
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: FlowSession;
  flowName: string;
  currentStageName: string;
  onResume: (flowId: string, sessionId: string) => void;
}

function SessionRow({
  session,
  flowName,
  currentStageName,
  onResume,
}: SessionRowProps) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 border-green-200",
    paused: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    completed: "bg-blue-500/10 text-blue-700 border-blue-200",
    abandoned: "bg-red-500/10 text-red-700 border-red-200",
  };

  const lastActivity = new Date(session.lastActivityAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{flowName}</p>
          <p className="text-xs text-muted-foreground">
            Current stage: {currentStageName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant="outline" className={statusColors[session.status]}>
            {session.status}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastActivity}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onResume(session.flowId, session.id)}
        >
          Resume
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FlowLauncherPage
// ---------------------------------------------------------------------------

export function FlowLauncherPage() {
  const navigate = useNavigate();
  const { flows, loading: flowsLoading } = useFlowEngine({ status: "active" });

  const [sessions, setSessions] = useState<FlowSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Fetch active sessions
  useEffect(() => {
    fetchUserSessions()
      .then((s) => setSessions(s.filter((sess) => sess.status === "active" || sess.status === "paused")))
      .finally(() => setSessionsLoading(false));
  }, []);

  // Build a lookup from flow id to flow
  const flowMap = new Map(flows.map((f) => [f.id, f]));

  const handleStart = (flowId: string) => {
    navigate(`/portal/flows/${flowId}`);
  };

  const handleResume = (flowId: string, sessionId: string) => {
    navigate(`/portal/flows/${flowId}?sessionId=${sessionId}`);
  };

  const isLoading = flowsLoading && sessionsLoading;

  return (
    <PageShell loading={isLoading}>
      <div className="space-y-8">
        <PageHeader
          title="Flows"
          subtitle="Launch and manage your workflow journeys"
        />

        {/* Available Flows */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Available Flows
          </h2>

          {flowsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-9 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : flows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Workflow className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No active flows available.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {flows.map((flow) => (
                <FlowCard key={flow.id} flow={flow} onStart={handleStart} />
              ))}
            </div>
          )}
        </section>

        {/* Active Sessions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Your Sessions
          </h2>

          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No active sessions. Start a flow above to begin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionFlow = flowMap.get(session.flowId);
                const flowName =
                  sessionFlow?.metadata.name_en ?? session.flowId;
                const currentStage = sessionFlow?.stages.find(
                  (s) => s.id === session.currentStageId,
                );
                const stageName =
                  currentStage?.metadata.label_en ?? session.currentStageId;

                return (
                  <SessionRow
                    key={session.id}
                    session={session}
                    flowName={flowName}
                    currentStageName={stageName}
                    onResume={handleResume}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
