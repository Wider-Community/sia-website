import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

export function KpiCard({ label, value, trend, trendUp }: KpiCardProps) {
  return (
    <div className="glass-card glass-card-accent p-4">
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        {value}
      </div>
      <div className={cn("flex items-center gap-1 text-xs font-medium", trendUp ? "text-success" : "text-danger")}>
        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    </div>
  );
}
