import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useUpdate } from "@refinedev/core";
import { Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { evaluateSLA, generateAlerts } from "../lib/sla-engine";
import type { BaseRecord } from "@refinedev/core";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { result: alertsResult, query: alertsQuery } = useList({
    resource: "alerts",
    pagination: { mode: "off" },
    sorters: [{ field: "createdAt", order: "desc" }],
  });
  const { mutate: updateAlert } = useUpdate();

  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const events = useList({ resource: "activity-events", pagination: { mode: "off" } });
  const slaRules = useList({ resource: "sla-rules", pagination: { mode: "off" } });

  const slaAlerts = useMemo(() => {
    const orgData = orgs.result?.data ?? [];
    const eventData = events.result?.data ?? [];
    const ruleData = slaRules.result?.data ?? [];
    if (ruleData.length === 0) return [];
    const orgRules = ruleData.filter((r: BaseRecord) => r.entityType === "organization");
    const results = evaluateSLA(orgData, eventData, orgRules as Array<{ name: string; entityType: string; thresholdDays: number }>);
    return generateAlerts(results);
  }, [orgs.result?.data, events.result?.data, slaRules.result?.data]);

  const storedAlerts = alertsResult?.data ?? [];
  const allAlerts = useMemo(() => {
    const stored = storedAlerts.map((a: BaseRecord) => ({
      id: a.id as string,
      type: a.type as string,
      title: a.title as string,
      message: a.message as string,
      read: a.read as boolean,
      createdAt: a.createdAt as string,
      entityId: (a.entityId as string) ?? undefined,
      entityType: (a.entityType as string) ?? undefined,
    }));

    const dynamic = slaAlerts.map((a, i) => ({
      id: `sla-${i}`,
      type: a.type,
      title: a.title,
      message: a.message,
      read: false,
      createdAt: new Date().toISOString(),
      entityId: a.entityId,
      entityType: a.entityType,
    }));

    const storedIds = new Set(stored.map((s) => s.title));
    const uniqueDynamic = dynamic.filter((d) => !storedIds.has(d.title));
    return [...stored, ...uniqueDynamic];
  }, [storedAlerts, slaAlerts]);

  const unreadCount = allAlerts.filter((a) => !a.read).length;

  const handleAlertClick = (alert: typeof allAlerts[number]) => {
    if (!alert.id.startsWith("sla-") && !alert.read) {
      updateAlert({
        resource: "alerts",
        id: alert.id,
        values: { read: true },
      });
    }

    if (alert.entityId) {
      switch (alert.entityType) {
        case "organization":
          navigate(`/portal/organizations/${alert.entityId}`);
          break;
        case "flow":
          navigate(`/portal/flows/${alert.entityId}`);
          break;
        case "match":
          navigate(`/portal/matches/${alert.entityId}`);
          break;
        case "component-definition":
          navigate("/portal/control-board");
          break;
      }
    }

    setOpen(false);
  };

  const typeColor: Record<string, string> = {
    overdue: "bg-red-500",
    at_risk: "bg-yellow-500",
    info: "bg-blue-500",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        </div>
        <ScrollArea className="h-[300px]">
          {alertsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : allAlerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {allAlerts.map((alert) => (
                <button
                  key={alert.id}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${alert.read ? "opacity-60" : ""}`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${typeColor[alert.type] ?? "bg-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    </div>
                    {alert.entityId && (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
