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
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getReferenceDataManager } from "../../engine/hooks-internal";
import type { ReferenceDataset, ReferenceEntry } from "../../engine/reference-data";

interface DatasetFormState {
  datasetSlug: string;
  name_en: string;
  name_ar: string;
  description: string;
  entries: ReferenceEntryDraft[];
}

interface ReferenceEntryDraft {
  value: string;
  label_en: string;
  label_ar: string;
  order: string;
}

const emptyForm: DatasetFormState = {
  datasetSlug: "",
  name_en: "",
  name_ar: "",
  description: "",
  entries: [],
};

function entryToForm(entry: ReferenceEntry): ReferenceEntryDraft {
  return {
    value: entry.value,
    label_en: entry.label_en,
    label_ar: entry.label_ar ?? "",
    order: entry.order !== undefined ? String(entry.order) : "",
  };
}

function formFromDataset(dataset: ReferenceDataset): DatasetFormState {
  return {
    datasetSlug: dataset.datasetSlug,
    name_en: dataset.name_en,
    name_ar: dataset.name_ar ?? "",
    description: dataset.description ?? "",
    entries: dataset.entries.map(entryToForm),
  };
}

function emptyEntry(): ReferenceEntryDraft {
  return { value: "", label_en: "", label_ar: "", order: "" };
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
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((dataset: ReferenceDataset) => {
    setEditingId(dataset.id);
    setForm(formFromDataset(dataset));
    setFormError(null);
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

    const entries: ReferenceEntry[] = form.entries.map((e) => ({
      value: e.value.trim(),
      label_en: e.label_en.trim(),
      ...(e.label_ar.trim() ? { label_ar: e.label_ar.trim() } : {}),
      ...(e.order.trim() !== "" ? { order: Number(e.order) } : {}),
    }));

    const payload = {
      datasetSlug: form.datasetSlug.trim(),
      name_en: form.name_en.trim(),
      ...(form.name_ar.trim() ? { name_ar: form.name_ar.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      entries,
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
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : datasets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No reference datasets yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell className="font-mono text-sm">{ds.datasetSlug}</TableCell>
                  <TableCell className="font-medium">{ds.name_en}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ds.entries.length}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ds.version}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(ds)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDelete(ds.id)}
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
