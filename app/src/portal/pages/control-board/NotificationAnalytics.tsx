/**
 * Notification Analytics Dashboard
 *
 * Displays notification firing statistics, delivery rates per channel,
 * top fired notifications, and escalation frequency.
 * Subscribes to the engine event bus for real-time tracking.
 */

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { engineEventBus } from "../../engine/event-bus";
import type { NotificationChannel } from "../../engine/types";

// ---------------------------------------------------------------------------
// Analytics State
// ---------------------------------------------------------------------------

interface AnalyticsState {
  totalFired: number;
  deliveryByChannel: Record<NotificationChannel, { sent: number; failed: number }>;
  notificationCounts: Record<string, number>;
  escalationCount: number;
}

const CHANNELS: NotificationChannel[] = [
  "in_app",
  "email",
  "push",
  "sms",
  "webhook",
  "slack",
];

const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  in_app: "#6366f1",
  email: "#3b82f6",
  push: "#10b981",
  sms: "#f59e0b",
  webhook: "#8b5cf6",
  slack: "#ec4899",
};

function emptyAnalytics(): AnalyticsState {
  const deliveryByChannel = {} as AnalyticsState["deliveryByChannel"];
  for (const ch of CHANNELS) {
    deliveryByChannel[ch] = { sent: 0, failed: 0 };
  }
  return {
    totalFired: 0,
    deliveryByChannel,
    notificationCounts: {},
    escalationCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsState>(emptyAnalytics);
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  // Subscribe to event bus for real-time analytics
  useEffect(() => {
    const unsubDelivered = engineEventBus.subscribeToType(
      "notification.delivered",
      (event) => {
        setAnalytics((prev) => {
          const channel = event.channel as NotificationChannel;
          const channelData = prev.deliveryByChannel[channel] ?? { sent: 0, failed: 0 };
          const notifId = event.notificationId.split("-").slice(0, 3).join("-");

          return {
            ...prev,
            totalFired: prev.totalFired + 1,
            deliveryByChannel: {
              ...prev.deliveryByChannel,
              [channel]: { ...channelData, sent: channelData.sent + 1 },
            },
            notificationCounts: {
              ...prev.notificationCounts,
              [notifId]: (prev.notificationCounts[notifId] ?? 0) + 1,
            },
          };
        });
      },
    );

    const unsubEscalated = engineEventBus.subscribeToType(
      "notification.escalated",
      () => {
        setAnalytics((prev) => ({
          ...prev,
          escalationCount: prev.escalationCount + 1,
        }));
      },
    );

    return () => {
      unsubDelivered();
      unsubEscalated();
    };
  }, []);

  // Build chart data
  const channelChartData = CHANNELS.map((ch) => ({
    channel: ch,
    sent: analytics.deliveryByChannel[ch]?.sent ?? 0,
    failed: analytics.deliveryByChannel[ch]?.failed ?? 0,
  }));

  const topNotifications = Object.entries(analytics.notificationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const pieData = CHANNELS.map((ch) => ({
    name: ch,
    value: analytics.deliveryByChannel[ch]?.sent ?? 0,
  })).filter((d) => d.value > 0);

  const hasData = analytics.totalFired > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Notification Analytics</h3>
        <p className="text-xs text-muted-foreground">
          Real-time statistics from the engine event bus.
          {!hasData && " Trigger notifications to see data here."}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Fired"
          value={analytics.totalFired}
          variant="default"
        />
        <SummaryCard
          label="Unique Notifications"
          value={Object.keys(analytics.notificationCounts).length}
          variant="secondary"
        />
        <SummaryCard
          label="Escalations"
          value={analytics.escalationCount}
          variant={analytics.escalationCount > 0 ? "destructive" : "outline"}
        />
        <SummaryCard
          label="Active Channels"
          value={
            CHANNELS.filter(
              (ch) => (analytics.deliveryByChannel[ch]?.sent ?? 0) > 0,
            ).length
          }
          variant="secondary"
        />
      </div>

      {hasData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Delivery Rate per Channel - Bar Chart */}
          <div className="rounded-md border p-4">
            <h4 className="mb-3 text-sm font-medium">
              Delivery Count by Channel
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sent" fill="#6366f1" name="Sent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Distribution - Pie Chart */}
          <div className="rounded-md border p-4">
            <h4 className="mb-3 text-sm font-medium">Channel Distribution</h4>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          CHANNEL_COLORS[entry.name as NotificationChannel] ??
                          "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No channel data yet
              </p>
            )}
          </div>

          {/* Top 5 Most Fired Notifications */}
          <div className="rounded-md border p-4 lg:col-span-2">
            <h4 className="mb-3 text-sm font-medium">
              Top 5 Most Fired Notifications
            </h4>
            {topNotifications.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={topNotifications}
                  layout="vertical"
                  margin={{ left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Times Fired" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notification data yet
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <Badge variant={variant} className="text-[10px]">
          live
        </Badge>
      </div>
    </div>
  );
}
