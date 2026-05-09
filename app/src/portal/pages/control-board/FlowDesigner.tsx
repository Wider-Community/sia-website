import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useFlowEngine, useComponentRegistry } from "../../engine/hooks";
import { getRegistry } from "../../engine/hooks-internal";
import type {
  FlowDefinition,
  FlowMetadata,
  StageDefinition,
  StageMetadata,
  TransitionEdge,
  BranchCondition,
  BranchOperator,
} from "../../engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const flowStatusOptions: FlowDefinition["status"][] = [
  "draft",
  "active",
  "archived",
];

const flowStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

const branchOperators: BranchOperator[] = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "in",
  "nin",
  "contains",
  "matches",
  "exists",
];

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

interface FlowFormState {
  slug: string;
  status: FlowDefinition["status"];
  nameEn: string;
  nameAr: string;
  description: string;
  entryStageId: string;
  stages: StageFormState[];
}

interface StageComponentEntry {
  defId: string;
  required: boolean;
}

interface StageFormState {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  description: string;
  isTerminal: boolean;
  components: StageComponentEntry[];
  transitions: TransitionFormState[];
}

interface TransitionFormState {
  id: string;
  toStageId: string;
  priority: number;
  logic: "AND" | "OR";
  conditions: ConditionFormState[];
}

interface ConditionFormState {
  field: string;
  operator: BranchOperator;
  value: string;
}

let _stageCounter = 0;
function nextStageId(): string {
  _stageCounter += 1;
  return `stage-new-${_stageCounter}-${Date.now()}`;
}

let _transitionCounter = 0;
function nextTransitionId(): string {
  _transitionCounter += 1;
  return `transition-new-${_transitionCounter}-${Date.now()}`;
}

const emptyFlowForm: FlowFormState = {
  slug: "",
  status: "draft",
  nameEn: "",
  nameAr: "",
  description: "",
  entryStageId: "",
  stages: [],
};

function flowToForm(flow: FlowDefinition): FlowFormState {
  return {
    slug: flow.slug,
    status: flow.status,
    nameEn: flow.metadata.name_en,
    nameAr: flow.metadata.name_ar,
    description: flow.metadata.description ?? "",
    entryStageId: flow.entryStageId,
    stages: flow.stages.map((s) => ({
      id: s.id,
      slug: s.slug,
      labelEn: s.metadata.label_en,
      labelAr: s.metadata.label_ar,
      description: s.metadata.description ?? "",
      isTerminal: s.isTerminal,
      // Store the raw IDs — these may be instance or definition IDs from prior saves
      components: s.componentOrder.map((id) => ({
        defId: id,
        required: (s.requiredComponents ?? []).includes(id),
      })),
      transitions: s.transitions.map((t) => ({
        id: t.id,
        toStageId: t.toStageId,
        priority: t.priority,
        logic: t.logic,
        conditions: t.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: typeof c.value === "string" ? c.value : JSON.stringify(c.value),
        })),
      })),
    })),
  };
}

async function formToPayload(
  form: FlowFormState,
): Promise<Omit<FlowDefinition, "id" | "nodeType" | "version">> {
  const registry = getRegistry();

  const stages: StageDefinition[] = [];

  for (const s of form.stages) {
    const instanceIds: string[] = [];
    const requiredInstanceIds: string[] = [];

    for (let i = 0; i < s.components.length; i++) {
      const entry = s.components[i];
      const instance = await registry.createInstance({
        definitionId: entry.defId,
        configOverrides: {},
        placement: { flowId: '', stageId: s.id, order: i },
      });
      instanceIds.push(instance.id);
      if (entry.required) {
        requiredInstanceIds.push(instance.id);
      }
    }

    stages.push({
      id: s.id,
      slug: s.slug,
      metadata: {
        label_en: s.labelEn,
        label_ar: s.labelAr,
        description: s.description || undefined,
      } as StageMetadata,
      isTerminal: s.isTerminal,
      componentOrder: instanceIds,
      requiredComponents: requiredInstanceIds.length > 0 ? requiredInstanceIds : undefined,
      transitions: s.transitions.map((t) => ({
        id: t.id,
        fromStageId: s.id,
        toStageId: t.toStageId,
        priority: t.priority,
        logic: t.logic,
        conditions: t.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: tryParseJson(c.value),
        })),
      })),
    });
  }

  return {
    slug: form.slug.trim(),
    status: form.status,
    entryStageId: form.entryStageId,
    stages,
    metadata: {
      name_en: form.nameEn,
      name_ar: form.nameAr,
      description: form.description || undefined,
    } as FlowMetadata,
  };
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// FlowDesigner Component
// ---------------------------------------------------------------------------

export function FlowDesigner() {
  const { flows, loading, error, createFlow, updateFlow, deleteFlow } =
    useFlowEngine();
  const { definitions: componentDefs } = useComponentRegistry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlowFormState>(emptyFlowForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // -- Dialog openers -------------------------------------------------------

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyFlowForm);
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((flow: FlowDefinition) => {
    setEditingId(flow.id);
    setForm(flowToForm(flow));
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  // -- Form field updater ---------------------------------------------------

  const updateField = useCallback(
    <K extends keyof FlowFormState>(key: K, value: FlowFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // -- Stage helpers --------------------------------------------------------

  const addStage = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      stages: [
        ...prev.stages,
        {
          id: nextStageId(),
          slug: "",
          labelEn: "",
          labelAr: "",
          description: "",
          isTerminal: false,
          components: [],
          transitions: [],
        },
      ],
    }));
  }, []);

  const removeStage = useCallback((index: number) => {
    setForm((prev) => {
      const stages = prev.stages.filter((_, i) => i !== index);
      return { ...prev, stages };
    });
  }, []);

  const moveStage = useCallback((index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const stages = [...prev.stages];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= stages.length) return prev;
      [stages[index], stages[target]] = [stages[target], stages[index]];
      return { ...prev, stages };
    });
  }, []);

  const updateStage = useCallback(
    <K extends keyof StageFormState>(
      index: number,
      key: K,
      value: StageFormState[K],
    ) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        stages[index] = { ...stages[index], [key]: value };
        return { ...prev, stages };
      });
    },
    [],
  );

  // -- Transition helpers ---------------------------------------------------

  const addTransition = useCallback((stageIndex: number) => {
    setForm((prev) => {
      const stages = [...prev.stages];
      const stage = { ...stages[stageIndex] };
      stage.transitions = [
        ...stage.transitions,
        {
          id: nextTransitionId(),
          toStageId: "",
          priority: stage.transitions.length + 1,
          logic: "AND" as const,
          conditions: [],
        },
      ];
      stages[stageIndex] = stage;
      return { ...prev, stages };
    });
  }, []);

  const removeTransition = useCallback(
    (stageIndex: number, transIndex: number) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        const stage = { ...stages[stageIndex] };
        stage.transitions = stage.transitions.filter(
          (_, i) => i !== transIndex,
        );
        stages[stageIndex] = stage;
        return { ...prev, stages };
      });
    },
    [],
  );

  const updateTransition = useCallback(
    <K extends keyof TransitionFormState>(
      stageIndex: number,
      transIndex: number,
      key: K,
      value: TransitionFormState[K],
    ) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        const stage = { ...stages[stageIndex] };
        const transitions = [...stage.transitions];
        transitions[transIndex] = { ...transitions[transIndex], [key]: value };
        stage.transitions = transitions;
        stages[stageIndex] = stage;
        return { ...prev, stages };
      });
    },
    [],
  );

  // -- Condition helpers ----------------------------------------------------

  const addCondition = useCallback(
    (stageIndex: number, transIndex: number) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        const stage = { ...stages[stageIndex] };
        const transitions = [...stage.transitions];
        const trans = { ...transitions[transIndex] };
        trans.conditions = [
          ...trans.conditions,
          { field: "", operator: "eq" as BranchOperator, value: "" },
        ];
        transitions[transIndex] = trans;
        stage.transitions = transitions;
        stages[stageIndex] = stage;
        return { ...prev, stages };
      });
    },
    [],
  );

  const removeCondition = useCallback(
    (stageIndex: number, transIndex: number, condIndex: number) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        const stage = { ...stages[stageIndex] };
        const transitions = [...stage.transitions];
        const trans = { ...transitions[transIndex] };
        trans.conditions = trans.conditions.filter((_, i) => i !== condIndex);
        transitions[transIndex] = trans;
        stage.transitions = transitions;
        stages[stageIndex] = stage;
        return { ...prev, stages };
      });
    },
    [],
  );

  const updateCondition = useCallback(
    <K extends keyof ConditionFormState>(
      stageIndex: number,
      transIndex: number,
      condIndex: number,
      key: K,
      value: ConditionFormState[K],
    ) => {
      setForm((prev) => {
        const stages = [...prev.stages];
        const stage = { ...stages[stageIndex] };
        const transitions = [...stage.transitions];
        const trans = { ...transitions[transIndex] };
        const conditions = [...trans.conditions];
        conditions[condIndex] = { ...conditions[condIndex], [key]: value };
        trans.conditions = conditions;
        transitions[transIndex] = trans;
        stage.transitions = transitions;
        stages[stageIndex] = stage;
        return { ...prev, stages };
      });
    },
    [],
  );

  // -- Save / Delete --------------------------------------------------------

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!form.slug.trim()) {
      setFormError("Slug is required.");
      return;
    }
    if (!form.nameEn.trim()) {
      setFormError("English name is required.");
      return;
    }
    if (!form.nameAr.trim()) {
      setFormError("Arabic name is required.");
      return;
    }
    if (form.stages.length > 0 && !form.entryStageId) {
      setFormError("Entry stage is required when stages are defined.");
      return;
    }

    setSaving(true);
    try {
      const payload = await formToPayload(form);

      if (editingId) {
        await updateFlow(editingId, payload);
      } else {
        await createFlow(
          payload as Omit<FlowDefinition, "id" | "nodeType" | "version">,
        );
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, createFlow, updateFlow]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await deleteFlow(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete flow:", err);
    } finally {
      setSaving(false);
    }
  }, [deletingId, deleteFlow]);

  // -- Render ---------------------------------------------------------------

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${flows.length} flow(s)`}
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Flow
          </Button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">
            Failed to load flows: {error.message}
          </p>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : flows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No flows yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">{flow.slug}</TableCell>
                    <TableCell>{flow.metadata.name_en}</TableCell>
                    <TableCell>
                      <Badge
                        variant={flowStatusVariant[flow.status] ?? "outline"}
                      >
                        {flow.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{flow.version}</TableCell>
                    <TableCell>{flow.stages.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(flow)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(flow.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Flow Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Flow" : "Create Flow"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flow-slug">Slug *</Label>
                <Input
                  id="flow-slug"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="e.g. onboarding-ksa"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    updateField("status", v as FlowDefinition["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {flowStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="capitalize">{s}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flow-name-en">Name (EN) *</Label>
                <Input
                  id="flow-name-en"
                  value={form.nameEn}
                  onChange={(e) => updateField("nameEn", e.target.value)}
                  placeholder="Onboarding Flow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-name-ar">Name (AR) *</Label>
                <Input
                  id="flow-name-ar"
                  value={form.nameAr}
                  onChange={(e) => updateField("nameAr", e.target.value)}
                  placeholder="مسار التسجيل"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flow-description">Description</Label>
              <Textarea
                id="flow-description"
                rows={2}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the flow..."
              />
            </div>

            {/* Entry stage */}
            {form.stages.length > 0 && (
              <div className="space-y-2">
                <Label>Entry Stage *</Label>
                <Select
                  value={form.entryStageId}
                  onValueChange={(v) => updateField("entryStageId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entry stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.slug || s.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Stages ({form.stages.length})
                </p>
                <Button variant="outline" size="sm" onClick={addStage}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Stage
                </Button>
              </div>

              {form.stages.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No stages yet. Add one to define the flow structure.
                </p>
              )}

              {form.stages.map((stage, si) => (
                <div
                  key={stage.id}
                  className="rounded-md border bg-muted/30 p-4 space-y-4"
                >
                  {/* Stage header */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Stage {si + 1}
                      {stage.slug ? `: ${stage.slug}` : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={si === 0}
                        onClick={() => moveStage(si, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={si === form.stages.length - 1}
                        onClick={() => moveStage(si, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeStage(si)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Stage fields */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Slug</Label>
                      <Input
                        value={stage.slug}
                        onChange={(e) =>
                          updateStage(si, "slug", e.target.value)
                        }
                        placeholder="e.g. company-info"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label (EN)</Label>
                      <Input
                        value={stage.labelEn}
                        onChange={(e) =>
                          updateStage(si, "labelEn", e.target.value)
                        }
                        placeholder="Company Information"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label (AR)</Label>
                      <Input
                        value={stage.labelAr}
                        onChange={(e) =>
                          updateStage(si, "labelAr", e.target.value)
                        }
                        placeholder="معلومات الشركة"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end gap-4 pb-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`terminal-${stage.id}`}
                          checked={stage.isTerminal}
                          onCheckedChange={(checked) =>
                            updateStage(si, "isTerminal", checked === true)
                          }
                        />
                        <Label
                          htmlFor={`terminal-${stage.id}`}
                          className="text-xs"
                        >
                          Terminal stage
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Component selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Components ({stage.components.length} selected)
                    </Label>

                    {/* Selected components with required toggle */}
                    {stage.components.length > 0 && (
                      <div className="space-y-1.5 pb-1">
                        {stage.components.map((entry, ci) => {
                          const def = componentDefs.find((d) => d.id === entry.defId);
                          return (
                            <div
                              key={entry.defId}
                              className="flex items-center gap-2 rounded border bg-background px-2 py-1.5"
                            >
                              {/* Reorder up */}
                              {ci > 0 && (
                                <button
                                  type="button"
                                  className="rounded hover:bg-muted p-0.5"
                                  onClick={() => {
                                    const comps = [...stage.components];
                                    [comps[ci - 1], comps[ci]] = [comps[ci], comps[ci - 1]];
                                    updateStage(si, "components", comps);
                                  }}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                              )}

                              {/* Component name */}
                              <span className="flex-1 text-xs">
                                {def ? def.i18n.en.label : entry.defId}
                                {def && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({def.slug})
                                  </span>
                                )}
                              </span>

                              {/* Required toggle */}
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`req-${stage.id}-${entry.defId}`}
                                  checked={entry.required}
                                  onCheckedChange={(checked) => {
                                    const comps = [...stage.components];
                                    comps[ci] = { ...comps[ci], required: checked === true };
                                    updateStage(si, "components", comps);
                                  }}
                                />
                                <Label
                                  htmlFor={`req-${stage.id}-${entry.defId}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Required
                                </Label>
                              </div>

                              {/* Remove */}
                              <button
                                type="button"
                                className="rounded hover:bg-destructive/20 p-0.5"
                                onClick={() => {
                                  updateStage(
                                    si,
                                    "components",
                                    stage.components.filter((_, i) => i !== ci),
                                  );
                                }}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown to add components */}
                    <Select
                      value=""
                      onValueChange={(defId) => {
                        if (!stage.components.some((c) => c.defId === defId)) {
                          updateStage(si, "components", [
                            ...stage.components,
                            { defId, required: false },
                          ]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Add a component..." />
                      </SelectTrigger>
                      <SelectContent>
                        {componentDefs
                          .filter((d) => d.status === "published")
                          .map((def) => (
                            <SelectItem
                              key={def.id}
                              value={def.id}
                              disabled={stage.components.some((c) => c.defId === def.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{def.i18n.en.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({def.slug})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        {componentDefs.filter((d) => d.status === "published")
                          .length === 0 && (
                          <SelectItem value="__none" disabled>
                            No published components available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transitions (only for non-terminal stages) */}
                  {!stage.isTerminal && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          Transitions ({stage.transitions.length})
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => addTransition(si)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Transition
                        </Button>
                      </div>

                      {stage.transitions.map((trans, ti) => (
                        <div
                          key={trans.id}
                          className="rounded border bg-background p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium">
                              Transition {ti + 1}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeTransition(si, ti)}
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Target Stage</Label>
                              <Select
                                value={trans.toStageId}
                                onValueChange={(v) =>
                                  updateTransition(si, ti, "toStageId", v)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.stages
                                    .filter((_, idx) => idx !== si)
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.slug || s.id}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Priority</Label>
                              <Input
                                type="number"
                                value={trans.priority}
                                onChange={(e) =>
                                  updateTransition(
                                    si,
                                    ti,
                                    "priority",
                                    parseInt(e.target.value, 10) || 0,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Logic</Label>
                              <Select
                                value={trans.logic}
                                onValueChange={(v) =>
                                  updateTransition(
                                    si,
                                    ti,
                                    "logic",
                                    v as "AND" | "OR",
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AND">AND</SelectItem>
                                  <SelectItem value="OR">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Conditions */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                Conditions ({trans.conditions.length})
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-xs px-2"
                                onClick={() => addCondition(si, ti)}
                              >
                                <Plus className="mr-1 h-2.5 w-2.5" />
                                Add
                              </Button>
                            </div>

                            {trans.conditions.map((cond, ci) => (
                              <div
                                key={ci}
                                className="flex items-end gap-2"
                              >
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Field</Label>
                                  <Input
                                    value={cond.field}
                                    onChange={(e) =>
                                      updateCondition(
                                        si,
                                        ti,
                                        ci,
                                        "field",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="data.fieldName"
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="w-28 space-y-1">
                                  <Label className="text-xs">Operator</Label>
                                  <Select
                                    value={cond.operator}
                                    onValueChange={(v) =>
                                      updateCondition(
                                        si,
                                        ti,
                                        ci,
                                        "operator",
                                        v as BranchOperator,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {branchOperators.map((op) => (
                                        <SelectItem key={op} value={op}>
                                          {op}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <Input
                                    value={cond.value}
                                    onChange={(e) =>
                                      updateCondition(
                                        si,
                                        ti,
                                        ci,
                                        "value",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="value or JSON"
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() =>
                                    removeCondition(si, ti, ci)
                                  }
                                >
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flow</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this flow? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
