/**
 * MatchFlowPage — a specialized Flow Runner for the Deal Matching flow.
 *
 * URL: /portal/matches/flow
 * Query params:
 *   - sessionId: resume an existing session
 *
 * On mount it locates the "deal-matching" flow definition from the engine.
 * If absent it shows a CTA to seed from the Control Board. Otherwise it
 * starts (or resumes) a FlowSession and renders each stage dynamically.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine, useDynamicForm, evaluateCondition } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import { BranchSelector } from "../../engine/components/BranchSelector";
import type {
  FlowDefinition,
  FlowSession,
  StageDefinition,
  TransitionEdge,
} from "../../engine/types";

const DEAL_MATCHING_SLUG = "deal-matching-flow";

// ---------------------------------------------------------------------------
// Stage Progress Bar
// ---------------------------------------------------------------------------

interface StageProgressBarProps {
  stages: StageDefinition[];
  currentStageId: string;
  visitedStages: string[];
}

function StageProgressBar({ stages, currentStageId, visitedStages }: StageProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isVisited = visitedStages.includes(stage.id) && !isCurrent;

          return (
            <div key={stage.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors
                    ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isVisited
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                    }
                  `}
                >
                  {isVisited ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`text-xs text-center max-w-[80px] truncate ${
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {stage.metadata.label_en}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isVisited ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Form (renders dynamic components)
// ---------------------------------------------------------------------------

interface StageFormProps {
  componentOrder: string[];
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onBack: (() => void) | null;
  isTerminal: boolean;
  submitting: boolean;
}

function StageForm({
  componentOrder,
  initialValues,
  onSubmit,
  onBack,
  isTerminal,
  submitting,
}: StageFormProps) {
  const { components, values, errors, loading, setValue, validate, getFormData } =
    useDynamicForm(componentOrder);

  // Pre-fill values when initial data is available
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      for (const [key, val] of Object.entries(initialValues)) {
        setValue(key, val);
      }
    }
  }, [initialValues, setValue]);

  const handleSubmit = useCallback(() => {
    if (validate()) {
      onSubmit(getFormData());
    }
  }, [validate, getFormData, onSubmit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {components.map((comp) => (
          <div key={comp.instanceId}>
            <comp.Component
              instanceId={comp.instanceId}
              config={comp.config}
              validations={comp.validations}
              i18n={comp.i18n}
              value={values[comp.instanceId]}
              onChange={(v) => setValue(comp.instanceId, v)}
              errors={errors[comp.instanceId]}
              locale="en"
            />
          </div>
        ))}
      </div>

      {components.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No fields for this stage.
        </p>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onBack ?? undefined}
          disabled={!onBack || submitting}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isTerminal ? "Complete Matching" : "Next"}
          {!isTerminal && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match Results Summary (completion view)
// ---------------------------------------------------------------------------

interface MatchCompletionViewProps {
  flow: FlowDefinition;
  session: FlowSession;
}

function MatchCompletionView({ flow, session }: MatchCompletionViewProps) {
  const navigate = useNavigate();

  // Extract key matching data for a summary
  const collectedData = session.collectedData;
  const orgProfileData = collectedData["stage-org-profile"] ?? {};
  const criteriaData = collectedData["stage-criteria"] ?? {};
  const prefsData = collectedData["stage-preferences"] ?? {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Match Flow Completed</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your deal matching criteria have been submitted. Results will be generated shortly.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {flow.stages.map((stage) => {
            const stageData = collectedData[stage.id];
            if (!stageData || Object.keys(stageData).length === 0) return null;

            return (
              <div key={stage.id} className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-2">{stage.metadata.label_en}</h3>
                <dl className="grid gap-1 text-sm">
                  {Object.entries(stageData).map(([field, value]) => (
                    <div key={field} className="flex justify-between">
                      <dt className="text-muted-foreground">{field}</dt>
                      <dd className="font-medium">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "-")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}

          {/* Summary highlights */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold mb-2 text-primary">Matching Summary</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {orgProfileData["comp-deal-sector"] && (
                <li>Sector: <span className="font-medium text-foreground">{String(orgProfileData["comp-deal-sector"])}</span></li>
              )}
              {orgProfileData["comp-deal-size"] && (
                <li>Deal Size: <span className="font-medium text-foreground">${Number(orgProfileData["comp-deal-size"]).toLocaleString()}</span></li>
              )}
              {criteriaData["comp-target-countries"] && (
                <li>
                  Target Countries:{" "}
                  <span className="font-medium text-foreground">
                    {Array.isArray(criteriaData["comp-target-countries"])
                      ? (criteriaData["comp-target-countries"] as string[]).join(", ")
                      : String(criteriaData["comp-target-countries"])}
                  </span>
                </li>
              )}
              {prefsData["comp-partnership-type"] && (
                <li>Partnership Type: <span className="font-medium text-foreground">{String(prefsData["comp-partnership-type"])}</span></li>
              )}
              {prefsData["comp-timeline"] && (
                <li>Timeline: <span className="font-medium text-foreground">{String(prefsData["comp-timeline"])}</span></li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => navigate("/portal/matches")}>
          Back to Matches
        </Button>
        <Button onClick={() => navigate("/portal/matches/kanban")}>
          View Kanban Board
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MatchFlowPage
// ---------------------------------------------------------------------------

export function MatchFlowPage() {
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const navigate = useNavigate();

  const { flows, loading: flowsLoading } = useFlowEngine({ status: "active" });

  const [session, setSession] = useState<FlowSession | null>(null);
  const [flow, setFlow] = useState<FlowDefinition | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchTransitions, setBranchTransitions] = useState<TransitionEdge[] | null>(null);
  const [pendingStageData, setPendingStageData] = useState<Record<string, unknown> | null>(null);
  const [flowNotFound, setFlowNotFound] = useState(false);

  // Locate the deal-matching flow by slug
  useEffect(() => {
    if (flowsLoading) return;

    const found = flows.find((f) => f.slug === DEAL_MATCHING_SLUG);
    if (found) {
      setFlow(found);
      setFlowNotFound(false);
    } else {
      setFlowNotFound(true);
      setInitializing(false);
    }
  }, [flows, flowsLoading]);

  // Start or resume session once we have the flow
  useEffect(() => {
    if (!flow) return;

    const init = async () => {
      try {
        if (sessionIdParam) {
          const existing = await getFlowEngine().getSession(sessionIdParam);
          if (existing) {
            setSession(existing);
          } else {
            setError("Session not found. Starting a new one.");
            const newSession = await getFlowEngine().startSession(flow.id, "current-user");
            setSession(newSession);
          }
        } else {
          const newSession = await getFlowEngine().startSession(flow.id, "current-user");
          setSession(newSession);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize session.");
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [flow, sessionIdParam]);

  // Current stage
  const currentStage = useMemo(() => {
    if (!flow || !session) return null;
    return flow.stages.find((s) => s.id === session.currentStageId) ?? null;
  }, [flow, session]);

  const isTerminal = currentStage?.isTerminal ?? false;
  const isFirstStage = session !== null && session.visitedStages.length <= 1;

  // Stage labels for BranchSelector
  const stageLabels = useMemo(() => {
    if (!flow) return {};
    const labels: Record<string, string> = {};
    for (const stage of flow.stages) {
      labels[stage.id] = stage.metadata.label_en;
    }
    return labels;
  }, [flow]);

  // Handle stage submission
  const handleSubmitStage = useCallback(
    async (data: Record<string, unknown>) => {
      if (!session) return;
      setSubmitting(true);
      setError(null);

      try {
        const result = await getFlowEngine().submitStage(session.id, data);
        setSession(result.session);
        setBranchTransitions(null);
        setPendingStageData(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit stage.");
      } finally {
        setSubmitting(false);
      }
    },
    [session],
  );

  // Handle back
  const handleBack = useCallback(async () => {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    try {
      const updated = await getFlowEngine().goBack(session.id);
      setSession(updated);
      setBranchTransitions(null);
      setPendingStageData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to go back.");
    } finally {
      setSubmitting(false);
    }
  }, [session]);

  // Handle branch selection
  const handleBranchSelect = useCallback(
    (_targetStageId: string) => {
      setBranchTransitions(null);
      setPendingStageData(null);
    },
    [],
  );

  const isLoading = flowsLoading || initializing;
  const isCompleted = session?.status === "completed";

  // Detect energy sector for the conditional branch indicator
  const isEnergySector = useMemo(() => {
    if (!session) return false;
    const orgProfileData = session.collectedData["stage-org-profile"];
    if (!orgProfileData) return false;
    return orgProfileData["comp-deal-sector"] === "energy";
  }, [session]);

  return (
    <PageShell loading={isLoading}>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Deal Matching Flow"
          backTo="/portal/matches"
          subtitle="Match organizations across the KSA-Malaysia corridor"
          actions={
            <Button variant="outline" onClick={() => navigate("/portal/matches/kanban")}>
              <Zap className="mr-2 h-4 w-4" />
              Kanban View
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Flow not found — seed message */}
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

        {/* Completed view */}
        {isCompleted && flow && session && (
          <MatchCompletionView flow={flow} session={session} />
        )}

        {/* Active flow */}
        {!isCompleted && flow && session && currentStage && (
          <>
            {/* Progress bar */}
            <Card>
              <CardContent className="pt-6">
                <StageProgressBar
                  stages={flow.stages}
                  currentStageId={session.currentStageId}
                  visitedStages={session.visitedStages}
                />
              </CardContent>
            </Card>

            {/* Energy sector indicator */}
            {isEnergySector && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                Energy sector detected — specialized energy matching criteria will apply.
              </div>
            )}

            {/* Stage title + form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentStage.metadata.label_en}</CardTitle>
                  <Badge variant="outline">
                    Stage{" "}
                    {flow.stages.findIndex((s) => s.id === currentStage.id) + 1}{" "}
                    of {flow.stages.length}
                  </Badge>
                </div>
                {currentStage.metadata.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentStage.metadata.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {branchTransitions ? (
                  <BranchSelector
                    transitions={branchTransitions}
                    stageLabels={stageLabels}
                    onSelect={handleBranchSelect}
                    locale="en"
                  />
                ) : (
                  <StageForm
                    componentOrder={currentStage.componentOrder}
                    initialValues={session.collectedData[currentStage.id]}
                    onSubmit={handleSubmitStage}
                    onBack={isFirstStage ? null : handleBack}
                    isTerminal={isTerminal}
                    submitting={submitting}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
