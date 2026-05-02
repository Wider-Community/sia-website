import { useOne, useDelete } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Pencil, Trash2, Building2, Layers, CalendarDays, User } from "lucide-react";
import type { BaseRecord } from "@refinedev/core";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";

const statusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge variant="default">Open</Badge>;
    case "done":
      return <Badge variant="secondary">Done</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const priorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    low: "text-muted-foreground",
    medium: "",
    high: "text-orange-600",
  };
  return (
    <Badge variant="outline" className={colors[priority] ?? ""}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { query: taskQuery } = useOne({ resource: "tasks", id: id! });
  const task = taskQuery.data?.data;

  const { mutate: deleteTask } = useDelete();

  if (taskQuery.isLoading) {
    return <PageShell loading={true}>{null}</PageShell>;
  }

  if (!task) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Task not found</p>
        <Button variant="outline" onClick={() => navigate("/portal/tasks")}>
          Back to list
        </Button>
      </div>
    );
  }

  const subtitleParts = [
    task.organizationName as string,
    task.engagementName as string,
    task.priority ? `${(task.priority as string).charAt(0).toUpperCase()}${(task.priority as string).slice(1)} priority` : null,
  ].filter(Boolean);

  const subtitle = subtitleParts.join(" · ");

  return (
    <PageShell loading={taskQuery.isLoading}>
      <PageHeader
        title={(task.title as string) ?? ""}
        backTo="/portal/tasks"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/portal/tasks/edit/${id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{task.title as string}&rdquo;. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteTask(
                        { resource: "tasks", id: id! },
                        { onSuccess: () => navigate("/portal/tasks") },
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

      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Organization</dt>
              <dd>
                {task.organizationId ? (
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => navigate(`/portal/organizations/${task.organizationId}`)}
                  >
                    <Building2 className="mr-1 h-3 w-3" />
                    {(task.organizationName as string) || "Unknown"}
                  </Button>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Engagement</dt>
              <dd>
                {task.engagementId ? (
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => navigate(`/portal/engagements/${task.engagementId}`)}
                  >
                    <Layers className="mr-1 h-3 w-3" />
                    {(task.engagementName as string) || "Unknown"}
                  </Button>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="mt-1">{statusBadge((task.status as string) ?? "")}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
              <dd className="mt-1">{priorityBadge((task.priority as string) ?? "medium")}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Due Date
              </dt>
              <dd>
                {task.dueDate
                  ? new Date(task.dueDate as string).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Assigned To
              </dt>
              <dd>{(task.assignedTo as string) || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Description</dt>
              <dd>{(task.description as string) || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd>
                {task.createdAt
                  ? new Date(task.createdAt as string).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Updated</dt>
              <dd>
                {task.updatedAt
                  ? new Date(task.updatedAt as string).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </PageShell>
  );
}
