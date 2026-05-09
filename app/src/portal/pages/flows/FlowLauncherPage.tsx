import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  RotateCcw,
  Workflow,
  Clock,
  Layers,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import type { FlowDefinition, FlowSession } from "../../engine/types";

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
              <CardTitle className="text-base">{flow.metadata.name_en}</CardTitle>
              {flow.metadata.description && (
                <CardDescription className="mt-0.5 line-clamp-2">
                  {flow.metadata.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">{flow.status}</Badge>
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
// Session Row (active / in-progress)
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: FlowSession;
  flowName: string;
  currentStageName: string;
  onResume: (flowId: string, sessionId: string) => void;
}

function SessionRow({ session, flowName, currentStageName, onResume }: SessionRowProps) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 border-green-200",
    paused: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    completed: "bg-blue-500/10 text-blue-700 border-blue-200",
    abandoned: "bg-red-500/10 text-red-700 border-red-200",
  };

  const lastActivity = new Date(session.lastActivityAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{flowName}</p>
          <p className="text-xs text-muted-foreground">Current stage: {currentStageName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant="outline" className={statusColors[session.status]}>{session.status}</Badge>
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{lastActivity}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onResume(session.flowId, session.id)}>
          Resume
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submission Data Preview Dialog
// ---------------------------------------------------------------------------

interface SubmissionPreviewProps {
  session: FlowSession;
  flow: FlowDefinition | undefined;
  open: boolean;
  onClose: () => void;
}

function SubmissionPreview({ session, flow, open, onClose }: SubmissionPreviewProps) {
  const stageMap = new Map(flow?.stages.map((s) => [s.id, s]) ?? []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flow?.metadata.name_en ?? "Submission"} — Data Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <div className="flex gap-4 text-muted-foreground">
            <span>User: <strong className="text-foreground">{session.userId}</strong></span>
            <span>Status: <Badge variant="outline" className="ml-1">{session.status}</Badge></span>
            {session.completedAt && (
              <span>Completed: <strong className="text-foreground">{new Date(session.completedAt).toLocaleDateString()}</strong></span>
            )}
          </div>
        </div>

        <div className="space-y-4 mt-4">
          {Object.entries(session.collectedData).map(([stageId, stageData]) => {
            const stage = stageMap.get(stageId);
            const data = stageData as Record<string, unknown>;
            if (!data || Object.keys(data).length === 0) return null;

            return (
              <div key={stageId} className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-3">
                  {stage?.metadata.label_en ?? stageId}
                </h3>
                <dl className="grid gap-2">
                  {Object.entries(data).map(([field, value]) => (
                    <div key={field} className="grid grid-cols-3 gap-2 text-sm border-b border-dashed pb-1.5 last:border-0">
                      <dt className="text-muted-foreground truncate" title={field}>{field}</dt>
                      <dd className="col-span-2 font-medium break-words">
                        {renderFieldValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}

          {Object.keys(session.collectedData).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No data collected in this session.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderFieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value || <span className="text-muted-foreground">—</span>;
  if (typeof value === "number") return String(value);

  // File upload value
  if (typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).r2Key) {
    const file = value as { name: string; size: number; r2Key: string };
    return (
      <a href={`/api/download?key=${encodeURIComponent(file.r2Key)}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {file.name}
      </a>
    );
  }

  // Array of files or values
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    // Check if array of file objects
    if (value[0] && typeof value[0] === "object" && (value[0] as Record<string, unknown>).r2Key) {
      return (
        <div className="space-y-1">
          {value.map((f, i) => {
            const file = f as { name: string; r2Key: string };
            return (
              <a key={i} href={`/api/download?key=${encodeURIComponent(file.r2Key)}`} target="_blank" rel="noopener noreferrer" className="block text-primary underline">
                {file.name}
              </a>
            );
          })}
        </div>
      );
    }
    return value.join(", ");
  }

  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Submission Row (completed)
// ---------------------------------------------------------------------------

interface SubmissionRowProps {
  session: FlowSession;
  flowName: string;
  onPreview: (session: FlowSession) => void;
}

function SubmissionRow({ session, flowName, onPreview }: SubmissionRowProps) {
  const completedAt = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const fieldCount = Object.values(session.collectedData).reduce(
    (sum, stageData) => sum + Object.keys(stageData as Record<string, unknown>).length, 0,
  );

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium">{flowName}</p>
          <p className="text-xs text-muted-foreground">
            {fieldCount} field{fieldCount === 1 ? "" : "s"} collected · {completedAt}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
          completed
        </Badge>
        <Button size="sm" variant="outline" onClick={() => onPreview(session)}>
          <Eye className="mr-1 h-3.5 w-3.5" />
          Preview
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

  const [allSessions, setAllSessions] = useState<FlowSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [previewSession, setPreviewSession] = useState<FlowSession | null>(null);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      const engine = getFlowEngine();
      const sessions = await engine.listAllSessions();
      setAllSessions(sessions);
    } catch {
      setAllSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Re-fetch after navigating back from a flow
  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [fetchSessions]);

  const flowMap = new Map(flows.map((f) => [f.id, f]));

  // Split sessions
  const activeSessions = allSessions.filter((s) => s.status === "active" || s.status === "paused");
  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const visibleSubmissions = showAllSubmissions ? completedSessions : completedSessions.slice(0, 5);

  const handleStart = (flowId: string) => navigate(`/portal/flows/${flowId}`);
  const handleResume = (flowId: string, sessionId: string) =>
    navigate(`/portal/flows/${flowId}?sessionId=${sessionId}`);

  const isLoading = flowsLoading && sessionsLoading;

  return (
    <PageShell loading={isLoading}>
      <div className="space-y-8">
        <PageHeader title="Flows" subtitle="Launch and manage your workflow journeys" />

        {/* Available Flows */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Available Flows</h2>
          {flowsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full mt-2" /></CardHeader>
                  <CardContent><Skeleton className="h-9 w-20" /></CardContent>
                </Card>
              ))}
            </div>
          ) : flows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Workflow className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No active flows available.</p>
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
        {(sessionsLoading || activeSessions.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">In Progress</h2>
            {sessionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => {
                  const flow = flowMap.get(session.flowId);
                  return (
                    <SessionRow
                      key={session.id}
                      session={session}
                      flowName={flow?.metadata.name_en ?? session.flowId}
                      currentStageName={flow?.stages.find((s) => s.id === session.currentStageId)?.metadata.label_en ?? session.currentStageId}
                      onResume={handleResume}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Completed Submissions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Submissions ({completedSessions.length})
            </h2>
          </div>

          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : completedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No completed submissions yet. Start a flow and complete it to see data here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleSubmissions.map((session) => {
                const flow = flowMap.get(session.flowId);
                return (
                  <SubmissionRow
                    key={session.id}
                    session={session}
                    flowName={flow?.metadata.name_en ?? session.flowId}
                    onPreview={setPreviewSession}
                  />
                );
              })}

              {completedSessions.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAllSubmissions(!showAllSubmissions)}
                >
                  {showAllSubmissions ? (
                    <><ChevronUp className="mr-1 h-4 w-4" />Show less</>
                  ) : (
                    <><ChevronDown className="mr-1 h-4 w-4" />Show all {completedSessions.length} submissions</>
                  )}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Submission Preview Dialog */}
      {previewSession && (
        <SubmissionPreview
          session={previewSession}
          flow={flowMap.get(previewSession.flowId)}
          open={!!previewSession}
          onClose={() => setPreviewSession(null)}
        />
      )}
    </PageShell>
  );
}
