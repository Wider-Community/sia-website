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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, ChevronDown, X, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { useNotificationEngine } from "../../engine/hooks";
import { engineEventBus } from "../../engine/event-bus";
import { NotificationAttachmentMatrix } from "./NotificationAttachmentMatrix";
import { NotificationAnalytics } from "./NotificationAnalytics";
import type {
  NotificationDefinition,
  NotificationTriggerType,
  NotificationChannel,
  NotificationPriority,
  ChannelConfig,
  RecipientRule,
  EscalationLevel,
} from "../../engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const triggerTypeOptions: NotificationTriggerType[] = [
  "flow.started",
  "flow.completed",
  "stage.entered",
  "stage.submitted",
  "component.value_changed",
  "branch.selected",
  "match.discovered",
  "data.threshold_breached",
  "schedule",
];

const channelOptions: NotificationChannel[] = [
  "in_app",
  "email",
  "push",
  "sms",
  "webhook",
  "slack",
];

const priorityOptions: NotificationPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const recipientTypeOptions: RecipientRule["type"][] = [
  "role",
  "user",
  "relationship",
  "dynamic",
];

const priorityVariant: Record<NotificationPriority, "default" | "secondary" | "outline" | "destructive"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

// ---------------------------------------------------------------------------
// Form State
// ---------------------------------------------------------------------------

interface ChannelFormEntry {
  channel: NotificationChannel;
  fallback: NotificationChannel | "";
}

interface EscalationLevelForm {
  level: number;
  recipientType: RecipientRule["type"];
  channelOverride: NotificationChannel | "";
}

interface NotifFormState {
  slug: string;
  enabled: boolean;
  priority: NotificationPriority;
  // trigger
  triggerEventType: NotificationTriggerType;
  triggerFlowId: string;
  triggerStageId: string;
  triggerComponentId: string;
  // channels
  channels: ChannelFormEntry[];
  // template
  enSubject: string;
  enBody: string;
  arSubject: string;
  arBody: string;
  // recipients
  recipientType: RecipientRule["type"];
  roles: string;
  userIds: string;
  // escalation
  escalationTimeout: string;
  escalationMax: string;
  escalationChain: EscalationLevelForm[];
  // cooldown
  cooldown: string;
}

const emptyForm: NotifFormState = {
  slug: "",
  enabled: true,
  priority: "medium",
  triggerEventType: "flow.started",
  triggerFlowId: "",
  triggerStageId: "",
  triggerComponentId: "",
  channels: [{ channel: "in_app", fallback: "" }],
  enSubject: "",
  enBody: "",
  arSubject: "",
  arBody: "",
  recipientType: "role",
  roles: "",
  userIds: "",
  escalationTimeout: "",
  escalationMax: "",
  escalationChain: [],
  cooldown: "",
};

function formFromDefinition(def: NotificationDefinition): NotifFormState {
  return {
    slug: def.slug,
    enabled: def.enabled,
    priority: def.priority,
    triggerEventType: def.trigger.eventType,
    triggerFlowId: def.trigger.source.flowId ?? "",
    triggerStageId: def.trigger.source.stageId ?? "",
    triggerComponentId: def.trigger.source.componentId ?? "",
    channels: def.channels.map((c) => ({
      channel: c.channel,
      fallback: c.fallback ?? "",
    })),
    enSubject: def.template.en.subject ?? "",
    enBody: def.template.en.body,
    arSubject: def.template.ar.subject ?? "",
    arBody: def.template.ar.body,
    recipientType: def.recipients.type,
    roles: def.recipients.roles?.join(", ") ?? "",
    userIds: def.recipients.userIds?.join(", ") ?? "",
    escalationTimeout: def.escalation?.timeout?.toString() ?? "",
    escalationMax: def.escalation?.maxEscalations?.toString() ?? "",
    escalationChain:
      def.escalation?.escalationChain.map((e) => ({
        level: e.level,
        recipientType: e.recipientRule.type,
        channelOverride: e.channelOverride ?? "",
      })) ?? [],
    cooldown: def.cooldown?.toString() ?? "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationManagerTab() {
  const {
    definitions,
    loading,
    createDefinition,
    updateDefinition,
    deleteDefinition,
  } = useNotificationEngine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<NotifFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [escalationOpen, setEscalationOpen] = useState(false);

  // Test/Preview state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingDef, setTestingDef] = useState<NotificationDefinition | null>(null);
  const [testResult, setTestResult] = useState<"idle" | "sending" | "success" | "fail">("idle");

  // ---- helpers ----

  const updateField = useCallback(
    <K extends keyof NotifFormState>(key: K, value: NotifFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setEscalationOpen(false);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((def: NotificationDefinition) => {
    setEditingId(def.id);
    setForm(formFromDefinition(def));
    setFormError(null);
    setEscalationOpen(!!def.escalation);
    setDialogOpen(true);
  }, []);

  const openDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  // ---- build payload ----

  const buildPayload = useCallback(() => {
    if (!form.slug.trim()) return { error: "Slug is required." };
    if (!form.enBody.trim()) return { error: "English body template is required." };
    if (!form.arBody.trim()) return { error: "Arabic body template is required." };
    if (form.channels.length === 0) return { error: "At least one channel is required." };

    const channels: ChannelConfig[] = form.channels.map((c) => ({
      channel: c.channel,
      config: {},
      fallback: c.fallback || undefined,
    }));

    const recipients: RecipientRule = { type: form.recipientType };
    if (form.recipientType === "role" && form.roles.trim()) {
      recipients.roles = form.roles.split(",").map((r) => r.trim()).filter(Boolean);
    }
    if (form.recipientType === "user" && form.userIds.trim()) {
      recipients.userIds = form.userIds.split(",").map((u) => u.trim()).filter(Boolean);
    }

    const escalation =
      form.escalationTimeout && form.escalationMax
        ? {
            timeout: Number(form.escalationTimeout),
            maxEscalations: Number(form.escalationMax),
            escalationChain: form.escalationChain.map(
              (e): EscalationLevel => ({
                level: e.level,
                recipientRule: { type: e.recipientType },
                channelOverride: e.channelOverride || undefined,
              }),
            ),
          }
        : undefined;

    const payload = {
      slug: form.slug.trim(),
      enabled: form.enabled,
      priority: form.priority,
      trigger: {
        eventType: form.triggerEventType,
        source: {
          flowId: form.triggerFlowId || undefined,
          stageId: form.triggerStageId || undefined,
          componentId: form.triggerComponentId || undefined,
        },
      },
      channels,
      template: {
        en: { subject: form.enSubject || undefined, body: form.enBody },
        ar: { subject: form.arSubject || undefined, body: form.arBody },
      },
      recipients,
      escalation,
      cooldown: form.cooldown ? Number(form.cooldown) : undefined,
    };

    return { payload };
  }, [form]);

  // ---- save ----

  const handleSave = useCallback(async () => {
    setFormError(null);
    const result = buildPayload();
    if ("error" in result) {
      setFormError(result.error!);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDefinition(editingId, result.payload);
      } else {
        await createDefinition(
          result.payload as Omit<NotificationDefinition, "id" | "nodeType" | "version">,
        );
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }, [buildPayload, editingId, createDefinition, updateDefinition]);

  // ---- delete ----

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await deleteDefinition(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete notification definition:", err);
    } finally {
      setSaving(false);
    }
  }, [deletingId, deleteDefinition]);

  // ---- toggle enabled ----

  const handleToggleEnabled = useCallback(
    async (def: NotificationDefinition) => {
      try {
        await updateDefinition(def.id, { enabled: !def.enabled });
      } catch (err) {
        console.error("Failed to toggle notification:", err);
      }
    },
    [updateDefinition],
  );

  // ---- test/preview ----

  const openTest = useCallback((def: NotificationDefinition) => {
    setTestingDef(def);
    setTestResult("idle");
    setTestDialogOpen(true);
  }, []);

  const sampleContext: Record<string, unknown> = {
    flowId: "flow-sample-123",
    stageId: "stage-sample-456",
    sessionId: "session-sample-789",
    userId: "user-test-001",
    componentId: "comp-sample-abc",
    instanceId: "inst-sample-def",
    field: "companyName",
    oldValue: "Acme Corp",
    newValue: "Acme Industries",
    orgAId: "org-a-001",
    orgBId: "org-b-002",
    score: 0.87,
    nodeId: "node-sample-111",
    threshold: 100,
    value: 150,
    direction: "above",
    matchId: "match-sample-222",
    data: { status: "completed", amount: 50000 },
  };

  const interpolateText = useCallback((text: string): string => {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
      const parts = key.split(".");
      let current: unknown = sampleContext;
      for (const part of parts) {
        if (current === null || current === undefined) return "";
        current = (current as Record<string, unknown>)[part];
      }
      return current !== undefined && current !== null ? String(current) : `[${key}]`;
    });
  }, []);

  const handleSendTest = useCallback(() => {
    if (!testingDef) return;
    setTestResult("sending");

    try {
      // Emit test event on the engine event bus matching the notification trigger type
      const baseEvent = {
        flowId: "flow-sample-123",
        stageId: "stage-sample-456",
        sessionId: "session-sample-789",
        userId: "user-test-001",
      };

      const eventMap: Record<NotificationTriggerType, () => void> = {
        "flow.started": () =>
          engineEventBus.emit({ type: "flow.started", ...baseEvent }),
        "flow.completed": () =>
          engineEventBus.emit({ type: "flow.completed", ...baseEvent, data: { test: true } }),
        "stage.entered": () =>
          engineEventBus.emit({ type: "stage.entered", ...baseEvent }),
        "stage.submitted": () =>
          engineEventBus.emit({ type: "stage.submitted", ...baseEvent, data: { test: true } }),
        "component.value_changed": () =>
          engineEventBus.emit({
            type: "component.value_changed",
            componentId: "comp-sample-abc",
            instanceId: "inst-sample-def",
            field: "companyName",
            oldValue: "Acme Corp",
            newValue: "Acme Industries",
            userId: "user-test-001",
          }),
        "branch.selected": () =>
          engineEventBus.emit({
            type: "branch.selected",
            flowId: "flow-sample-123",
            fromStageId: "stage-a",
            toStageId: "stage-b",
            conditions: {},
          }),
        "match.discovered": () =>
          engineEventBus.emit({
            type: "match.discovered",
            orgAId: "org-a-001",
            orgBId: "org-b-002",
            dimensions: [],
            score: 0.87,
          }),
        "data.threshold_breached": () =>
          engineEventBus.emit({
            type: "data.threshold_breached",
            nodeId: "node-sample-111",
            field: "revenue",
            value: 150,
            threshold: 100,
            direction: "above",
          }),
        schedule: () =>
          engineEventBus.emit({ type: "flow.started", ...baseEvent }),
      };

      const emitter = eventMap[testingDef.trigger.eventType];
      if (emitter) emitter();

      // Simulate short delay for visual feedback
      setTimeout(() => setTestResult("success"), 400);
    } catch {
      setTestResult("fail");
    }
  }, [testingDef]);

  // ---- channel helpers ----

  const addChannel = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      channels: [...prev.channels, { channel: "email", fallback: "" }],
    }));
  }, []);

  const removeChannel = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index),
    }));
  }, []);

  const updateChannel = useCallback(
    (index: number, field: keyof ChannelFormEntry, value: string) => {
      setForm((prev) => {
        const channels = [...prev.channels];
        channels[index] = { ...channels[index], [field]: value };
        return { ...prev, channels };
      });
    },
    [],
  );

  // ---- escalation chain helpers ----

  const addEscalationLevel = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      escalationChain: [
        ...prev.escalationChain,
        {
          level: prev.escalationChain.length + 1,
          recipientType: "role" as RecipientRule["type"],
          channelOverride: "",
        },
      ],
    }));
  }, []);

  const removeEscalationLevel = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      escalationChain: prev.escalationChain.filter((_, i) => i !== index),
    }));
  }, []);

  const updateEscalationLevel = useCallback(
    (index: number, field: keyof EscalationLevelForm, value: string | number) => {
      setForm((prev) => {
        const chain = [...prev.escalationChain];
        chain[index] = { ...chain[index], [field]: value };
        return { ...prev, escalationChain: chain };
      });
    },
    [],
  );

  // ---- render ----

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {definitions.length} notification(s)
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Notification
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : definitions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No notification definitions yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                definitions.map((def) => (
                  <TableRow key={def.id}>
                    <TableCell className="font-medium">{def.slug}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {def.trigger.eventType}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {def.channels.map((c, i) => (
                          <Badge key={i} variant="secondary">
                            {c.channel}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[def.priority]}>
                        {def.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={def.enabled}
                        onCheckedChange={() => handleToggleEnabled(def)}
                      />
                    </TableCell>
                    <TableCell>{def.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTest(def)}
                          title="Test notification"
                        >
                          <FlaskConical className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(def)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(def.id)}
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

        {/* Attachment Matrix */}
        {!loading && definitions.length > 0 && (
          <NotificationAttachmentMatrix definitions={definitions} />
        )}

        {/* Analytics Dashboard */}
        <NotificationAnalytics />
      </div>

      {/* Test/Preview Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Test Notification: {testingDef?.slug ?? ""}
            </DialogTitle>
          </DialogHeader>
          {testingDef && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Trigger Event
                </p>
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  {testingDef.trigger.eventType}
                </code>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Preview (English)
                </p>
                {testingDef.template.en.subject && (
                  <p className="text-sm font-medium">
                    {interpolateText(testingDef.template.en.subject)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {interpolateText(testingDef.template.en.body)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Preview (Arabic)
                </p>
                {testingDef.template.ar.subject && (
                  <p className="text-sm font-medium" dir="rtl">
                    {interpolateText(testingDef.template.ar.subject)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" dir="rtl">
                  {interpolateText(testingDef.template.ar.body)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                <p className="text-xs text-muted-foreground w-full mb-1">Channels:</p>
                {testingDef.channels.map((c, i) => (
                  <Badge key={i} variant="secondary">{c.channel}</Badge>
                ))}
              </div>

              {/* Result indicator */}
              {testResult === "success" && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Test event emitted successfully. Check console for delivery log.
                </div>
              )}
              {testResult === "fail" && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  <XCircle className="h-4 w-4" />
                  Test failed. Check the console for errors.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setTestDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleSendTest}
                  disabled={testResult === "sending"}
                >
                  {testResult === "sending" ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Notification" : "Create Notification"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Basic fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notif-slug">Slug *</Label>
                <Input
                  id="notif-slug"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="e.g. deal-submitted-alert"
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    updateField("priority", v as NotificationPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="capitalize">{p}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="notif-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => updateField("enabled", v)}
              />
              <Label htmlFor="notif-enabled">Enabled</Label>
            </div>

            {/* Trigger section */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Trigger</p>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={form.triggerEventType}
                  onValueChange={(v) =>
                    updateField("triggerEventType", v as NotificationTriggerType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="notif-flow-id">Flow ID</Label>
                  <Input
                    id="notif-flow-id"
                    value={form.triggerFlowId}
                    onChange={(e) => updateField("triggerFlowId", e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notif-stage-id">Stage ID</Label>
                  <Input
                    id="notif-stage-id"
                    value={form.triggerStageId}
                    onChange={(e) =>
                      updateField("triggerStageId", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notif-component-id">Component ID</Label>
                  <Input
                    id="notif-component-id"
                    value={form.triggerComponentId}
                    onChange={(e) =>
                      updateField("triggerComponentId", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Channels section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Channels</p>
                <Button type="button" variant="outline" size="sm" onClick={addChannel}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Channel
                </Button>
              </div>
              {form.channels.map((ch, index) => (
                <div
                  key={index}
                  className="flex items-end gap-3 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={ch.channel}
                      onValueChange={(v) => updateChannel(index, "channel", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {channelOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Fallback</Label>
                    <Select
                      value={ch.fallback || "__none__"}
                      onValueChange={(v) =>
                        updateChannel(index, "fallback", v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {channelOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.channels.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeChannel(index)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Template section */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Template</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  English (en)
                </p>
                <div className="space-y-2">
                  <Label htmlFor="notif-en-subject">Subject</Label>
                  <Input
                    id="notif-en-subject"
                    value={form.enSubject}
                    onChange={(e) => updateField("enSubject", e.target.value)}
                    placeholder="Notification subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notif-en-body">Body *</Label>
                  <Textarea
                    id="notif-en-body"
                    rows={3}
                    value={form.enBody}
                    onChange={(e) => updateField("enBody", e.target.value)}
                    placeholder="Notification body text"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Arabic (ar)
                </p>
                <div className="space-y-2">
                  <Label htmlFor="notif-ar-subject">Subject</Label>
                  <Input
                    id="notif-ar-subject"
                    value={form.arSubject}
                    onChange={(e) => updateField("arSubject", e.target.value)}
                    placeholder="عنوان الإشعار"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notif-ar-body">Body *</Label>
                  <Textarea
                    id="notif-ar-body"
                    rows={3}
                    value={form.arBody}
                    onChange={(e) => updateField("arBody", e.target.value)}
                    placeholder="نص الإشعار"
                  />
                </div>
              </div>
            </div>

            {/* Recipients section */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Recipients</p>
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select
                  value={form.recipientType}
                  onValueChange={(v) =>
                    updateField("recipientType", v as RecipientRule["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientTypeOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="capitalize">{r}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.recipientType === "role" && (
                <div className="space-y-2">
                  <Label htmlFor="notif-roles">Roles (comma-separated)</Label>
                  <Input
                    id="notif-roles"
                    value={form.roles}
                    onChange={(e) => updateField("roles", e.target.value)}
                    placeholder="e.g. engine_operator, flow_owner"
                  />
                </div>
              )}
              {form.recipientType === "user" && (
                <div className="space-y-2">
                  <Label htmlFor="notif-user-ids">
                    User IDs (comma-separated)
                  </Label>
                  <Input
                    id="notif-user-ids"
                    value={form.userIds}
                    onChange={(e) => updateField("userIds", e.target.value)}
                    placeholder="e.g. user-1, user-2"
                  />
                </div>
              )}
            </div>

            {/* Escalation section (collapsible) */}
            <Collapsible open={escalationOpen} onOpenChange={setEscalationOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex w-full items-center justify-between p-0 font-medium"
                >
                  <span className="text-sm">Escalation</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      escalationOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="notif-esc-timeout">Timeout (ms)</Label>
                    <Input
                      id="notif-esc-timeout"
                      type="number"
                      value={form.escalationTimeout}
                      onChange={(e) =>
                        updateField("escalationTimeout", e.target.value)
                      }
                      placeholder="e.g. 300000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notif-esc-max">Max Escalations</Label>
                    <Input
                      id="notif-esc-max"
                      type="number"
                      value={form.escalationMax}
                      onChange={(e) =>
                        updateField("escalationMax", e.target.value)
                      }
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Escalation Chain</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEscalationLevel}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Level
                    </Button>
                  </div>
                  {form.escalationChain.map((lvl, index) => (
                    <div
                      key={index}
                      className="flex items-end gap-3 rounded-md border p-3"
                    >
                      <div className="w-16 space-y-2">
                        <Label>Level</Label>
                        <Input
                          type="number"
                          value={lvl.level}
                          onChange={(e) =>
                            updateEscalationLevel(
                              index,
                              "level",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Recipient Type</Label>
                        <Select
                          value={lvl.recipientType}
                          onValueChange={(v) =>
                            updateEscalationLevel(index, "recipientType", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {recipientTypeOptions.map((r) => (
                              <SelectItem key={r} value={r}>
                                <span className="capitalize">{r}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Channel Override</Label>
                        <Select
                          value={lvl.channelOverride || "__none__"}
                          onValueChange={(v) =>
                            updateEscalationLevel(
                              index,
                              "channelOverride",
                              v === "__none__" ? "" : v,
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {channelOptions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEscalationLevel(index)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Cooldown */}
            <div className="space-y-2">
              <Label htmlFor="notif-cooldown">Cooldown (ms)</Label>
              <Input
                id="notif-cooldown"
                type="number"
                value={form.cooldown}
                onChange={(e) => updateField("cooldown", e.target.value)}
                placeholder="e.g. 60000"
              />
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
            <DialogTitle>Delete Notification</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this notification definition? This
            action cannot be undone.
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
