import { useOne, useUpdate, useCreate, useDelete, useCustomMutation } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Building2,
  CalendarDays,
  Link2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  Check,
} from "lucide-react";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import type { FlowDefinition, FlowSession, StageDefinition } from "../../engine/types";

const CATEGORY_TO_ENGAGEMENT: Record<string, string> = {
  investment: "deal",
  partnership: "initiative",
  joint_venture: "deal",
  technology: "project",
  regulatory: "regulatory",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
    case "accepted_a":
      return <Badge variant="secondary" className="text-blue-600">Accepted (A)</Badge>;
    case "accepted_b":
      return <Badge variant="secondary" className="text-blue-600">Accepted (B)</Badge>;
    case "mutual":
      return <Badge variant="default" className="text-green-600 bg-green-100 border-green-300">Mutual</Badge>;
    case "declined":
      return <Badge variant="outline" className="text-red-600 border-red-300">Declined</Badge>;
    case "expired":
      return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const categoryBadge = (category: string) => (
  <Badge variant="secondary" className="capitalize">
    {category.replace(/_/g, " ")}
  </Badge>
);

// ---------------------------------------------------------------------------
// Match Flow Tab — shows flow session progress for this match
// ---------------------------------------------------------------------------

function MatchFlowTab() {
  const navigate = useNavigate();
  const { flows, loading: flowsLoading } = useFlowEngine({ status: "active" });

  const [flow, setFlow] = useState<FlowDefinition | null>(null);
  const [sessions, setSessions] = useState<FlowSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [flowNotFound, setFlowNotFound] = useState(false);

  useEffect(() => {
    if (flowsLoading) return;
    const found = flows.find((f) => f.slug === "deal-matching-flow");
    if (found) {
      setFlow(found);
      setFlowNotFound(false);
    } else {
      setFlowNotFound(true);
      setLoading(false);
    }
  }, [flows, flowsLoading]);

  useEffect(() => {
    if (!flow) return;
    setLoading(true);
    getFlowEngine()
      .listSessions(flow.id)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [flow]);

  if (flowsLoading || loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading flow data...
        </CardContent>
      </Card>
    );
  }

  if (flowNotFound) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Deal Matching flow not found. Seed the engine from the Control Board.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/portal/control-board")}>
            Go to Control Board
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!flow) return null;

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No matching flow sessions yet.</p>
          <Button size="sm" onClick={() => navigate("/portal/matches/flow")}>
            <Zap className="mr-2 h-4 w-4" />
            Start Match Flow
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const currentStage = flow.stages.find((s) => s.id === session.currentStageId);
        const currentIndex = flow.stages.findIndex((s) => s.id === session.currentStageId);
        const progress = flow.stages.length > 0
          ? Math.round(((session.visitedStages.length) / flow.stages.length) * 100)
          : 0;

        return (
          <Card
            key={session.id}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/40"
            onClick={() => navigate(`/portal/matches/flow?sessionId=${session.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Session {session.id.slice(0, 8)}</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    session.status === "completed"
                      ? "bg-sky-500/15 text-sky-700 border-sky-300"
                      : session.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
                        : ""
                  }
                >
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Stage progress */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {currentStage ? currentStage.metadata.label_en : "Unknown"} (Stage{" "}
                    {currentIndex + 1} of {flow.stages.length})
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Stage list with check marks */}
              <div className="flex gap-2 flex-wrap">
                {flow.stages.map((stage) => {
                  const visited = session.visitedStages.includes(stage.id);
                  const isCurrent = stage.id === session.currentStageId;
                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
                        isCurrent
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : visited
                            ? "border-primary/30 text-primary/70"
                            : "border-muted text-muted-foreground"
                      }`}
                    >
                      {visited && !isCurrent && <Check className="h-3 w-3" />}
                      {stage.metadata.label_en}
                    </div>
                  );
                })}
              </div>

              {/* Collected data summary */}
              {Object.keys(session.collectedData).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Data collected for{" "}
                  {Object.keys(session.collectedData).length} stage
                  {Object.keys(session.collectedData).length !== 1 ? "s" : ""}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MatchDetailPage
// ---------------------------------------------------------------------------

export function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { query: matchQuery } = useOne({ resource: "matches", id: id! });
  const match = matchQuery.data?.data;

  const { query: orgAQuery } = useOne({
    resource: "organizations",
    id: (match?.organizationAId as string) ?? "",
    queryOptions: { enabled: !!match?.organizationAId },
  });
  const orgA = orgAQuery.data?.data;
  const orgAName = (orgA?.name as string) ?? "Organization A";

  const { query: orgBQuery } = useOne({
    resource: "organizations",
    id: (match?.organizationBId as string) ?? "",
    queryOptions: { enabled: !!match?.organizationBId },
  });
  const orgB = orgBQuery.data?.data;
  const orgBName = (orgB?.name as string) ?? "Organization B";

  const { mutate: updateMatch } = useUpdate();
  const { mutate: createEngagement } = useCreate();
  const { mutate: createOrgConnection } = useCustomMutation();
  const { mutate: deleteMatch } = useDelete();

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const status = (match?.status as string) ?? "";

  const handleAccept = (side: "a" | "b") => {
    const currentStatus = match?.status as string;
    const otherAccepted = side === "a" ? "accepted_b" : "accepted_a";
    const willBeMutual = currentStatus === otherAccepted;
    const newStatus = willBeMutual ? "mutual" : side === "a" ? "accepted_a" : "accepted_b";

    updateMatch(
      {
        resource: "matches",
        id: id!,
        values: { status: newStatus },
      },
      {
        onSuccess: () => {
          if (willBeMutual) {
            createEngagement(
              {
                resource: "engagements",
                values: {
                  title: `${orgAName} \u2194 ${orgBName} \u2014 ${(match?.category as string) ?? ""}`,
                  organizationId: match?.organizationAId as string,
                  stage: "prospect",
                  category: CATEGORY_TO_ENGAGEMENT[(match?.category as string) ?? ""] ?? "deal",
                  description: match?.matchReason as string,
                  createdBy: "admin",
                },
              },
              {
                onSuccess: () => {
                  // Create direct org↔org graph edge for connection traversal
                  const orgAId = match?.organizationAId as string;
                  const orgBId = match?.organizationBId as string;
                  if (orgAId && orgBId) {
                    createOrgConnection({
                      url: `/api/nodes/${orgAId}/attributes`,
                      method: "post",
                      values: {
                        sourceNodeId: orgAId,
                        targetNodeId: orgBId,
                        attributeName: "connected_via_match",
                        attributeType: "CUSTOM",
                        attributeTypeMode: "SCHEMALESS",
                        attributeValue: { matchId: id, category: match?.category, score: match?.matchScore },
                      },
                      successNotification: false,
                    });
                  }
                  toast.success("Both parties accepted! Engagement created.");
                },
              },
            );
          } else {
            toast.success(`Accepted on behalf of ${side === "a" ? orgAName : orgBName}`);
          }
        },
      },
    );
  };

  const handleDecline = () => {
    updateMatch(
      {
        resource: "matches",
        id: id!,
        values: {
          status: "declined",
          declinedBy: "admin",
          declineReason: declineReason || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Match declined.");
          setDeclineOpen(false);
          setDeclineReason("");
        },
      },
    );
  };

  if (matchQuery.isLoading) {
    return <PageShell loading={true}>{null}</PageShell>;
  }

  if (!match) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Match not found</p>
        <Button variant="outline" onClick={() => navigate("/portal/matches")}>
          Back to list
        </Button>
      </div>
    );
  }

  const subtitle = (
    <span className="flex items-center gap-2">
      {categoryBadge((match.category as string) ?? "")}
      {statusBadge(status)}
    </span>
  );

  return (
    <PageShell loading={matchQuery.isLoading}>
      <PageHeader
        title={`Match: ${orgAName} \u2194 ${orgBName}`}
        backTo="/portal/matches"
        subtitle={subtitle}
        actions={
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete match?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the match between {orgAName} and {orgBName}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteMatch(
                        { resource: "matches", id: id! },
                        { onSuccess: () => navigate("/portal/matches") },
                      )
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="match-flow">
            <Zap className="mr-1 h-3 w-3" />
            Match Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-4">

      {/* Admin Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "pending" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleAccept("a")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept for {orgAName}
              </Button>
              <Button onClick={() => handleAccept("b")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept for {orgBName}
              </Button>
              <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <XCircle className="mr-2 h-4 w-4 text-destructive" /> Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline match?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the match as declined. You can optionally provide a reason.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Decline reason (optional)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDecline}>Decline</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {status === "accepted_a" && (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-blue-600">
                <CheckCircle2 className="mr-1 h-3 w-3" /> {orgAName} accepted
              </Badge>
              <Button onClick={() => handleAccept("b")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept for {orgBName}
              </Button>
              <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <XCircle className="mr-2 h-4 w-4 text-destructive" /> Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline match?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the match as declined. You can optionally provide a reason.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Decline reason (optional)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDecline}>Decline</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {status === "accepted_b" && (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-blue-600">
                <CheckCircle2 className="mr-1 h-3 w-3" /> {orgBName} accepted
              </Badge>
              <Button onClick={() => handleAccept("a")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept for {orgAName}
              </Button>
              <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <XCircle className="mr-2 h-4 w-4 text-destructive" /> Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline match?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the match as declined. You can optionally provide a reason.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Decline reason (optional)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDecline}>Decline</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {status === "mutual" && (
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-green-600 bg-green-100 border-green-300">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Both accepted
              </Badge>
              <Button variant="link" className="h-auto p-0" onClick={() => navigate("/portal/engagements")}>
                <ArrowRight className="mr-1 h-3 w-3" /> View Engagements
              </Button>
            </div>
          )}

          {status === "declined" && (
            <div className="space-y-2">
              <Badge variant="outline" className="text-red-600 border-red-300">
                <XCircle className="mr-1 h-3 w-3" /> Declined by {(match.declinedBy as string) ?? "admin"}
              </Badge>
              {match.declineReason && (
                <p className="text-sm text-muted-foreground">
                  Reason: {match.declineReason as string}
                </p>
              )}
            </div>
          )}

          {status === "expired" && (
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" /> Expired
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={match.matchScore as number} className="flex-1" />
              <span className="text-2xl font-bold tabular-nums">
                {match.matchScore as number}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reason */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{(match.matchReason as string) || "\u2014"}</p>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                <dd className="mt-1">{categoryBadge((match.category as string) ?? "")}</dd>
              </div>
              {match.sector && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Sector</dt>
                  <dd className="text-sm">{match.sector as string}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Created
                </dt>
                <dd className="text-sm">
                  {match.createdAt
                    ? new Date(match.createdAt as string).toLocaleDateString()
                    : "\u2014"}
                </dd>
              </div>
              {match.expiresAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Expires
                  </dt>
                  <dd className="text-sm">
                    {new Date(match.expiresAt as string).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {match.suggestedBy && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Suggested By</dt>
                  <dd className="text-sm">{match.suggestedBy as string}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Organization A</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => navigate(`/portal/organizations/${match.organizationAId}`)}
              >
                <Building2 className="mr-1 h-3 w-3" />
                {orgAName}
              </Button>
              {orgA?.type && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {(orgA.type as string).replace(/_/g, " ")}
                </p>
              )}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Organization B</p>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => navigate(`/portal/organizations/${match.organizationBId}`)}
              >
                <Building2 className="mr-1 h-3 w-3" />
                {orgBName}
              </Button>
              {orgB?.type && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {(orgB.type as string).replace(/_/g, " ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        <TabsContent value="match-flow" className="mt-4">
          <MatchFlowTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
