import { useOne, useList, useCreate, useDelete } from "@refinedev/core";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/TableSkeleton";
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
import {
  Pencil,
  Trash2,
  Activity,
  StickyNote,
  CheckSquare,
  Plus,
  Building2,
  CalendarDays,
  DollarSign,
  User,
  Tag,
} from "lucide-react";
import type { BaseRecord } from "@refinedev/core";
import { Send } from "lucide-react";
import { VerticalTimeline, type TimelineEvent } from "../../components/VerticalTimeline";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";

const stageBadge = (stage: string) => {
  switch (stage) {
    case "prospect":
      return <Badge variant="outline">Prospect</Badge>;
    case "in_progress":
      return <Badge variant="secondary">In Progress</Badge>;
    case "negotiating":
      return <Badge variant="secondary">Negotiating</Badge>;
    case "formalized":
      return <Badge variant="default">Formalized</Badge>;
    case "active":
      return <Badge variant="default" className="text-green-600">Active</Badge>;
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "dormant":
      return <Badge variant="outline" className="text-muted-foreground">Dormant</Badge>;
    default:
      return <Badge variant="outline">{stage}</Badge>;
  }
};

const categoryBadge = (category: string) => (
  <Badge variant="secondary" className="capitalize">
    {category.replace(/_/g, " ")}
  </Badge>
);

const priorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    low: "text-muted-foreground",
    medium: "",
    high: "text-orange-600",
    critical: "text-red-600 font-semibold",
  };
  return (
    <Badge variant="outline" className={colors[priority] ?? ""}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export function EngagementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { query: engQuery } = useOne({ resource: "engagements", id: id! });
  const eng = engQuery.data?.data;

  // Fetch parent organization name
  const { query: orgQuery } = useOne({
    resource: "organizations",
    id: (eng?.organizationId as string) ?? "",
    queryOptions: { enabled: !!eng?.organizationId },
  });
  const orgName = (orgQuery.data?.data?.name as string) ?? "";

  const tasks = useList({
    resource: "tasks",
    filters: [{ field: "engagementId", operator: "eq", value: id }],
    sorters: [{ field: "dueDate", order: "asc" }],
    pagination: { mode: "off" },
  });

  const events = useList({
    resource: "activity-events",
    filters: [{ field: "engagementId", operator: "eq", value: id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
  });

  const notes = useList({
    resource: "notes",
    filters: [{ field: "engagementId", operator: "eq", value: id }],
    sorters: [{ field: "createdAt", order: "desc" }],
    pagination: { mode: "off" },
  });

  const { mutate: createNote } = useCreate();
  const { mutate: deleteEng } = useDelete();
  const [activeTab, setActiveTab] = useState("overview");
  const [noteText, setNoteText] = useState("");

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    createNote({
      resource: "notes",
      values: { content: noteText, createdBy: "user-1", organizationId: (eng?.organizationId as string) ?? "", engagementId: id },
    });
    setNoteText("");
  };

  if (engQuery.isLoading) {
    return <PageShell loading={true}>{null}</PageShell>;
  }

  if (!eng) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Engagement not found</p>
        <Button variant="outline" onClick={() => navigate("/portal/engagements")}>
          Back to list
        </Button>
      </div>
    );
  }

  const subtitle = [
    orgName,
    (eng.stage as string)?.replace(/_/g, " "),
    eng.category as string,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell loading={engQuery.isLoading}>
      <PageHeader
        title={(eng.title as string) ?? ""}
        backTo="/portal/engagements"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/portal/engagements/edit/${id}`)}>
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
                  <AlertDialogTitle>Delete engagement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {(() => {
                      const taskCount = tasks.result?.data?.length ?? 0;
                      if (taskCount > 0) {
                        return `This engagement has ${taskCount} task${taskCount !== 1 ? "s" : ""}. Deleting it will remove all related data. This action cannot be undone.`;
                      }
                      return `This will permanently delete "${eng.title as string}". This action cannot be undone.`;
                    })()}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      deleteEng(
                        { resource: "engagements", id: id! },
                        { onSuccess: () => navigate("/portal/engagements") },
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="mr-1 h-4 w-4" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="notes">
            <StickyNote className="mr-1 h-4 w-4" /> Notes
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-1 h-4 w-4" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <AnimatedTabContent activeValue={activeTab} value="overview">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Organization</dt>
                  <dd>
                    {eng.organizationId ? (
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => navigate(`/portal/organizations/${eng.organizationId}`)}
                      >
                        <Building2 className="mr-1 h-3 w-3" />
                        {orgName || "Unknown"}
                      </Button>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Stage</dt>
                  <dd className="mt-1">{stageBadge((eng.stage as string) ?? "")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                  <dd className="mt-1">{categoryBadge((eng.category as string) ?? "")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Priority</dt>
                  <dd className="mt-1">{priorityBadge((eng.priority as string) ?? "medium")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Start Date
                  </dt>
                  <dd>
                    {eng.startDate
                      ? new Date(eng.startDate as string).toLocaleDateString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Target Date
                  </dt>
                  <dd>
                    {eng.targetDate
                      ? new Date(eng.targetDate as string).toLocaleDateString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Value
                  </dt>
                  <dd>{(eng.value as string) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Assigned To
                  </dt>
                  <dd>{(eng.assignedTo as string) || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                  <dd>{(eng.description as string) || "—"}</dd>
                </div>
                {(eng.tags as string[])?.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Tags
                    </dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {(eng.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Tasks */}
        <AnimatedTabContent activeValue={activeTab} value="tasks">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/tasks/create?engagementId=${id}&engagementName=${encodeURIComponent(eng?.title as string ?? "")}&organizationId=${eng?.organizationId as string ?? ""}&organizationName=${encodeURIComponent(orgName)}`}>
                    <Plus className="mr-2 h-4 w-4" /> New Task
                  </Link>
                </Button>
              </div>
              {tasks.query.isLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : (tasks.result?.data?.length ?? 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.result!.data.map((t: BaseRecord) => (
                      <TableRow key={t.id as string}>
                        <TableCell className="font-medium">{t.title as string}</TableCell>
                        <TableCell><Badge variant={(t.status as string) === "done" ? "secondary" : "default"}>{t.status as string}</Badge></TableCell>
                        <TableCell><Badge variant={(t.priority as string) === "high" ? "destructive" : "outline"}>{t.priority as string}</Badge></TableCell>
                        <TableCell>{t.dueDate ? new Date(t.dueDate as string).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks linked"
                  description="Create a task linked to this engagement."
                />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Notes */}
        <AnimatedTabContent activeValue={activeTab} value="notes">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <AnimatedButton onClick={handleAddNote} disabled={!noteText.trim()} className="self-end">
                  <Send className="mr-2 h-4 w-4" /> Add
                </AnimatedButton>
              </div>
              {notes.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (notes.result?.data?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {notes.result!.data.map((n: BaseRecord) => (
                    <div key={n.id as string} className="rounded-md border p-3">
                      <p className="text-sm">{n.content as string}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt as string).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={StickyNote} title="No notes yet" description="Add a note to keep track of important details." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>

        {/* Activity */}
        <AnimatedTabContent activeValue={activeTab} value="activity">
          <Card>
            <CardContent className="pt-6">
              {events.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (events.result?.data?.length ?? 0) > 0 ? (
                <VerticalTimeline
                  events={(events.result?.data ?? []).map((e: BaseRecord) => ({
                    id: e.id as string,
                    title: `${((e.action as string) ?? "").charAt(0).toUpperCase()}${((e.action as string) ?? "").slice(1)} ${e.entityType as string}`,
                    description: (e.entityName as string) || "Unknown",
                    timestamp: e.createdAt as string,
                    variant: (e.action as string) === "deleted" ? "destructive" as const : "default" as const,
                  } satisfies TimelineEvent))}
                />
              ) : (
                <EmptyState icon={Activity} title="No activity yet" description="Activity will appear here as events are recorded for this engagement." />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>
      </Tabs>
    </PageShell>
  );
}
