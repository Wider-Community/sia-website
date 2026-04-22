import { useMemo } from "react";
import { KpiCard } from "@/components/investor/KpiCard";
import { ChartCard } from "@/components/investor/ChartCard";
import { Hint } from "@/components/investor/Hint";
import {
  useStore,
  calcMonthlyForecast,
  calcBreakevenMonth,
  calcPeakDeficit,
  calcTierSubsAtMonth,
} from "@/stores/financialModel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => n.toFixed(1) + "%";

const COLORS = ["#c8a951", "#378ADD", "#1D9E75", "#a08838", "#E24B4A", "#9b59b6"];

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
};

export function DashboardPage() {
  const store = useStore();
  const set = useStore((s) => s.set);

  const forecast = useMemo(() => calcMonthlyForecast(store), [store]);

  const y1 = forecast.slice(0, 12);
  const y2 = forecast.slice(12, 24);

  const y1Revenue = y1.reduce((a, m) => a + m.totalRevenue, 0);
  const y1Costs = y1.reduce((a, m) => a + m.totalCosts, 0);
  const y1Net = y1.reduce((a, m) => a + m.netProfit, 0);
  const y1Gross = y1.reduce((a, m) => a + m.grossProfit, 0);
  const y2Revenue = y2.reduce((a, m) => a + m.totalRevenue, 0);

  const netMargin = y1Revenue ? (y1Net / y1Revenue) * 100 : 0;
  const grossMargin = y1Revenue ? (y1Gross / y1Revenue) * 100 : 0;

  const beMonth = calcBreakevenMonth(forecast);
  const peakDef = calcPeakDeficit(forecast);

  const totalCapex = store.capex.reduce((a, r) => a + r.cost, 0);
  const roi = totalCapex ? (y1Net / totalCapex) * 100 : 0;

  const monthlySubMRR = store.subTiers.reduce(
    (a, tier) => a + tier.price * calcTierSubsAtMonth(tier, 12),
    0
  );
  const subCoverage = y1Costs ? (monthlySubMRR / (y1Costs / 12)) * 100 : 0;

  // Chart data: every 2nd month
  const revCostData = forecast
    .filter((_, i) => i % 2 === 0)
    .map((m) => ({
      label: m.label,
      revenue: Math.round(m.totalRevenue),
      costs: Math.round(m.totalCosts),
      netProfit: Math.round(m.netProfit),
    }));

  // Revenue mix Y1
  const y1Deals = y1.reduce((a, m) => a + m.dealRevenue, 0);
  const y1Subs = y1.reduce((a, m) => a + m.subRevenue, 0);
  const y1Addons = y1.reduce((a, m) => a + m.addOnRevenue, 0);
  const revenueMix = [
    { name: "Deal Commissions", value: Math.round(y1Deals) },
    { name: "Subscriptions", value: Math.round(y1Subs) },
    { name: "Add-ons", value: Math.round(y1Addons) },
  ];

  // Cost stack (stacked bar, every 2nd month)
  const costStackData = forecast
    .filter((_, i) => i % 2 === 0)
    .map((m) => ({
      label: m.label,
      COGS: Math.round(m.cogs),
      Salaries: Math.round(m.salaries),
      OpEx: Math.round(m.opex),
      Depreciation: Math.round(m.depreciation),
    }));

  // Cumulative cash line
  const cumCashData = forecast.map((m) => ({
    label: m.label,
    cumCash: Math.round(m.cumCash),
  }));

  const mainKpis = [
    { label: "Y1 Revenue", hint: "y1Revenue", value: fmt(y1Revenue), trend: fmt(y1Revenue), trendUp: y1Revenue > 0 },
    { label: "Net Profit", hint: "netProfit", value: fmt(y1Net), trend: y1Net >= 0 ? "Profitable" : "Loss", trendUp: y1Net >= 0 },
    { label: "Net Margin", hint: "netMargin", value: pct(netMargin), trend: netMargin >= 0 ? "Healthy" : "Negative", trendUp: netMargin >= 0 },
    { label: "Gross Margin", hint: "grossMargin", value: pct(grossMargin), trend: grossMargin >= 50 ? "Strong" : "Low", trendUp: grossMargin >= 50 },
    { label: "Breakeven Month", hint: "breakevenMonth", value: beMonth ? `Month ${beMonth}` : "N/A", trend: beMonth && beMonth <= 12 ? "Within Y1" : "Beyond Y1", trendUp: beMonth !== null && beMonth <= 12 },
    { label: "ROI", hint: "roi", value: pct(roi), trend: roi >= 100 ? "Positive" : "Below 100%", trendUp: roi >= 100 },
  ];

  const secondaryKpis = [
    { label: "Peak Funding Deficit", hint: "peakFundingDeficit", value: fmt(peakDef), trend: peakDef < 0 ? "Funding needed" : "Self-funded", trendUp: peakDef >= 0 },
    { label: "Subscription MRR", hint: "subscriptionMRR", value: fmt(monthlySubMRR), trend: pct(subCoverage) + " cost coverage", trendUp: subCoverage >= 50 },
    { label: "Y2 Revenue Projection", hint: "y2Revenue", value: fmt(y2Revenue), trend: y1Revenue ? pct(((y2Revenue - y1Revenue) / y1Revenue) * 100) + " YoY" : "N/A", trendUp: y2Revenue > y1Revenue },
  ];

  return (
    <div className="space-y-8">
      <div className="section-label">Dashboard</div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {mainKpis.map(({ hint, ...kpi }) => (
          <KpiCard key={kpi.label} {...kpi} label={<Hint term={hint}>{kpi.label}</Hint>} />
        ))}
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {secondaryKpis.map(({ hint, ...kpi }) => (
          <KpiCard key={kpi.label} {...kpi} label={<Hint term={hint}>{kpi.label}</Hint>} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue vs Costs vs Net Profit">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#c8a951" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="#378ADD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netProfit" name="Net Profit" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Mix Y1">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={revenueMix} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {revenueMix.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cost Stack">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costStackData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="COGS" stackId="a" fill="#c8a951" />
              <Bar dataKey="Salaries" stackId="a" fill="#378ADD" />
              <Bar dataKey="OpEx" stackId="a" fill="#1D9E75" />
              <Bar dataKey="Depreciation" stackId="a" fill="#a08838" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cumulative Cash">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumCashData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="cumCash" name="Cumulative Cash" stroke="#c8a951" strokeWidth={2} dot={{ fill: "#c8a951", r: 3 }} activeDot={{ r: 5, fill: "#c8a951", stroke: "var(--surface)", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Interactive Sliders */}
      <div className="glass-card p-6 space-y-6">
        <div className="section-label">Model Parameters</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <SliderRow label="Deals per Year" hintKey="dealsPerYear" value={store.dealsPerYear} min={0} max={100} step={1} display={String(store.dealsPerYear)} onChange={(v) => set({ dealsPerYear: v })} />
          <SliderRow label="Avg Deal Value" hintKey="avgDealValue" value={store.avgDealValue} min={500000} max={20000000} step={100000} display={fmt(store.avgDealValue)} onChange={(v) => set({ avgDealValue: v })} />
          <SliderRow label="Commission Rate" hintKey="commissionRate" value={store.commissionRate} min={0} max={10} step={0.1} display={pct(store.commissionRate)} onChange={(v) => set({ commissionRate: v })} />
          <SliderRow label="Deal Ramp-Up Months" hintKey="dealRampUpMonths" value={store.dealRampUpMonths} min={1} max={12} step={1} display={`${store.dealRampUpMonths} mo`} onChange={(v) => set({ dealRampUpMonths: v })} />
          <SliderRow label="Revenue Growth Rate" hintKey="revenueGrowthRate" value={store.revenueGrowthRate} min={0} max={50} step={1} display={pct(store.revenueGrowthRate)} onChange={(v) => set({ revenueGrowthRate: v })} />
          <SliderRow label="Starting Cash" hintKey="startingCash" value={store.startingCash} min={0} max={2000000} step={10000} display={fmt(store.startingCash)} onChange={(v) => set({ startingCash: v })} />
          <SliderRow label="Tax Rate" hintKey="taxRate" value={store.taxRate} min={0} max={50} step={1} display={pct(store.taxRate)} onChange={(v) => set({ taxRate: v })} />
          <SliderRow label="COGS per Deal" hintKey="cogsPerDeal" value={store.cogsPerDeal} min={0} max={50000} step={500} display={fmt(store.cogsPerDeal)} onChange={(v) => set({ cogsPerDeal: v })} />
        </div>

        {/* Toggle switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <ToggleRow label="Subscription Revenue" hintKey="subRevenueMultiplier" active={store.subRevenueMultiplier > 0} onChange={(on) => set({ subRevenueMultiplier: on ? 100 : 0 })} />
          <ToggleRow label="Add-on Revenue" hintKey="addOnRevenueMultiplier" active={store.addOnRevenueMultiplier > 0} onChange={(on) => set({ addOnRevenueMultiplier: on ? 100 : 0 })} />
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, hintKey, value, min, max, step, display, onChange }: {
  label: string; hintKey: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}><Hint term={hintKey}>{label}</Hint></span>
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{display}</span>
      </div>
      <input type="range" className="gold-slider w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ '--fill': `${fill}%` } as React.CSSProperties} />
    </div>
  );
}

function ToggleRow({ label, hintKey, active, onChange }: { label: string; hintKey: string; active: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium" style={{ color: "var(--text)" }}><Hint term={hintKey}>{label}</Hint></span>
      <button
        onClick={() => onChange(!active)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ backgroundColor: active ? "#c8a951" : "var(--border)" }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: active ? "translateX(24px)" : "translateX(4px)" }}
        />
      </button>
    </div>
  );
}
