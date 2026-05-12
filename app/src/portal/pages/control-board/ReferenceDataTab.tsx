import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  GripVertical,
  Sparkles,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { getReferenceDataManager, getReferenceDataRefresher } from "../../engine/hooks-internal";
import type {
  ReferenceDataset,
  ReferenceEntry,
  RefreshSource,
} from "../../engine/reference-data";

type IntervalUnit = "manual" | "day" | "week" | "month" | "custom";

interface DatasetFormState {
  datasetSlug: string;
  name_en: string;
  name_ar: string;
  description: string;
  entries: ReferenceEntryDraft[];
  refreshSourceEnabled: boolean;
  refreshUrl: string;
  refreshIntervalUnit: IntervalUnit;
  refreshIntervalCount: string;
  refreshMergeStrategy: "enrich" | "replace";
  refreshArrayPath: string;
  refreshValueField: string;
  refreshLabelEnField: string;
  refreshLabelArField: string;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

function msToIntervalForm(ms: number): {
  unit: IntervalUnit;
  count: string;
} {
  if (!Number.isFinite(ms) || ms <= 0) return { unit: "manual", count: "" };
  if (ms % MS_MONTH === 0) return { unit: "month", count: String(ms / MS_MONTH) };
  if (ms % MS_WEEK === 0) return { unit: "week", count: String(ms / MS_WEEK) };
  if (ms % MS_DAY === 0) return { unit: "day", count: String(ms / MS_DAY) };
  return { unit: "custom", count: String(ms) };
}

function intervalFormToMs(unit: IntervalUnit, count: string): number {
  if (unit === "manual") return 0;
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return NaN;
  if (unit === "day") return n * MS_DAY;
  if (unit === "week") return n * MS_WEEK;
  if (unit === "month") return n * MS_MONTH;
  return n;
}

interface ReferenceEntryDraft {
  value: string;
  label_en: string;
  label_ar: string;
  order: string;
  /** Per-entry extras (e.g. dialCode). Read-only in the UI; refresher-managed. */
  data?: Record<string, unknown>;
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
  refreshIntervalUnit: "manual",
  refreshIntervalCount: "",
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
    data: entry.data,
    original: entry,
    isUserEdited: entry.isUserEdited,
  };
}

function formFromDataset(dataset: ReferenceDataset): DatasetFormState {
  const src = dataset.refreshSource;
  const { unit, count } = msToIntervalForm(src?.intervalMs ?? 0);
  return {
    datasetSlug: dataset.datasetSlug,
    name_en: dataset.name_en,
    name_ar: dataset.name_ar ?? "",
    description: dataset.description ?? "",
    entries: dataset.entries.map(entryToForm),
    refreshSourceEnabled: !!src,
    refreshUrl: src?.url ?? "",
    refreshIntervalUnit: unit,
    refreshIntervalCount: count,
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
  const secs = Math.floor(diffMs / 1000);
  if (secs < 5) return "Just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
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

// --------------------------------------------------------------------------
// JSON tree + drag-and-drop for "Fetch sample"
// --------------------------------------------------------------------------

type SampleShape =
  | { kind: "array"; count: number; sample: unknown }
  | { kind: "object-map"; count: number; sample: unknown; sampleKey: string }
  | { kind: "scalar"; sample: unknown };

interface TreeLeaf {
  /** Dot-path the user will drag onto a slot. */
  path: string;
  /** Human-readable display (e.g. "name.common"). */
  label: string;
  /** The actual value at this path, shown as a hint. */
  preview: string;
  /** True for synthetic $key/$value rows used with object-map APIs. */
  synthetic?: boolean;
}

function detectShape(data: unknown): SampleShape {
  if (Array.isArray(data)) {
    return { kind: "array", count: data.length, sample: data[0] };
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    // Heuristic: treat as object-map only if every value is a primitive or a
    // shallow object. Otherwise it's just a regular response object.
    const looksLikeMap =
      keys.length > 3 &&
      keys.every((k) => {
        const v = obj[k];
        return v === null || typeof v !== "object" || !Array.isArray(v);
      });
    if (looksLikeMap) {
      const sampleKey = keys[0];
      return {
        kind: "object-map",
        count: keys.length,
        sample: obj[sampleKey],
        sampleKey,
      };
    }
  }
  return { kind: "scalar", sample: data };
}

function buildLeaves(sample: unknown, prefix = "", out: TreeLeaf[] = []): TreeLeaf[] {
  if (sample === null || sample === undefined) {
    out.push({
      path: prefix,
      label: prefix || "(root)",
      preview: String(sample),
    });
    return out;
  }
  if (typeof sample !== "object") {
    out.push({
      path: prefix,
      label: prefix || "(root)",
      preview: JSON.stringify(sample),
    });
    return out;
  }
  if (Array.isArray(sample)) {
    out.push({
      path: prefix,
      label: `${prefix || "(root)"} [array]`,
      preview: `${sample.length} items`,
    });
    return out;
  }
  for (const [k, v] of Object.entries(sample as Record<string, unknown>)) {
    const nextPath = prefix ? `${prefix}.${k}` : k;
    buildLeaves(v, nextPath, out);
  }
  return out;
}

const DROP_SLOT_IDS = {
  value: "drop-value",
  labelEn: "drop-label-en",
  labelAr: "drop-label-ar",
} as const;

/**
 * Read a dot-path from a sample value. Supports `$key` / `$value` tokens for
 * object-map samples. Returns undefined if the path doesn't exist.
 */
function valueAtPath(shape: SampleShape | null, path: string): unknown {
  if (!shape || shape.kind === "scalar") return undefined;
  if (!path) return shape.sample;
  if (shape.kind === "object-map") {
    if (path === "$key") return shape.sampleKey;
    if (path === "$value") return shape.sample;
  }
  const parts = path.split(".");
  let cur: unknown = shape.sample;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function previewSnippet(v: unknown): string {
  if (v === undefined) return "(no value at this path)";
  if (v === null) return "null";
  if (typeof v === "string") {
    const s = v.length > 40 ? v.slice(0, 40) + "…" : v;
    return `"${s}"`;
  }
  if (typeof v === "object") return Array.isArray(v) ? `[${v.length} items]` : "{…}";
  return String(v);
}

/**
 * Score a path's suitability for each slot based on its name and value shape.
 * Higher score = better fit. Negative scores disqualify.
 */
type SlotKind = "value" | "labelEn" | "labelAr";

const VALUE_NAME_HINTS = [
  "cca2",
  "cca3",
  "ccn3",
  "iso",
  "iso2",
  "iso3",
  "alpha2",
  "alpha3",
  "code",
  "id",
  "key",
  "slug",
  "symbol",
];
const EN_NAME_HINTS = [
  "name.common",
  "name.official",
  "name_en",
  "label_en",
  "english",
  "title",
  "label",
  "display",
];
const AR_NAME_HINTS = ["ara", "arabic", "_ar", ".ar"];

function pathMatchesHint(path: string, hint: string): boolean {
  const p = path.toLowerCase();
  const h = hint.toLowerCase();
  return p === h || p.endsWith("." + h) || p.includes(h);
}

function scoreForSlot(
  leaf: TreeLeaf,
  slot: SlotKind,
  shape: SampleShape | null,
): number {
  if (!leaf.path) return -10;
  const val = valueAtPath(shape, leaf.path);
  // Only primitives can fill these slots.
  if (val !== null && typeof val === "object") return -10;
  const path = leaf.path.toLowerCase();

  if (slot === "labelAr") {
    // Must look Arabic-ish by path; otherwise disqualify.
    const matchesAr = AR_NAME_HINTS.some((h) => pathMatchesHint(path, h));
    if (!matchesAr) return -10;
    if (typeof val !== "string" || val.length === 0) return -5;
    return 10 + (val.length > 1 ? 1 : 0);
  }

  // For EN label and Value, disqualify anything that looks Arabic.
  const looksArabic = AR_NAME_HINTS.some((h) => pathMatchesHint(path, h));
  if (looksArabic) return -10;

  if (slot === "value") {
    // Strong signals: known code-like names, short uppercase strings.
    let score = 0;
    if (VALUE_NAME_HINTS.some((h) => pathMatchesHint(path, h))) score += 10;
    if (leaf.synthetic && leaf.path === "$key") score += 12; // object-map default
    if (typeof val === "string") {
      if (/^[A-Z0-9_-]{2,6}$/.test(val)) score += 4; // short code shape
      if (val.length > 40) score -= 5;
    } else if (typeof val === "number") {
      score += 2;
    }
    // Prefer shorter (root-level) paths
    score -= path.split(".").length - 1;
    return score;
  }

  // labelEn
  let score = 0;
  if (EN_NAME_HINTS.some((h) => pathMatchesHint(path, h))) score += 10;
  if (leaf.synthetic && leaf.path === "$value") score += 6; // object-map fallback
  if (typeof val === "string") {
    if (val.length >= 3 && val.length <= 80) score += 3;
    if (/^[A-Z0-9_-]{2,6}$/.test(val)) score -= 2; // looks like a code, not a name
  }
  score -= path.split(".").length - 1;
  return score;
}

function suggestSlotPaths(
  leaves: TreeLeaf[],
  shape: SampleShape | null,
): { value?: string; labelEn?: string; labelAr?: string } {
  const pickBest = (slot: SlotKind): string | undefined => {
    let best: { path: string; score: number } | null = null;
    for (const leaf of leaves) {
      const s = scoreForSlot(leaf, slot, shape);
      if (s <= 0) continue;
      if (!best || s > best.score) best = { path: leaf.path, score: s };
    }
    return best?.path;
  };
  return {
    value: pickBest("value"),
    labelEn: pickBest("labelEn"),
    labelAr: pickBest("labelAr"),
  };
}

function DraggableLeaf({
  leaf,
  onPick,
}: {
  leaf: TreeLeaf;
  onPick: (slot: "value" | "labelEn" | "labelAr", path: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `leaf-${leaf.path || "root"}`,
    data: { path: leaf.path },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-2 rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 bg-muted" : "hover:bg-muted/60"
      } ${leaf.synthetic ? "border border-dashed border-amber-400/60" : ""}`}
      title={`Drag onto a slot, or click a button to assign: ${leaf.path}`}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <code className="font-mono text-[11px] shrink-0">{leaf.label}</code>
      <span className="text-muted-foreground truncate flex-1">
        {leaf.preview}
      </span>
      <div className="hidden group-hover:flex items-center gap-1">
        <button
          type="button"
          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-accent"
          onClick={(e) => {
            e.preventDefault();
            onPick("value", leaf.path);
          }}
        >
          value
        </button>
        <button
          type="button"
          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-accent"
          onClick={(e) => {
            e.preventDefault();
            onPick("labelEn", leaf.path);
          }}
        >
          EN
        </button>
        <button
          type="button"
          className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-accent"
          onClick={(e) => {
            e.preventDefault();
            onPick("labelAr", leaf.path);
          }}
        >
          AR
        </button>
      </div>
    </div>
  );
}

function DropSlot({
  slotId,
  label,
  description,
  required,
  value,
  onChange,
  placeholder,
  previewValue,
  suggested,
  onClear,
}: {
  slotId: string;
  label: string;
  description?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Sample value at the current path, if a sample has been fetched. */
  previewValue?: unknown;
  /** True if the current value was auto-suggested (not user-typed/dragged). */
  suggested?: boolean;
  onClear?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const showPreview = !!value.trim() && previewValue !== undefined;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label htmlFor={slotId} className="font-medium">
          {label}
          {required ? " *" : ""}
        </Label>
        {suggested && value.trim() && (
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            suggested
          </Badge>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
      <div
        ref={setNodeRef}
        className={`flex items-center gap-1 rounded-md border transition ${
          isOver ? "ring-2 ring-primary border-primary" : ""
        } ${suggested && value.trim() ? "border-dashed" : ""}`}
      >
        <Input
          id={slotId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm border-0"
        />
        {value.trim() && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-1 text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {showPreview && (
        <p className="text-[11px] text-muted-foreground">
          → <span className="font-mono">{previewSnippet(previewValue)}</span>
        </p>
      )}
    </div>
  );
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
  const [sampling, setSampling] = useState(false);
  const [sampleShape, setSampleShape] = useState<SampleShape | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<{
    value?: boolean;
    labelEn?: boolean;
    labelAr?: boolean;
  }>({});

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

  const resetSample = useCallback(() => {
    setSampleShape(null);
    setSampleError(null);
    setSampling(false);
    setSuggestedSlots({});
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowAdvanced(false);
    resetSample();
    setDialogOpen(true);
  }, [resetSample]);

  const openEdit = useCallback(
    (dataset: ReferenceDataset) => {
      setEditingId(dataset.id);
      setForm(formFromDataset(dataset));
      setFormError(null);
      setShowAdvanced(!!dataset.refreshSource);
      resetSample();
      setDialogOpen(true);
    },
    [resetSample],
  );

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

  const handleFetchSample = useCallback(async () => {
    const url = form.refreshUrl.trim();
    if (!url) {
      setSampleError("Enter an API URL first.");
      return;
    }
    setSampling(true);
    setSampleError(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let data: unknown;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        data = await res.json();
      } finally {
        clearTimeout(timer);
      }
      const shape = detectShape(data);
      setSampleShape(shape);

      // Build leaves from this shape so we can suggest paths.
      const leaves: TreeLeaf[] = [];
      if (shape.kind === "array") {
        buildLeaves(shape.sample, "", leaves);
      } else if (shape.kind === "object-map") {
        leaves.push({
          path: "$key",
          label: "$key",
          preview: `the key (e.g. "${shape.sampleKey}")`,
          synthetic: true,
        });
        leaves.push({
          path: "$value",
          label: "$value",
          preview:
            typeof shape.sample === "object"
              ? "the value object"
              : JSON.stringify(shape.sample),
          synthetic: true,
        });
        if (shape.sample && typeof shape.sample === "object") {
          buildLeaves(shape.sample, "", leaves);
        }
      }

      const suggestions = suggestSlotPaths(leaves, shape);

      setForm((prev) => {
        const next = { ...prev };
        if (shape.kind === "array") {
          next.refreshArrayPath = ".";
        } else if (shape.kind === "object-map") {
          next.refreshArrayPath = "$object";
        }
        const filled: { value?: boolean; labelEn?: boolean; labelAr?: boolean } = {};
        if (!prev.refreshValueField.trim() && suggestions.value) {
          next.refreshValueField = suggestions.value;
          filled.value = true;
        }
        if (!prev.refreshLabelEnField.trim() && suggestions.labelEn) {
          next.refreshLabelEnField = suggestions.labelEn;
          filled.labelEn = true;
        }
        if (!prev.refreshLabelArField.trim() && suggestions.labelAr) {
          next.refreshLabelArField = suggestions.labelAr;
          filled.labelAr = true;
        }
        setSuggestedSlots(filled);
        return next;
      });
    } catch (err) {
      setSampleError(err instanceof Error ? err.message : "Fetch failed.");
      setSampleShape(null);
    } finally {
      setSampling(false);
    }
  }, [form.refreshUrl]);

  const handlePickField = useCallback(
    (slot: "value" | "labelEn" | "labelAr", path: string) => {
      setForm((prev) => {
        if (slot === "value") return { ...prev, refreshValueField: path };
        if (slot === "labelEn") return { ...prev, refreshLabelEnField: path };
        return { ...prev, refreshLabelArField: path };
      });
      setSuggestedSlots((prev) => ({ ...prev, [slot]: false }));
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!event.over) return;
      const path = (event.active.data.current as { path?: string } | undefined)?.path;
      if (path === undefined) return;
      const target = String(event.over.id);
      if (target === DROP_SLOT_IDS.value) handlePickField("value", path);
      else if (target === DROP_SLOT_IDS.labelEn) handlePickField("labelEn", path);
      else if (target === DROP_SLOT_IDS.labelAr) handlePickField("labelAr", path);
    },
    [handlePickField],
  );

  const sampleLeaves = useMemo<TreeLeaf[]>(() => {
    if (!sampleShape) return [];
    if (sampleShape.kind === "scalar") return [];
    if (sampleShape.kind === "array") {
      return buildLeaves(sampleShape.sample);
    }
    // object-map: surface $key + $value as draggable synthetic rows, and
    // recurse into the sample value (if it's an object) for nested fields.
    const synthetic: TreeLeaf[] = [
      {
        path: "$key",
        label: "$key",
        preview: `the key (e.g. "${sampleShape.sampleKey}")`,
        synthetic: true,
      },
      {
        path: "$value",
        label: "$value",
        preview:
          typeof sampleShape.sample === "object"
            ? "the value object"
            : JSON.stringify(sampleShape.sample),
        synthetic: true,
      },
    ];
    const nested =
      sampleShape.sample && typeof sampleShape.sample === "object"
        ? buildLeaves(sampleShape.sample)
        : [];
    return [...synthetic, ...nested];
  }, [sampleShape]);

  const sampleBanner = useMemo(() => {
    if (!sampleShape) return null;
    if (sampleShape.kind === "array") {
      return `Found a list of ${sampleShape.count} item${
        sampleShape.count === 1 ? "" : "s"
      }. Drag a field below onto a slot.`;
    }
    if (sampleShape.kind === "object-map") {
      return `Found a lookup table with ${sampleShape.count} key${
        sampleShape.count === 1 ? "" : "s"
      }. Drag $key onto Value, and $value (or a nested field) onto a label.`;
    }
    return "Response is a single value — this API isn't a list.";
  }, [sampleShape]);

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
      const interval = intervalFormToMs(
        form.refreshIntervalUnit,
        form.refreshIntervalCount.trim(),
      );
      if (!Number.isFinite(interval) || interval < 0) {
        setFormError("Refresh interval must be a non-negative number.");
        return;
      }
      if (form.refreshIntervalUnit !== "manual" && form.refreshIntervalCount.trim() === "") {
        setFormError("Enter a value for the refresh interval, or choose Manual only.");
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
        ...(draft.data && Object.keys(draft.data).length > 0
          ? { data: draft.data }
          : {}),
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
                          {ds.refreshHistory && ds.refreshHistory.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Refresh history"
                                >
                                  <History className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                <div className="px-3 py-2 border-b text-xs font-medium">
                                  Last {ds.refreshHistory.length} refresh
                                  {ds.refreshHistory.length === 1 ? "" : "es"}
                                </div>
                                <div className="max-h-64 overflow-y-auto divide-y">
                                  {ds.refreshHistory.map((h, idx) => (
                                    <div key={idx} className="px-3 py-2 text-xs space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            h.status === "error"
                                              ? "destructive"
                                              : "default"
                                          }
                                          className="h-4 px-1 text-[10px]"
                                        >
                                          {h.status}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          {formatTimestamp(h.at)}
                                        </span>
                                        {h.entryCount !== undefined && (
                                          <span className="text-muted-foreground ml-auto">
                                            {h.entryCount} entries
                                          </span>
                                        )}
                                      </div>
                                      {h.error && (
                                        <p className="text-destructive font-mono text-[11px] break-all">
                                          {h.error}
                                        </p>
                                      )}
                                      <p className="text-muted-foreground text-[10px]">
                                        {new Date(h.at).toLocaleString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
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
              ) : (() => {
                // Detect any per-entry extra keys (e.g. dialCode) across entries.
                const extraKeySet = new Set<string>();
                for (const e of form.entries) {
                  if (e.data) for (const k of Object.keys(e.data)) extraKeySet.add(k);
                }
                const extraKeys = Array.from(extraKeySet);
                const baseCols = "1fr 1fr 1fr 80px";
                const extraCols = extraKeys.map(() => "120px").join(" ");
                const gridTemplate = `${baseCols}${extraCols ? " " + extraCols : ""} 36px`;
                return (
                <div className="space-y-2">
                  {/* Header row */}
                  <div
                    className="grid gap-2 px-1"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    <p className="text-xs font-medium text-muted-foreground">Value *</p>
                    <p className="text-xs font-medium text-muted-foreground">Label (EN) *</p>
                    <p className="text-xs font-medium text-muted-foreground">Label (AR)</p>
                    <p className="text-xs font-medium text-muted-foreground">Order</p>
                    {extraKeys.map((k) => (
                      <p key={k} className="text-xs font-medium text-muted-foreground" title={`Extra field "${k}" populated by the API refresher`}>
                        {k}
                      </p>
                    ))}
                    <span />
                  </div>
                  {form.entries.map((entry, index) => (
                    <div
                      key={index}
                      className="grid gap-2 items-center"
                      style={{ gridTemplateColumns: gridTemplate }}
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
                      {extraKeys.map((k) => {
                        const v = entry.data?.[k];
                        return (
                          <div
                            key={k}
                            className="h-8 px-2 flex items-center rounded-md bg-muted/40 border text-xs font-mono text-muted-foreground truncate"
                            title={v === undefined ? "(not set)" : String(v)}
                          >
                            {v === undefined || v === null ? "—" : String(v)}
                          </div>
                        );
                      })}
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
                );
              })()}
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
                    <DndContext onDragEnd={handleDragEnd}>
                      <div className="space-y-2">
                        <Label htmlFor="src-url">API URL *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="src-url"
                            value={form.refreshUrl}
                            onChange={(e) => updateField("refreshUrl", e.target.value)}
                            placeholder="https://api.example.com/data"
                            className="font-mono text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFetchSample}
                            disabled={sampling || !form.refreshUrl.trim()}
                            title="Call the API once and let you map fields by dragging"
                          >
                            <Sparkles className={`h-4 w-4 ${sampling ? "animate-pulse" : ""}`} />
                            <span className="ml-1">{sampling ? "Fetching..." : "Fetch sample"}</span>
                          </Button>
                        </div>
                        {sampleError && (
                          <p className="text-xs text-destructive">{sampleError}</p>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Repeats on</Label>
                          <div className="flex gap-2">
                            {form.refreshIntervalUnit !== "manual" && (
                              <Input
                                id="src-interval-count"
                                value={form.refreshIntervalCount}
                                onChange={(e) =>
                                  updateField(
                                    "refreshIntervalCount",
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  form.refreshIntervalUnit === "custom"
                                    ? "milliseconds"
                                    : "1"
                                }
                                type="number"
                                min="0"
                                className="text-sm w-28"
                              />
                            )}
                            <select
                              id="src-interval-unit"
                              value={form.refreshIntervalUnit}
                              onChange={(e) =>
                                updateField(
                                  "refreshIntervalUnit",
                                  e.target.value as IntervalUnit,
                                )
                              }
                              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                            >
                              <option value="manual">Manual only</option>
                              <option value="day">Day(s)</option>
                              <option value="week">Week(s)</option>
                              <option value="month">Month(s)</option>
                              <option value="custom">Custom (ms)</option>
                            </select>
                          </div>
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
                      {sampleBanner && (
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                          {sampleBanner}
                        </div>
                      )}
                      {sampleLeaves.length > 0 && (
                        <div className="rounded-md border">
                          <div className="border-b px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            Sample fields — drag onto a slot below
                          </div>
                          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                            {sampleLeaves.map((leaf) => (
                              <DraggableLeaf
                                key={leaf.path || "(root)"}
                                leaf={leaf}
                                onPick={handlePickField}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DropSlot
                          slotId={DROP_SLOT_IDS.value}
                          label="Stable code"
                          description='Unique ID per entry — short, never changes (e.g. "SA", "USD").'
                          required
                          value={form.refreshValueField}
                          onChange={(v) => {
                            updateField("refreshValueField", v);
                            setSuggestedSlots((prev) => ({ ...prev, value: false }));
                          }}
                          onClear={() => {
                            updateField("refreshValueField", "");
                            setSuggestedSlots((prev) => ({ ...prev, value: false }));
                          }}
                          placeholder="Drag a field, or type a path"
                          previewValue={valueAtPath(sampleShape, form.refreshValueField.trim())}
                          suggested={suggestedSlots.value}
                        />
                        <DropSlot
                          slotId={DROP_SLOT_IDS.labelEn}
                          label="English name"
                          description='Shown in the dropdown in English (e.g. "Saudi Arabia").'
                          required
                          value={form.refreshLabelEnField}
                          onChange={(v) => {
                            updateField("refreshLabelEnField", v);
                            setSuggestedSlots((prev) => ({ ...prev, labelEn: false }));
                          }}
                          onClear={() => {
                            updateField("refreshLabelEnField", "");
                            setSuggestedSlots((prev) => ({ ...prev, labelEn: false }));
                          }}
                          placeholder="Drag a field, or type a path"
                          previewValue={valueAtPath(sampleShape, form.refreshLabelEnField.trim())}
                          suggested={suggestedSlots.labelEn}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DropSlot
                          slotId={DROP_SLOT_IDS.labelAr}
                          label="Arabic name"
                          description='Shown in the dropdown in Arabic (e.g. "العربية السعودية"). Optional.'
                          value={form.refreshLabelArField}
                          onChange={(v) => {
                            updateField("refreshLabelArField", v);
                            setSuggestedSlots((prev) => ({ ...prev, labelAr: false }));
                          }}
                          onClear={() => {
                            updateField("refreshLabelArField", "");
                            setSuggestedSlots((prev) => ({ ...prev, labelAr: false }));
                          }}
                          placeholder="Drag a field, or leave empty"
                          previewValue={valueAtPath(sampleShape, form.refreshLabelArField.trim())}
                          suggested={suggestedSlots.labelAr}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="src-array-path" className="font-medium">Array Path</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Advanced — leave as-is unless the list lives inside a nested key.
                          </p>
                          <Input
                            id="src-array-path"
                            value={form.refreshArrayPath}
                            onChange={(e) =>
                              updateField("refreshArrayPath", e.target.value)
                            }
                            placeholder="Auto-filled after Fetch sample"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </DndContext>
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
