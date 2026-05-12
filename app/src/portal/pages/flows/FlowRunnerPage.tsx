import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useFlowEngine, useDynamicForm } from "../../engine/hooks";
import { getFlowEngine } from "../../engine/hooks-internal";
import { BranchSelector } from "../../engine/components/BranchSelector";
import type {
  FlowDefinition,
  FlowSession,
  StageDefinition,
  TransitionEdge,
} from "../../engine/types";

// ---------------------------------------------------------------------------
// Stage Progress Bar
// ---------------------------------------------------------------------------

interface StageProgressBarProps {
  stages: StageDefinition[];
  currentStageId: string;
  visitedStages: string[];
}

function StageProgressBar({
  stages,
  currentStageId,
  visitedStages,
}: StageProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isVisited =
            visitedStages.includes(stage.id) && !isCurrent;

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
                  {isVisited ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs text-center max-w-[80px] truncate ${
                    isCurrent
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
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
  requiredComponents?: string[];
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onBack: (() => void) | null;
  isTerminal: boolean;
  submitting: boolean;
}

function StageForm({
  componentOrder,
  requiredComponents,
  initialValues,
  onSubmit,
  onBack,
  isTerminal,
  submitting,
}: StageFormProps) {
  const {
    components,
    values,
    errors,
    loading,
    setValue,
    validate,
    getFormData,
    reset,
  } = useDynamicForm(componentOrder, 'en', requiredComponents);

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
      {/* Rendered dynamic components */}
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

      {/* Navigation buttons */}
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
          {isTerminal ? "Complete" : "Next"}
          {!isTerminal && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion View
// ---------------------------------------------------------------------------

interface CompletionViewProps {
  flow: FlowDefinition;
  session: FlowSession;
}

function CompletionView({ flow, session }: CompletionViewProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Flow Completed</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {flow.metadata.name_en} has been successfully completed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {flow.stages.map((stage) => {
            const stageData = session.collectedData[stage.id];
            if (!stageData || Object.keys(stageData).length === 0) return null;

            return (
              <div key={stage.id} className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold mb-2">
                  {stage.metadata.label_en}
                </h3>
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
        </CardContent>
      </Card>
      <div className="flex justify-center">
        <Button onClick={() => navigate("/portal/flows")}>
          Back to Flows
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FlowRunnerPage
// ---------------------------------------------------------------------------

export function FlowRunnerPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const navigate = useNavigate();

  const { flows, loading: flowsLoading } = useFlowEngine({ status: "active" });

  const [session, setSession] = useState<FlowSession | null>(null);
  const [flow, setFlow] = useState<FlowDefinition | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchTransitions, setBranchTransitions] = useState<
    TransitionEdge[] | null
  >(null);
  const [pendingStageData, setPendingStageData] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Resolve the flow definition
  useEffect(() => {
    if (!flowId || flowsLoading) return;

    const found = flows.find((f) => f.id === flowId);
    if (found) {
      setFlow(found);
    } else {
      // Try direct fetch via engine
      getFlowEngine()
        .getFlow(flowId)
        .then((f) => {
          if (f) setFlow(f);
          else setError("Flow not found.");
        })
        .catch(() => setError("Failed to load flow."));
    }
  }, [flowId, flows, flowsLoading]);

  // Start or resume session
  useEffect(() => {
    if (!flow) return;

    const init = async () => {
      try {
        if (sessionIdParam) {
          // Resume existing session
          const existing = await getFlowEngine().getSession(sessionIdParam);
          if (existing) {
            setSession(existing);
          } else {
            setError("Session not found. Starting a new one.");
            const newSession = await getFlowEngine().startSession(
              flow.id,
              "current-user",
            );
            setSession(newSession);
          }
        } else {
          // Create new session
          const newSession = await getFlowEngine().startSession(
            flow.id,
            "current-user",
          );
          setSession(newSession);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize session.",
        );
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

  // Check if current stage is terminal
  const isTerminal = currentStage?.isTerminal ?? false;

  // Check if we are on the first stage (disable back)
  const isFirstStage =
    session !== null && session.visitedStages.length <= 1;

  // Stage labels map for BranchSelector
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
        setError(
          err instanceof Error ? err.message : "Failed to submit stage.",
        );
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
    (targetStageId: string) => {
      if (!session || !pendingStageData) return;
      // We already submitted via submitStage — the engine picked the branch.
      // In a user-choice scenario, we navigate manually.
      setBranchTransitions(null);
      setPendingStageData(null);
    },
    [session, pendingStageData],
  );

  // Loading state
  const isLoading = flowsLoading || initializing;

  // Completed state
  const isCompleted = session?.status === "completed";

  return (
    <PageShell loading={isLoading}>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={flow?.metadata.name_en ?? "Flow"}
          backTo="/portal/flows"
          subtitle={flow?.metadata.description}
        />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Completed view */}
        {isCompleted && flow && session && (
          <CompletionView flow={flow} session={session} />
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

            {/* Stage title */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentStage.metadata.label_en}</CardTitle>
                  <Badge variant="outline">
                    Stage{" "}
                    {flow.stages.findIndex(
                      (s) => s.id === currentStage.id,
                    ) + 1}{" "}
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
                {/* Branch selector overlay */}
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
                    requiredComponents={currentStage.requiredComponents}
                    initialValues={
                      session.collectedData[currentStage.id]
                    }
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

        {/* No flow found */}
        {!isLoading && !flow && !error && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Flow not found.</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate("/portal/flows")}
              >
                Back to Flows
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
