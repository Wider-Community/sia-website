import { useState, useMemo } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { Link } from "react-router-dom";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { KanbanBoard, type KanbanColumn } from "@/portal/components/KanbanBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft } from "lucide-react";
import type { Task, Engagement } from "../../schemas";
import { ENGAGEMENT_STAGES } from "../../schemas";

const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  in_progress: "#3b82f6",
  negotiating: "#f59e0b",
  formalized: "#8b5cf6",
  active: "#22c55e",
  completed: "#10b981",
  dormant: "#6b7280",
};

const priorityColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TaskCard({ task }: { task: Task }) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className="shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardContent className="p-3 space-y-1.5">
          <div className="font-medium text-sm leading-tight">{task.title}</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={priorityColor[task.priority] ?? "outline"} className="text-[10px]">
              {task.priority}
            </Badge>
            <Badge variant={task.status === "done" ? "secondary" : "default"} className="text-[10px]">
              {task.status}
            </Badge>
          </div>
          {task.dueDate && (
            <div className="text-[10px] text-muted-foreground">
              Due {formatDate(task.dueDate)}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TaskBoardPage() {
  const [showDone, setShowDone] = useState(false);

  // Fetch tasks
  const { result: tasksResult, query: tasksQuery } = useList<Task>({
    resource: "tasks",
    pagination: { mode: "off" },
  });
  const allTasks = tasksResult?.data ?? [];

  // Fetch engagements
  const { result: engResult, query: engQuery } = useList<Engagement>({
    resource: "engagements",
    pagination: { mode: "off" },
  });
  const allEngagements = engResult?.data ?? [];

  const { mutate: updateTask } = useUpdate();

  const [pendingMove, setPendingMove] = useState<{
    itemId: string;
    toColumnId: string;
  } | null>(null);

  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (showDone) return allTasks;
    return allTasks.filter((t) => t.status !== "done");
  }, [allTasks, showDone]);

  // Build engagement map for titles
  const engMap = useMemo(() => {
    const m = new Map<string, Engagement>();
    allEngagements.forEach((e) => m.set(e.id, e));
    return m;
  }, [allEngagements]);

  // Build columns: "unassigned" first, then one per engagement
  const columns: KanbanColumn<Task>[] = useMemo(() => {
    const unassigned: KanbanColumn<Task> = {
      id: "__unassigned__",
      title: "Unassigned",
      color: "#6b7280",
      items: filteredTasks.filter((t) => !t.engagementId),
    };

    const engColumns = allEngagements.map((eng) => {
      const stageColor = STAGE_COLORS[eng.stage] ?? "#888";
      return {
        id: eng.id,
        title: eng.title,
        color: stageColor,
        items: filteredTasks.filter((t) => t.engagementId === eng.id),
      };
    });

    return [unassigned, ...engColumns];
  }, [filteredTasks, allEngagements]);

  function handleDragEnd(itemId: string, _from: string, to: string) {
    setPendingMove({ itemId, toColumnId: to });
  }

  function confirmMove() {
    if (!pendingMove) return;
    const newEngagementId = pendingMove.toColumnId === "__unassigned__" ? "" : pendingMove.toColumnId;
    updateTask({
      resource: "tasks",
      id: pendingMove.itemId,
      values: { engagementId: newEngagementId },
    });
    setPendingMove(null);
  }

  const targetLabel =
    pendingMove?.toColumnId === "__unassigned__"
      ? "Unassigned"
      : engMap.get(pendingMove?.toColumnId ?? "")?.title ?? "";
  const movingLabel = allTasks.find((t) => t.id === pendingMove?.itemId)?.title ?? "";

  const isLoading = tasksQuery.isLoading || engQuery.isLoading;

  return (
    <PageShell>
      <PageHeader
        title="Task Board"
        backTo="/portal/tasks"
        actions={
          <Link
            to="/portal/tasks"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="rounded"
          />
          Show done tasks
        </label>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <KanbanBoard<Task>
          columns={columns}
          onDragEnd={handleDragEnd}
          renderCard={(task) => <TaskCard task={task} />}
        />
      )}

      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to {targetLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{movingLabel}</strong> to <strong>{targetLabel}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
