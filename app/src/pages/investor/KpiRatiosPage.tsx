import { KpiCard } from "@/components/investor/KpiCard";

const ratios = [
  { label: "Gross Margin", value: "72%", trend: "+3%", trendUp: true },
  { label: "Net Margin", value: "48%", trend: "+5%", trendUp: true },
  { label: "Burn Rate", value: "$45K/mo", trend: "-12%", trendUp: true },
  { label: "Runway", value: "18 months", trend: "+3 mo", trendUp: true },
  { label: "CAC", value: "$2.4K", trend: "-8%", trendUp: true },
  { label: "LTV", value: "$28K", trend: "+15%", trendUp: true },
  { label: "LTV:CAC", value: "11.7x", trend: "+2.1x", trendUp: true },
  { label: "Churn Rate", value: "2.1%", trend: "-0.3%", trendUp: true },
];

export function KpiRatiosPage() {
  return (
    <div className="space-y-8">
      <div className="section-label">KPI & Ratios</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ratios.map((r) => (
          <KpiCard key={r.label} {...r} />
        ))}
      </div>
    </div>
  );
}
