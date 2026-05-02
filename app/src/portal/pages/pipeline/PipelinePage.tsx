import { useState, useMemo } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { KanbanBoard, type KanbanColumn } from "@/portal/components/KanbanBoard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENGAGEMENT_STAGES } from "../../schemas";
import type { BaseRecord } from "@refinedev/core";

interface EngagementRecord {
  id: string;
  title: string;
  organizationId: string;
  stage: string;
  category: string;
  priority: string;
  targetDate?: string;
  updatedAt: string;
  [key: string]: unknown;
}

const STAGE_CONFIG: Record<string, { title: string; color: string }> = {
  prospect: { title: "Prospect", color: "#94a3b8" },
  in_progress: { title: "In Progress", color: "#3b82f6" },
  negotiating: { title: "Negotiating", color: "#f59e0b" },
  formalized: { title: "Formalized", color: "#8b5cf6" },
  active: { title: "Active", color: "#22c55e" },
  completed: { title: "Completed", color: "#10b981" },
  dormant: { title: "Dormant", color: "#6b7280" },
};

// Default visible stages (hide completed/dormant)
const DEFAULT_VISIBLE = ["prospect", "in_progress", "negotiating", "formalized", "active"];

const priorityColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "outline",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function EngagementCard({
  eng,
  orgName,
  taskCount,
}: {
  eng: EngagementRecord;
  orgName: string;
  taskCount: number;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => navigate(`/portal/engagements/${eng.id}`)}
      className="cursor-pointer"
    >
      <Card className="shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardContent className="p-3 space-y-1.5">
          <div className="font-medium text-sm leading-tight">{eng.title}</div>
          <div className="text-xs text-muted-foreground">{orgName}</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {eng.category.replace(/_/g, " ")}
            </Badge>
            <Badge variant={priorityColor[eng.priority] ?? "outline"} className="text-[10px]">
              {eng.priority}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            {eng.targetDate ? <span>Due {formatDate(eng.targetDate)}</span> : <span />}
            {taskCount > 0 && (
              <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --- Org-based pipeline (fallback tab) ---
interface Organization {
  id: string;
  name: string;
  type: string;
  status: string;
  stage?: string;
  locations?: Array<{ city: string; countryName: string; isDefault: boolean }>;
  updatedAt: string;
  [key: string]: unknown;
}

const ORG_STAGES = [
  { id: "prospect", title: "Prospect", color: "#94a3b8" },
  { id: "engaged", title: "Engaged", color: "#3b82f6" },
  { id: "due_diligence", title: "Due Diligence", color: "#f59e0b" },
  { id: "negotiation", title: "Negotiation", color: "#8b5cf6" },
  { id: "active_partner", title: "Active Partner", color: "#22c55e" },
  { id: "inactive", title: "Inactive", color: "#6b7280" },
];

const STATUS_TO_STAGE: Record<string, string> = {
  active: "active_partner",
  prospect: "prospect",
  inactive: "inactive",
};

function getOrgStage(org: Organization): string {
  if (org.stage) return org.stage;
  return STATUS_TO_STAGE[org.status] ?? "prospect";
}

function OrgCard({ org }: { org: Organization }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => navigate(`/portal/organizations/${org.id}`)}
      className="cursor-pointer"
    >
      <Card className="shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardContent className="p-3 space-y-2">
          <div className="font-medium text-sm leading-tight">{org.name}</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{org.type}</Badge>
            <span className="text-xs text-muted-foreground">{org.locations?.find((l) => l.isDefault)?.countryName ?? ""}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Updated {formatDate(org.updatedAt)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PipelinePage() {
  const navigate = useNavigate();

  // Engagement data
  const { result: engResult, query: engQuery } = useList<EngagementRecord>({
    resource: "engagements",
    pagination: { mode: "off" },
  });
  const { mutate: updateEng } = useUpdate();
  const allEngagements = engResult?.data ?? [];

  // Org data (for names + fallback pipeline)
  const { result: orgsResult, query: orgsQuery } = useList<Organization>({
    resource: "organizations",
    pagination: { mode: "off" },
  });
  const allOrgs = orgsResult?.data ?? [];
  const orgMap = useMemo(() => {
    const m = new Map<string, string>();
    allOrgs.forEach((o) => m.set(o.id, o.name));
    return m;
  }, [allOrgs]);

  // Tasks (for counts)
  const { result: tasksResult } = useList({
    resource: "tasks",
    pagination: { mode: "off" },
  });
  const taskCountByEng = useMemo(() => {
    const m = new Map<string, number>();
    (tasksResult?.data ?? []).forEach((t: BaseRecord) => {
      const eid = t.engagementId as string;
      if (eid) m.set(eid, (m.get(eid) ?? 0) + 1);
    });
    return m;
  }, [tasksResult?.data]);

  const { mutate: updateOrg } = useUpdate();

  const [activeTab, setActiveTab] = useState("engagements");
  const [showAll, setShowAll] = useState(false);
  const [orgFilter, setOrgFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [pendingMove, setPendingMove] = useState<{
    itemId: string;
    fromColumn: string;
    toColumn: string;
    resource: "engagements" | "organizations";
  } | null>(null);

  // Filter engagements
  const filteredEngagements = useMemo(() => {
    let items = allEngagements;
    if (orgFilter !== "all") items = items.filter((e) => e.organizationId === orgFilter);
    if (categoryFilter !== "all") items = items.filter((e) => e.category === categoryFilter);
    if (priorityFilter !== "all") items = items.filter((e) => e.priority === priorityFilter);
    return items;
  }, [allEngagements, orgFilter, categoryFilter, priorityFilter]);

  // Engagement Kanban columns
  const visibleStages = showAll ? ENGAGEMENT_STAGES : DEFAULT_VISIBLE;
  const engColumns: KanbanColumn<EngagementRecord>[] = useMemo(() => {
    return visibleStages.map((stageId) => {
      const cfg = STAGE_CONFIG[stageId] ?? { title: stageId, color: "#888" };
      return {
        id: stageId,
        title: `${cfg.title} (${filteredEngagements.filter((e) => e.stage === stageId).length})`,
        color: cfg.color,
        items: filteredEngagements.filter((e) => e.stage === stageId),
      };
    });
  }, [filteredEngagements, visibleStages]);

  // Org Kanban columns
  const orgColumns: KanbanColumn<Organization>[] = useMemo(() => {
    return ORG_STAGES.map((stage) => ({
      ...stage,
      items: allOrgs.filter((org) => getOrgStage(org) === stage.id),
    }));
  }, [allOrgs]);

  function handleEngDragEnd(itemId: string, from: string, to: string) {
    setPendingMove({ itemId, fromColumn: from, toColumn: to, resource: "engagements" });
  }

  function handleOrgDragEnd(itemId: string, from: string, to: string) {
    setPendingMove({ itemId, fromColumn: from, toColumn: to, resource: "organizations" });
  }

  function confirmMove() {
    if (!pendingMove) return;
    if (pendingMove.resource === "engagements") {
      updateEng({
        resource: "engagements",
        id: pendingMove.itemId,
        values: { stage: pendingMove.toColumn },
      });
    } else {
      updateOrg({
        resource: "organizations",
        id: pendingMove.itemId,
        values: { stage: pendingMove.toColumn },
      });
    }
    setPendingMove(null);
  }

  const targetLabel =
    pendingMove?.resource === "engagements"
      ? STAGE_CONFIG[pendingMove.toColumn]?.title
      : ORG_STAGES.find((s) => s.id === pendingMove?.toColumn)?.title;
  const movingLabel =
    pendingMove?.resource === "engagements"
      ? allEngagements.find((e) => e.id === pendingMove?.itemId)?.title
      : allOrgs.find((o) => o.id === pendingMove?.itemId)?.name;

  const isLoading = engQuery.isLoading || orgsQuery.isLoading;

  return (
    <PageShell>
      <PageHeader title="Pipeline" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="engagements">Engagements</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        {/* Engagement Pipeline */}
        <AnimatedTabContent activeValue={activeTab} value="engagements" className="mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {allOrgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="deal">Deal</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="opportunity">Opportunity</SelectItem>
                <SelectItem value="initiative">Initiative</SelectItem>
                <SelectItem value="regulatory">Regulatory</SelectItem>
                <SelectItem value="diplomatic">Diplomatic</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="rounded"
              />
              Show completed & dormant
            </label>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <KanbanBoard<EngagementRecord>
              columns={engColumns}
              onDragEnd={handleEngDragEnd}
              renderCard={(eng) => (
                <EngagementCard
                  eng={eng}
                  orgName={orgMap.get(eng.organizationId) ?? "—"}
                  taskCount={taskCountByEng.get(eng.id) ?? 0}
                />
              )}
            />
          )}
        </AnimatedTabContent>

        {/* Organization Pipeline (fallback) */}
        <AnimatedTabContent activeValue={activeTab} value="organizations" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <KanbanBoard<Organization>
              columns={orgColumns}
              onDragEnd={handleOrgDragEnd}
              renderCard={(org) => <OrgCard org={org} />}
            />
          )}
        </AnimatedTabContent>

        {/* List View */}
        <AnimatedTabContent activeValue={activeTab} value="list" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEngagements.map((eng) => {
                  const cfg = STAGE_CONFIG[eng.stage];
                  return (
                    <TableRow
                      key={eng.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/portal/engagements/${eng.id}`)}
                    >
                      <TableCell className="font-medium">{eng.title}</TableCell>
                      <TableCell>{orgMap.get(eng.organizationId) ?? "—"}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: cfg?.color, color: "white", borderColor: "transparent" }}>
                          {cfg?.title ?? eng.stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{eng.category.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityColor[eng.priority] ?? "outline"}>{eng.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {eng.targetDate ? formatDate(eng.targetDate) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </AnimatedTabContent>
      </Tabs>

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
