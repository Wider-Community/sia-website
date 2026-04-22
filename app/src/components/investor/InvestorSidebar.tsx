import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BarChart3, TrendingUp, DollarSign, Users2,
  Receipt, Building2, FileText, Scale, PieChart, ChevronLeft,
  ChevronRight, Layers, CreditCard, Activity,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/investor/dashboard" },
      { label: "Charts", icon: BarChart3, href: "/investor/charts" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Sales Forecast", icon: TrendingUp, href: "/investor/sales-forecast" },
      { label: "Revenue Breakdown", icon: DollarSign, href: "/investor/revenue" },
      { label: "Cohort Analysis", icon: Layers, href: "/investor/cohorts" },
    ],
  },
  {
    label: "Costs",
    items: [
      { label: "Salaries & Team", icon: Users2, href: "/investor/salaries" },
      { label: "Operating Expenses", icon: Receipt, href: "/investor/opex" },
      { label: "Capital Expenditure", icon: Building2, href: "/investor/capex" },
    ],
  },
  {
    label: "Statements",
    items: [
      { label: "Income Statement", icon: FileText, href: "/investor/income-statement" },
      { label: "Balance Sheet", icon: Scale, href: "/investor/balance-sheet" },
      { label: "Cash Flow", icon: CreditCard, href: "/investor/cash-flow" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { label: "Breakeven", icon: PieChart, href: "/investor/breakeven" },
      { label: "KPI & Ratios", icon: Activity, href: "/investor/kpi-ratios" },
    ],
  },
];

export function InvestorSidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "investor-sidebar fixed top-0 bottom-0 z-40 flex flex-col overflow-y-auto overflow-x-hidden",
        collapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center justify-between p-4 h-16">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/sia-logo.png" alt="SIA" className="h-8 w-auto" />
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="section-label px-3 mb-2">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "sidebar-item-active font-medium"
                        : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
