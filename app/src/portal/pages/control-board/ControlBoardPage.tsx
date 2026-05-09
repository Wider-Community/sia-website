import { useState, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Sprout } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { seedEngine, clearEngine } from "../../engine/seed";
import { useComponentRegistry, useReferenceDatasets, useEntityResources } from "../../engine/hooks";
import type { ComponentCategory, ComponentDefinition } from "../../engine/types";
import type { DataSourceBinding } from "../../engine/types";
import { AuthorizationTab } from "./AuthorizationTab";
import { FlowDesigner } from "./FlowDesigner";
import { NotificationManagerTab } from "./NotificationManagerTab";
import { EnginePlayground } from "./EnginePlayground";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  deprecated: "outline",
};

const rendererOptions: { value: string; label: string; description: string }[] = [
  { value: "text-input", label: "Text Input", description: "Single-line text field" },
  { value: "textarea", label: "Text Area", description: "Multi-line text field" },
  { value: "number", label: "Number", description: "Numeric input" },
  { value: "select", label: "Dropdown", description: "Pick one from a list" },
  { value: "multi-select", label: "Multi-Select", description: "Pick multiple from a list" },
  { value: "toggle", label: "Toggle / Switch", description: "On/off switch" },
  { value: "date", label: "Date Picker", description: "Date selector" },
  { value: "email-input", label: "Email", description: "Email address field" },
  { value: "phone-input", label: "Phone", description: "Phone number field" },
  { value: "file-upload", label: "File Upload", description: "File attachment" },
];

const categoryOptions: ComponentCategory[] = [
  "field",
  "composite",
  "layout",
  "action",
  "navigation",
];

const statusOptions: Array<ComponentDefinition["status"]> = [
  "draft",
  "published",
  "deprecated",
];

interface FormState {
  slug: string;
  category: ComponentCategory;
  renderer: string;
  status: ComponentDefinition["status"];
  dataSchema: string;
  defaultConfig: string;
  validations: string;
  enLabel: string;
  enPlaceholder: string;
  arLabel: string;
  arPlaceholder: string;
  dataSourceType: 'none' | 'reference' | 'entity';
  dataSourceDatasetSlug: string;
  dataSourceResource: string;
  dataSourceDisplayField: string;
  dataSourceValueField: string;
}

const emptyForm: FormState = {
  slug: "",
  category: "field",
  renderer: "",
  status: "draft",
  dataSchema: "{}",
  defaultConfig: "{}",
  validations: "[]",
  enLabel: "",
  enPlaceholder: "",
  arLabel: "",
  arPlaceholder: "",
  dataSourceType: "none",
  dataSourceDatasetSlug: "",
  dataSourceResource: "",
  dataSourceDisplayField: "",
  dataSourceValueField: "id",
};

function formFromDefinition(def: ComponentDefinition): FormState {
  return {
    slug: def.slug,
    category: def.category,
    renderer: def.renderer,
    status: def.status,
    dataSchema: JSON.stringify(def.dataSchema, null, 2),
    defaultConfig: JSON.stringify(def.defaultConfig, null, 2),
    validations: JSON.stringify(def.validations, null, 2),
    enLabel: def.i18n.en.label,
    enPlaceholder: def.i18n.en.placeholder ?? "",
    arLabel: def.i18n.ar.label,
    arPlaceholder: def.i18n.ar.placeholder ?? "",
    dataSourceType: def.dataSource?.type ?? "none",
    dataSourceDatasetSlug: def.dataSource?.datasetSlug ?? "",
    dataSourceResource: def.dataSource?.resource ?? "",
    dataSourceDisplayField: def.dataSource?.displayField ?? "",
    dataSourceValueField: def.dataSource?.valueField ?? "id",
  };
}

export function ControlBoardPage() {
  const {
    definitions,
    loading,
    createDefinition,
    updateDefinition,
    deleteDefinition,
  } = useComponentRegistry();

  const { datasets: refDatasets } = useReferenceDatasets();
  const { resources: entityResources } = useEntityResources();

  const [seeding, setSeeding] = useState(false);

  const handleSeedEngine = useCallback(async (force = false) => {
    setSeeding(true);
    try {
      const result = await seedEngine(force);
      if (result.skipped === -1) {
        toast.info("Engine already seeded. Click 'Re-seed' to force a fresh seed.");
      } else {
        toast.success(
          `Seed complete: ${result.created} created, ${result.skipped} skipped, ${result.templates} templates.` +
            (result.errors.length > 0
              ? ` ${result.errors.length} error(s) — check console.`
              : ""),
        );
        if (result.errors.length > 0) {
          console.warn("Seed errors:", result.errors);
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Seed failed — see console.",
      );
      console.error("seedEngine() failed:", err);
    } finally {
      setSeeding(false);
    }
  }, []);

  const handleClearEngine = useCallback(async () => {
    if (!window.confirm("This will delete ALL engine data (components, flows, sessions, notifications). Continue?")) return;
    setSeeding(true);
    try {
      const result = await clearEngine();
      toast.success(
        `Cleared ${result.deleted} record(s).` +
          (result.errors.length > 0 ? ` ${result.errors.length} error(s) — check console.` : ""),
      );
      if (result.errors.length > 0) console.warn("Clear errors:", result.errors);
      // Reload to reset all state
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed.");
      console.error("clearEngine() failed:", err);
      setSeeding(false);
    }
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((def: ComponentDefinition) => {
    setEditingId(def.id);
    setForm(formFromDefinition(def));
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const openDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!form.slug.trim()) {
      setFormError("Slug is required.");
      return;
    }
    if (!form.renderer.trim()) {
      setFormError("Renderer is required.");
      return;
    }

    let dataSchema: Record<string, unknown>;
    let defaultConfig: Record<string, unknown>;
    let validations: ComponentDefinition["validations"];

    try {
      dataSchema = JSON.parse(form.dataSchema);
    } catch {
      setFormError("Data Schema is not valid JSON.");
      return;
    }

    try {
      defaultConfig = JSON.parse(form.defaultConfig);
    } catch {
      setFormError("Default Config is not valid JSON.");
      return;
    }

    try {
      validations = JSON.parse(form.validations);
      if (!Array.isArray(validations)) {
        setFormError("Validations must be a JSON array.");
        return;
      }
    } catch {
      setFormError("Validations is not valid JSON.");
      return;
    }

    const dataSource: DataSourceBinding | undefined =
      form.dataSourceType === "none"
        ? undefined
        : form.dataSourceType === "reference"
          ? { type: "reference", datasetSlug: form.dataSourceDatasetSlug }
          : {
              type: "entity",
              resource: form.dataSourceResource,
              displayField: form.dataSourceDisplayField || undefined,
              valueField: form.dataSourceValueField || "id",
            };

    const payload = {
      slug: form.slug.trim(),
      category: form.category,
      renderer: form.renderer.trim(),
      status: form.status,
      dataSchema,
      defaultConfig,
      validations,
      dataSource,
      i18n: {
        en: { label: form.enLabel, placeholder: form.enPlaceholder || undefined },
        ar: { label: form.arLabel, placeholder: form.arPlaceholder || undefined },
      },
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDefinition(editingId, payload);
      } else {
        await createDefinition(payload as Omit<ComponentDefinition, "id" | "nodeType" | "version">);
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, createDefinition, updateDefinition]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await deleteDefinition(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete definition:", err);
    } finally {
      setSaving(false);
    }
  }, [deletingId, deleteDefinition]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <PageShell>
      <PageHeader title="Control Board" />

      <Tabs defaultValue="components">
        <div className="flex items-center justify-between gap-4">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="authorization">Authorization</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
        </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSeedEngine(false)}
              disabled={seeding}
            >
              <Sprout className="mr-2 h-4 w-4" />
              {seeding ? "Seeding..." : "Seed Engine"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeedEngine(true)}
              disabled={seeding}
            >
              {seeding ? "..." : "Re-seed"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearEngine}
              disabled={seeding}
              className="text-destructive hover:text-destructive"
            >
              {seeding ? "..." : "Clear All"}
            </Button>
          </div>
        </div>

        <TabsContent value="components" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {definitions.length} definition(s)
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Definition
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : definitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No component definitions yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  definitions.map((def) => (
                    <TableRow key={def.id}>
                      <TableCell className="font-medium">{def.slug}</TableCell>
                      <TableCell>
                        <span className="capitalize">{def.category}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {rendererOptions.find((r) => r.value === def.renderer)?.label ?? def.renderer}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[def.status] ?? "outline"}>
                          {def.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{def.version}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <FlowDesigner />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationManagerTab />
        </TabsContent>

        <TabsContent value="authorization" className="space-y-4">
          <AuthorizationTab />
        </TabsContent>

        <TabsContent value="playground" className="space-y-4">
          <EnginePlayground />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Definition" : "Create Definition"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="def-slug">Slug *</Label>
                <Input
                  id="def-slug"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="e.g. text-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Field Type *</Label>
                <Select
                  value={form.renderer}
                  onValueChange={(v) => updateField("renderer", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rendererOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            — {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => updateField("category", v as ComponentCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="capitalize">{c}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    updateField("status", v as ComponentDefinition["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="capitalize">{s}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="def-data-schema">Data Schema (JSON)</Label>
              <Textarea
                id="def-data-schema"
                rows={4}
                className="font-mono text-sm"
                value={form.dataSchema}
                onChange={(e) => updateField("dataSchema", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="def-default-config">Default Config (JSON)</Label>
              <Textarea
                id="def-default-config"
                rows={3}
                className="font-mono text-sm"
                value={form.defaultConfig}
                onChange={(e) => updateField("defaultConfig", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="def-validations">Validations (JSON array)</Label>
              <Textarea
                id="def-validations"
                rows={3}
                className="font-mono text-sm"
                value={form.validations}
                onChange={(e) => updateField("validations", e.target.value)}
              />
            </div>

            {/* Data Source */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Data Source</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select
                    value={form.dataSourceType}
                    onValueChange={(v) => updateField("dataSourceType", v as FormState["dataSourceType"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (static options)</SelectItem>
                      <SelectItem value="reference">System Reference Data</SelectItem>
                      <SelectItem value="entity">Entity Data (live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.dataSourceType === "reference" && (
                  <div className="space-y-2">
                    <Label>Dataset</Label>
                    <Select
                      value={form.dataSourceDatasetSlug}
                      onValueChange={(v) => updateField("dataSourceDatasetSlug", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select dataset..." /></SelectTrigger>
                      <SelectContent>
                        {refDatasets.map((ds) => (
                          <SelectItem key={ds.datasetSlug} value={ds.datasetSlug}>
                            {ds.name_en}
                          </SelectItem>
                        ))}
                        {refDatasets.length === 0 && (
                          <SelectItem value="__none" disabled>No datasets yet</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.dataSourceType === "entity" && (
                  <>
                    <div className="space-y-2">
                      <Label>Resource</Label>
                      <Select
                        value={form.dataSourceResource}
                        onValueChange={(v) => updateField("dataSourceResource", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select resource..." /></SelectTrigger>
                        <SelectContent>
                          {entityResources.map((r) => (
                            <SelectItem key={r.key} value={r.key}>
                              {r.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Field</Label>
                      <Input
                        value={form.dataSourceDisplayField}
                        onChange={(e) => updateField("dataSourceDisplayField", e.target.value)}
                        placeholder={entityResources.find((r) => r.key === form.dataSourceResource)?.titleField ?? "name"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* i18n English */}
            <div className="space-y-2">
              <p className="text-sm font-medium">English (en)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="def-en-label">Label</Label>
                  <Input
                    id="def-en-label"
                    value={form.enLabel}
                    onChange={(e) => updateField("enLabel", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="def-en-placeholder">Placeholder</Label>
                  <Input
                    id="def-en-placeholder"
                    value={form.enPlaceholder}
                    onChange={(e) => updateField("enPlaceholder", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* i18n Arabic */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Arabic (ar)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="def-ar-label">Label</Label>
                  <Input
                    id="def-ar-label"
                    value={form.arLabel}
                    onChange={(e) => updateField("arLabel", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="def-ar-placeholder">Placeholder</Label>
                  <Input
                    id="def-ar-placeholder"
                    value={form.arPlaceholder}
                    onChange={(e) => updateField("arPlaceholder", e.target.value)}
                  />
                </div>
              </div>
            </div>

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
            <DialogTitle>Delete Definition</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this component definition? This
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
    </PageShell>
  );
}
