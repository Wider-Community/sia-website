import { ChartCard } from "@/components/investor/ChartCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

const data = [
  { month: "M1", revenue: 120, costs: 160 },
  { month: "M2", revenue: 150, costs: 155 },
  { month: "M3", revenue: 180, costs: 150 },
  { month: "M4", revenue: 200, costs: 148 },
  { month: "M5", revenue: 240, costs: 145 },
  { month: "M6", revenue: 280, costs: 142 },
];

export function BreakevenPage() {
  return (
    <div className="space-y-8">
      <div className="section-label">Breakeven Analysis</div>
      <ChartCard title="Revenue vs Total Costs">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Line type="monotone" dataKey="revenue" stroke="#c8a951" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="costs" stroke="#E24B4A" strokeWidth={2} dot={{ r: 4 }} />
            <ReferenceLine y={155} stroke="var(--text-tertiary)" strokeDasharray="5 5" label={{ value: "Breakeven", fill: "var(--text-tertiary)", fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
