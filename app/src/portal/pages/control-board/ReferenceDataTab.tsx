import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Lock,
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getReferenceDataManager, getReferenceDataRefresher } from "../../engine/hooks-internal";
import type {
  ReferenceDataset,
  ReferenceEntry,
  RefreshSource,
} from "../../engine/reference-data";

interface DatasetFormState {
  datasetSlug: string;
  name_en: string;
  name_ar: string;
  description: string;
  entries: ReferenceEntryDraft[];
  refreshSourceEnabled: boolean;
  refreshUrl: string;
  refreshIntervalMs: string;
  refreshMergeStrategy: "enrich" | "replace";
  refreshArrayPath: string;
  refreshValueField: string;
  refreshLabelEnField: string;
  refreshLabelArField: string;
}

interface ReferenceEntryDraft {
  value: string;
  label_en: string;
  label_ar: string;
  order: string;
  /** Snapshot of original entry to detect changes; missing for newly-added rows. */
  original?: ReferenceEntry;
  /** Existing isUserEdited flag from storage (for entries that were edited before). */
  isUserEdited?: boolean;
}

const emptyForm: DatasetFormState = {
  datasetSlug: "",
  name_en: "",
  name_ar: "",
  description: "",
  entries: [],
  refreshSourceEnabled: false,
  refreshUrl: "",
  refreshIntervalMs: "",
  refreshMergeStrategy: "enrich",
  refreshArrayPath: ".",
  refreshValueField: "",
  refreshLabelEnField: "",
  refreshLabelArField: "",
};

function entryToForm(entry: ReferenceEntry): ReferenceEntryDraft {
  return {
    value: entry.value,
    label_en: entry.label_en,
    label_ar: entry.label_ar ?? "",
    order: entry.order !== undefined ? String(entry.order) : "",
    original: entry,
    isUserEdited: entry.isUserEdited,
  };
}

function formFromDataset(dataset: ReferenceDataset): DatasetFormState {
  const src = dataset.refreshSource;
  return {
    datasetSlug: dataset.datasetSlug,
    name_en: dataset.name_en,
    name_ar: dataset.name_ar ?? "",
    description: dataset.description ?? "",
    entries: dataset.entries.map(entryToForm),
    refreshSourceEnabled: !!src,
    refreshUrl: src?.url ?? "",
    refreshIntervalMs: src ? String(src.intervalMs) : "",
    refreshMergeStrategy: src?.mergeStrategy ?? "enrich",
    refreshArrayPath: src?.mapping.arrayPath ?? ".",
    refreshValueField: src?.mapping.valueField ?? "",
    refreshLabelEnField: src?.mapping.labelEnField ?? "",
    refreshLabelArField: src?.mapping.labelArField ?? "",
  };
}

function emptyEntry(): ReferenceEntryDraft {
  return { value: "", label_en: "", label_ar: "", order: "" };
}

function entryChanged(draft: ReferenceEntryDraft): boolean {
  if (!draft.original) return true; // newly added
  const orig = draft.original;
  if (draft.value.trim() !== orig.value) return true;
  if (draft.label_en.trim() !== orig.label_en) return true;
  if ((draft.label_ar.trim() || undefined) !== orig.label_ar) return true;
  const draftOrder = draft.order.trim() === "" ? undefined : Number(draft.order);
  if (draftOrder !== orig.order) return true;
  return false;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadgeVariant(
  status?: "ok" | "error" | "never",
): "secondary" | "destructive" | "default" {
  if (status === "error") return "destructive";
  if (status === "ok") return "default";
  return "secondary";
}

export function ReferenceDataTab() {
  const [datasets, setDatasets] = useState<ReferenceDataset[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<DatasetFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const manager = getReferenceDataManager();
      const list = await manager.listDatasets();
      setDatasets(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowAdvanced(false);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((dataset: ReferenceDataset) => {
    setEditingId(dataset.id);
    setForm(formFromDataset(dataset));
    setFormError(null);
    setShowAdvanced(!!dataset.refreshSource);
    setDialogOpen(true);
  }, []);

  const openDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const updateField = useCallback(
    <K extends keyof Omit<DatasetFormState, "entries">>(
      key: K,
      value: DatasetFormState[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateEntry = useCallback(
    (index: number, field: keyof ReferenceEntryDraft, value: string) => {
      setForm((prev) => {
        const entries = [...prev.entries];
        entries[index] = { ...entries[index], [field]: value };
        return { ...prev, entries };
      });
    },
    [],
  );

  const addEntry = useCallback(() => {
    setForm((prev) => ({ ...prev, entries: [...prev.entries, emptyEntry()] }));
  }, []);

  const removeEntry = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  }, []);

  const handleManualRefresh = useCallback(
    async (slug: string) => {
      setRefreshing((prev) => ({ ...prev, [slug]: true }));
      try {
        const refresher = getReferenceDataRefresher();
        await refresher.refreshNow(slug);
        toast.success(`Refreshed "${slug}".`);
        await loadDatasets();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Refresh failed.");
      } finally {
        setRefreshing((prev) => {
          const next = { ...prev };
          delete next[slug];
          return next;
        });
      }
    },
    [loadDatasets],
  );

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!form.datasetSlug.trim()) {
      setFormError("Dataset slug is required.");
      return;
    }
    if (!form.name_en.trim()) {
      setFormError("English name is required.");
      return;
    }

    for (let i = 0; i < form.entries.length; i++) {
      const entry = form.entries[i];
      if (!entry.value.trim()) {
        setFormError(`Entry ${i + 1}: value is required.`);
        return;
      }
      if (!entry.label_en.trim()) {
        setFormError(`Entry ${i + 1}: English label is required.`);
        return;
      }
    }

    let refreshSource: RefreshSource | undefined;
    if (form.refreshSourceEnabled) {
      if (!form.refreshUrl.trim()) {
        setFormError("API URL is required when refresh source is enabled.");
        return;
      }
      if (!form.refreshValueField.trim()) {
        setFormError("Value field is required when refresh source is enabled.");
        return;
      }
      if (!form.refreshLabelEnField.trim()) {
        setFormError("EN label field is required when refresh source is enabled.");
        return;
      }
      const intervalRaw = form.refreshIntervalMs.trim();
      const interval = intervalRaw === "" ? 0 : Number(intervalRaw);
      if (!Number.isFinite(interval) || interval < 0) {
        setFormError("Interval (ms) must be a non-negative number.");
        return;
      }
      refreshSource = {
        url: form.refreshUrl.trim(),
        intervalMs: interval,
        mergeStrategy: form.refreshMergeStrategy,
        mapping: {
          arrayPath: form.refreshArrayPath.trim() || ".",
          valueField: form.refreshValueField.trim(),
          labelEnField: form.refreshLabelEnField.trim(),
          ...(form.refreshLabelArField.trim()
            ? { labelArField: form.refreshLabelArField.trim() }
            : {}),
        },
      };
    }

    const entries: ReferenceEntry[] = form.entries.map((draft) => {
      const changedNow = entryChanged(draft);
      const wasFlagged = draft.isUserEdited === true;
      // Mark as user-edited if the human just changed it OR it was already flagged.
      const isUserEdited = changedNow || wasFlagged;
      return {
        value: draft.value.trim(),
        label_en: draft.label_en.trim(),
        ...(draft.label_ar.trim() ? { label_ar: draft.label_ar.trim() } : {}),
        ...(draft.order.trim() !== "" ? { order: Number(draft.order) } : {}),
        ...(isUserEdited ? { isUserEdited: true } : {}),
      };
    });

    const payload = {
      datasetSlug: form.datasetSlug.trim(),
      name_en: form.name_en.trim(),
      ...(form.name_ar.trim() ? { name_ar: form.name_ar.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      entries,
      refreshSource,
    };

    setSaving(true);
    try {
      const manager = getReferenceDataManager();
      if (editingId) {
        await manager.updateDataset(editingId, payload);
        toast.success("Dataset updated.");
      } else {
        await manager.createDataset(payload);
        toast.success("Dataset created.");
      }
      // Reschedule auto-refresh loops since refreshSource may have changed.
      try {
        await getReferenceDataRefresher().rescheduleAll();
      } catch {
        /* non-fatal */
      }
      setDialogOpen(false);
      await loadDatasets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, loadDatasets]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      const manager = getReferenceDataManager();
      await manager.deleteDataset(deletingId);
      toast.success("Dataset deleted.");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      await loadDatasets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete dataset.");
      console.error("Failed to delete dataset:", err);
    } finally {
      setSaving(false);
    }
  }, [deletingId, loadDatasets]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${datasets.length} dataset(s)`}
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Dataset
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last Refresh</TableHead>
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
            ) : datasets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No reference datasets yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((ds) => {
                const hasSource = !!ds.refreshSource;
                const status = ds.lastRefreshStatus ?? "never";
                const isRefreshing = !!refreshing[ds.datasetSlug];
                return (
                  <TableRow key={ds.id}>
                    <TableCell className="font-mono text-sm">{ds.datasetSlug}</TableCell>
                    <TableCell className="font-medium">{ds.name_en}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ds.entries.length}</Badge>
                    </TableCell>
                    <TableCell>
                      {hasSource ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          API
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">curated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasSource ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={statusBadgeVariant(status)}
                            title={
                              status === "error"
                                ? ds.lastRefreshError ?? "Refresh failed"
                                : ds.lastRefreshedAt ?? ""
                            }
                          >
                            {status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(ds.lastRefreshedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasSource && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleManualRefresh(ds.datasetSlug)}
                            disabled={isRefreshing}
                            title="Refresh from API"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(ds)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {ds.isSystem ? (
                          <Lock className="h-4 w-4 text-muted-foreground ml-2" title="System dataset — cannot be deleted" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(ds.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Dataset" : "Create Dataset"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            {/* Basic fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds-slug">Dataset Slug *</Label>
                <Input
                  id="ds-slug"
                  value={form.datasetSlug}
                  onChange={(e) => updateField("datasetSlug", e.target.value)}
                  placeholder="e.g. countries"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-name-en">Name (English) *</Label>
                <Input
                  id="ds-name-en"
                  value={form.name_en}
                  onChange={(e) => updateField("name_en", e.target.value)}
                  placeholder="e.g. Countries"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds-name-ar">Name (Arabic)</Label>
                <Input
                  id="ds-name-ar"
                  value={form.name_ar}
                  onChange={(e) => updateField("name_ar", e.target.value)}
                  placeholder="e.g. الدول"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-description">Description</Label>
                <Input
                  id="ds-description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Entries section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Entries</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Entry
                </Button>
              </div>

              {form.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">
                  No entries yet. Click "Add Entry" to add lookup values.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_80px_36px] gap-2 px-1">
                    <p className="text-xs font-medium text-muted-foreground">Value *</p>
                    <p className="text-xs font-medium text-muted-foreground">Label (EN) *</p>
                    <p className="text-xs font-medium text-muted-foreground">Label (AR)</p>
                    <p className="text-xs font-medium text-muted-foreground">Order</p>
                    <span />
                  </div>
                  {form.entries.map((entry, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_1fr_1fr_80px_36px] gap-2 items-center"
                    >
                      <Input
                        value={entry.value}
                        onChange={(e) => updateEntry(index, "value", e.target.value)}
                        placeholder="value"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={entry.label_en}
                        onChange={(e) => updateEntry(index, "label_en", e.target.value)}
                        placeholder="English label"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={entry.label_ar}
                        onChange={(e) => updateEntry(index, "label_ar", e.target.value)}
                        placeholder="Arabic label"
                        className="h-8 text-sm"
                        dir="rtl"
                      />
                      <Input
                        value={entry.order}
                        onChange={(e) => updateEntry(index, "order", e.target.value)}
                        placeholder="0"
                        type="number"
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeEntry(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* External API Source (collapsible) */}
            <div className="space-y-3 border rounded-md p-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium w-full"
              >
                {showAdvanced ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Globe className="h-4 w-4" />
                External API Source
                {form.refreshSourceEnabled && (
                  <Badge variant="outline" className="ml-2">enabled</Badge>
                )}
              </button>
              {showAdvanced && (
                <div className="space-y-3 pl-6">
                  <div className="flex items-center gap-2">
                    <input
                      id="src-enabled"
                      type="checkbox"
                      checked={form.refreshSourceEnabled}
                      onChange={(e) =>
                        updateField("refreshSourceEnabled", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="src-enabled" className="cursor-pointer">
                      Refresh entries from an external API
                    </Label>
                  </div>
                  {form.refreshSourceEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="src-url">API URL *</Label>
                        <Input
                          id="src-url"
                          value={form.refreshUrl}
                          onChange={(e) => updateField("refreshUrl", e.target.value)}
                          placeholder="https://api.example.com/data"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="src-interval">Interval (ms)</Label>
                          <Input
                            id="src-interval"
                            value={form.refreshIntervalMs}
                            onChange={(e) =>
                              updateField("refreshIntervalMs", e.target.value)
                            }
                            placeholder="0 = manual only"
                            type="number"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="src-strategy">Merge Strategy</Label>
                          <select
                            id="src-strategy"
                            value={form.refreshMergeStrategy}
                            onChange={(e) =>
                              updateField(
                                "refreshMergeStrategy",
                                e.target.value as "enrich" | "replace",
                              )
                            }
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          >
                            <option value="enrich">Enrich (preserve curated)</option>
                            <option value="replace">Replace (API authoritative)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="src-array-path">Array Path</Label>
                          <Input
                            id="src-array-path"
                            value={form.refreshArrayPath}
                            onChange={(e) =>
                              updateField("refreshArrayPath", e.target.value)
                            }
                            placeholder=". or $object or path.to.array"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="src-value-field">Value Field *</Label>
                          <Input
                            id="src-value-field"
                            value={form.refreshValueField}
                            onChange={(e) =>
                              updateField("refreshValueField", e.target.value)
                            }
                            placeholder="cca2 or $key"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="src-label-en">EN Label Field *</Label>
                          <Input
                            id="src-label-en"
                            value={form.refreshLabelEnField}
                            onChange={(e) =>
                              updateField("refreshLabelEnField", e.target.value)
                            }
                            placeholder="name.common or $value"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="src-label-ar">AR Label Field</Label>
                          <Input
                            id="src-label-ar"
                            value={form.refreshLabelArField}
                            onChange={(e) =>
                              updateField("refreshLabelArField", e.target.value)
                            }
                            placeholder="translations.ara.common"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use <code>$object</code>, <code>$key</code>, <code>$value</code> when the API returns an object map instead of an array.
                      </p>
                    </>
                  )}
                </div>
              )}
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
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this reference dataset? This action
            cannot be undone.
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
