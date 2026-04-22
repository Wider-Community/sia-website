import { KpiCard } from "@/components/investor/KpiCard";
import { ChartCard } from "@/components/investor/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const kpiData = [
  { label: "Y1 Revenue", value: "$2.4M", trend: "+12%", trendUp: true },
  { label: "Net Profit", value: "$890K", trend: "+8%", trendUp: true },
  { label: "Gross Margin", value: "72%", trend: "+3%", trendUp: true },
  { label: "ROI", value: "3.2x", trend: "+0.4x", trendUp: true },
  { label: "Breakeven", value: "Month 6", trend: "On track", trendUp: true },
  { label: "MRR", value: "$198K", trend: "+15%", trendUp: true },
];

const revenueVsCosts = [
  { month: "Jan", revenue: 120, costs: 80 },
  { month: "Feb", revenue: 150, costs: 85 },
  { month: "Mar", revenue: 180, costs: 90 },
  { month: "Apr", revenue: 200, costs: 95 },
  { month: "May", revenue: 240, costs: 100 },
  { month: "Jun", revenue: 280, costs: 110 },
];

const revenueMix = [
  { name: "Commissions", value: 45 },
  { name: "Subscriptions", value: 30 },
  { name: "Add-ons", value: 15 },
  { name: "Advisory", value: 10 },
];
const PIE_COLORS = ["#c8a951", "#378ADD", "#1D9E75", "#a08838"];

const profitTrend = [
  { month: "Jan", profit: 40 },
  { month: "Feb", profit: 65 },
  { month: "Mar", profit: 90 },
  { month: "Apr", profit: 105 },
  { month: "May", profit: 140 },
  { month: "Jun", profit: 170 },
];

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="section-label">Dashboard</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue vs Costs">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueVsCosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
              <Bar dataKey="revenue" fill="#c8a951" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" fill="var(--border)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue Mix">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={revenueMix} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                {revenueMix.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Profit Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={profitTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
              <Line type="monotone" dataKey="profit" stroke="#c8a951" strokeWidth={2} dot={{ fill: "#c8a951", r: 4 }} activeDot={{ r: 6, fill: "#c8a951", stroke: "var(--surface)", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Cost Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[{ category: "Salaries", amount: 45 }, { category: "Marketing", amount: 20 }, { category: "Infrastructure", amount: 15 }, { category: "Operations", amount: 12 }, { category: "Legal", amount: 8 }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis dataKey="category" type="category" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} width={90} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
              <Bar dataKey="amount" fill="#378ADD" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
