import { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, FileSignature, AlertTriangle, CheckSquare, Activity, Link2, Plus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BaseRecord } from "@refinedev/core";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard } from "../../components/KpiCard";
import { VerticalTimeline, type TimelineEvent } from "../../components/VerticalTimeline";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { TextReveal } from "@/components/effects/TextReveal";
import { BorderBeam } from "@/components/effects/BorderBeam";
import { Marquee } from "@/components/effects/Marquee";
import { evaluateSLA, type SLAResult } from "../../lib/sla-engine";

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function PortalDashboardPage() {
  const navigate = useNavigate();

  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const tasks = useList({ resource: "tasks", pagination: { mode: "off" } });
  const signingRequests = useList({ resource: "signing-requests", pagination: { mode: "off" } });
  const events = useList({
    resource: "activity-events",
    pagination: { mode: "off" },
    sorters: [{ field: "createdAt", order: "desc" }],
  });
  const slaRules = useList({ resource: "sla-rules", pagination: { mode: "off" } });
  const matches = useList({
    resource: "matches",
    pagination: { current: 1, pageSize: 5 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });
  const allMatches = useList({ resource: "matches", pagination: { mode: "off" } });

  const orgData = orgs.result?.data ?? [];
  const taskData = tasks.result?.data ?? [];
  const eventData = events.result?.data ?? [];
  const signingData = signingRequests.result?.data ?? [];
  const ruleData = slaRules.result?.data ?? [];

  const isLoading = orgs.query.isLoading || tasks.query.isLoading || events.query.isLoading;

  // SLA evaluation
  const slaResults = useMemo<SLAResult[]>(() => {
    if (orgData.length === 0 || ruleData.length === 0) return [];
    const orgRules = ruleData.filter((r: BaseRecord) => r.entityType === "organization");
    return evaluateSLA(
      orgData,
      eventData,
      orgRules as Array<{ name: string; entityType: string; thresholdDays: number }>,
    );
  }, [orgData, eventData, ruleData]);

  // KPI values
  const totalOrgs = orgData.length;
  const activeSigningRequests = signingData.filter(
    (s: BaseRecord) => s.status === "sent" || s.status === "partially_signed",
  ).length;
  const overdueCount = slaResults.filter((r) => r.status === "overdue").length;
  const today = new Date().toISOString().split("T")[0];
  const tasksDueToday = taskData.filter(
    (t: BaseRecord) => t.status === "open" && (t.dueDate as string)?.startsWith(today),
  ).length;

  // Match KPIs
  const allMatchData = allMatches.result?.data ?? [];
  const pendingMatchCount = allMatchData.filter((m: BaseRecord) => m.status === "pending").length;
  const mutualMatchCount = allMatchData.filter((m: BaseRecord) => m.status === "mutual").length;
  const recentMatches = matches.result?.data ?? [];

  // Org lookup map for match display
  const orgMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orgData) {
      map.set(o.id as string, o.name as string);
    }
    return map;
  }, [orgData]);

  // Priority queue: orgs sorted by SLA status
  const priorityQueue = useMemo(() => {
    const statusOrder: Record<string, number> = { overdue: 0, at_risk: 1, on_track: 2 };
    const slaMap = new Map(slaResults.map((r) => [r.entityId, r]));
    return orgData
      .map((org: BaseRecord) => ({
        id: org.id as string,
        name: org.name as string,
        status: org.status as string,
        sla: slaMap.get(org.id as string),
      }))
      .sort((a, b) => {
        const aOrder = statusOrder[a.sla?.status ?? "on_track"] ?? 2;
        const bOrder = statusOrder[b.sla?.status ?? "on_track"] ?? 2;
        return aOrder - bOrder;
      });
  }, [orgData, slaResults]);

  // Activity by week chart data
  const weeklyActivity = useMemo(() => {
    const weeks = new Map<string, number>();
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const weekLabel = `W${getWeekNumber(d)}`;
      weeks.set(weekLabel, 0);
    }
    for (const ev of eventData) {
      const d = new Date(ev.createdAt as string);
      const weekLabel = `W${getWeekNumber(d)}`;
      if (weeks.has(weekLabel)) {
        weeks.set(weekLabel, (weeks.get(weekLabel) ?? 0) + 1);
      }
    }
    return Array.from(weeks.entries()).map(([week, count]) => ({ week, count }));
  }, [eventData]);

  // Recent tasks (open, sorted by due date)
  const recentTasks = taskData
    .filter((t: BaseRecord) => t.status === "open")
    .sort((a: BaseRecord, b: BaseRecord) =>
      ((a.dueDate as string) ?? "").localeCompare((b.dueDate as string) ?? ""),
    )
    .slice(0, 5);

  // Recent activity as timeline events
  const timelineEvents: TimelineEvent[] = eventData.slice(0, 8).map((e: BaseRecord) => ({
    id: e.id as string,
    title: `${capitalize(e.action as string)} ${e.entityType as string}`,
    description: (e.entityName as string) || orgMap.get(e.entityId as string) || "Unknown",
    timestamp: e.createdAt as string,
    variant: (e.action as string) === "deleted" ? "destructive" as const : "default" as const,
  }));

  // Activity ticker items for marquee
  const tickerItems = eventData.slice(0, 12).map((e: BaseRecord) => (
    <span
      key={e.id as string}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
    >
      <span className="font-medium text-foreground">{capitalize(e.action as string)}</span>
      {(e.entityName as string) || orgMap.get(e.entityId as string) || "Unknown"}
    </span>
  ));

  const slaBadge = (status?: string) => {
    if (status === "overdue") return <Badge className="bg-red-500 hover:bg-red-600 text-white">Overdue</Badge>;
    if (status === "at_risk") return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">At Risk</Badge>;
    return <Badge className="bg-green-500 hover:bg-green-600 text-white">On Track</Badge>;
  };

  return (
    <PageShell loading={isLoading}>
      <PageHeader title="Operations Dashboard" />

      {/* Activity ticker */}
      {tickerItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Marquee speed={30} pauseOnHover className="py-2">
            {tickerItems}
          </Marquee>
        </motion.div>
      )}

      {/* Row 1: KPI Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Total Organizations"
            value={totalOrgs}
            icon={Building2}
            loading={orgs.query.isLoading}
            onClick={() => navigate("/portal/organizations")}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Active Signing Requests"
            value={activeSigningRequests}
            icon={FileSignature}
            loading={signingRequests.query.isLoading}
            onClick={() => navigate("/portal/signing")}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Overdue Items"
            value={overdueCount}
            icon={AlertTriangle}
            loading={isLoading}
            onClick={() => navigate("/portal/organizations")}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Tasks Due Today"
            value={tasksDueToday}
            icon={CheckSquare}
            loading={tasks.query.isLoading}
            onClick={() => navigate("/portal/tasks")}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Pending Matches"
            value={pendingMatchCount}
            icon={Link2}
            loading={allMatches.query.isLoading}
            onClick={() => navigate("/portal/matches")}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <KpiCard
            title="Mutual Connections"
            value={mutualMatchCount}
            icon={Link2}
            loading={allMatches.query.isLoading}
            onClick={() => navigate("/portal/matches")}
          />
        </motion.div>
      </motion.div>

      {/* Row 2: Priority Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="relative overflow-hidden">
          <BorderBeam duration={20} />
          <CardHeader>
            <CardTitle className="text-lg">
              <TextReveal text="Priority Queue" delay={0.3} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : priorityQueue.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA Status</TableHead>
                    <TableHead>Days Since Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorityQueue.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/portal/organizations/${item.id}`)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.status}</Badge>
                      </TableCell>
                      <TableCell>{slaBadge(item.sla?.status)}</TableCell>
                      <TableCell>{item.sla?.daysSinceActivity ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Building2} title="No organizations yet" description="Add an organization to start tracking your pipeline." action={{ label: "Add Organization", onClick: () => navigate("/portal/organizations/create") }} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: Tasks + Activity side by side */}
      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                <TextReveal text="Open Tasks" delay={0.5} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentTasks.map((task: BaseRecord) => (
                    <div
                      key={task.id as string}
                      className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate("/portal/tasks")}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{task.title as string}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(task.dueDate as string).toLocaleDateString()}
                          {(task.organizationName || orgMap.get(task.organizationId as string)) && ` · ${(task.organizationName as string) || orgMap.get(task.organizationId as string)}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          (task.priority as string) === "high"
                            ? "destructive"
                            : (task.priority as string) === "medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {task.priority as string}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckSquare} title="No open tasks" description="All caught up! Create a task to track your next action." />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                <TextReveal text="Recent Activity" delay={0.6} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.query.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : timelineEvents.length > 0 ? (
                <VerticalTimeline events={timelineEvents} />
              ) : (
                <EmptyState icon={Activity} title="No recent activity" description="Activity will appear here as you interact with the platform." />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Matches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              <TextReveal text="Recent Matches" delay={0.65} />
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/portal/matches/create")}>
              <Plus className="mr-2 h-4 w-4" /> Create Match
            </Button>
          </CardHeader>
          <CardContent>
            {matches.query.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentMatches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMatches.map((m: BaseRecord) => {
                    const orgAName = orgMap.get(m.organizationAId as string) ?? (m.organizationAName as string) ?? "Unknown";
                    const orgBName = orgMap.get(m.organizationBId as string) ?? (m.organizationBName as string) ?? "Unknown";
                    const status = m.status as string;
                    const statusColor: Record<string, string> = {
                      pending: "bg-yellow-500 hover:bg-yellow-600 text-white",
                      accepted_a: "bg-blue-500 hover:bg-blue-600 text-white",
                      accepted_b: "bg-blue-500 hover:bg-blue-600 text-white",
                      mutual: "bg-green-500 hover:bg-green-600 text-white",
                      declined: "bg-red-500 hover:bg-red-600 text-white",
                      expired: "bg-gray-500 hover:bg-gray-600 text-white",
                    };
                    return (
                      <TableRow
                        key={m.id as string}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => navigate(`/portal/matches/${m.id}`)}
                      >
                        <TableCell className="font-medium">
                          {orgAName} ↔ {orgBName}
                        </TableCell>
                        <TableCell>{m.score as number}</TableCell>
                        <TableCell>
                          <Badge className={statusColor[status] ?? ""}>
                            {status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState icon={Link2} title="No matches yet" description="Create a match to connect two organizations." action={{ label: "Create Match", onClick: () => navigate("/portal/matches/create") }} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <TextReveal text="Activity by Week" delay={0.7} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageShell>
  );
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
