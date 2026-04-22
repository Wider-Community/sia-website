import { useState, type ReactNode } from "react";

const HINTS: Record<string, string> = {
  dealsPerYear: "Number of deals expected to close per year",
  avgDealValue: "Average transaction value per deal in USD",
  commissionRate: "Percentage commission earned on each deal",
  dealRampUpMonths: "Months before reaching full deal velocity",
  revenueGrowthRate: "Year-over-year revenue growth percentage",
  startingCash: "Initial cash available at company start",
  taxRate: "Corporate tax rate applied to EBIT",
  cogsPerDeal: "Direct cost incurred per closed deal",
  subRevenueMultiplier: "Toggle subscription revenue on/off",
  addOnRevenueMultiplier: "Toggle add-on revenue on/off",
  y1Revenue: "Total revenue projected for Year 1",
  netProfit: "Revenue minus all costs and taxes",
  netMargin: "Net profit as a percentage of total revenue",
  grossMargin: "Gross profit as a percentage of total revenue",
  breakevenMonth: "Month when monthly revenue first exceeds monthly costs",
  roi: "Return on investment based on total CapEx",
  peakFundingDeficit: "Maximum negative cash position — the minimum funding needed",
  subscriptionMRR: "Monthly recurring revenue from all subscription tiers at Month 12",
  y2Revenue: "Total revenue projected for Year 2",
};

interface HintProps {
  term: string;
  children: ReactNode;
}

export function Hint({ term, children }: HintProps) {
  const [show, setShow] = useState(false);
  const text = HINTS[term];
  if (!text) return <>{children}</>;

  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ borderBottom: "1px dashed var(--text-tertiary)" }}
    >
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg whitespace-nowrap z-50 pointer-events-none"
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            maxWidth: 280,
            whiteSpace: "normal",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
