import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { InvestorLayout } from "@/layouts/InvestorLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/investor/LoginPage";
import { DashboardPage } from "@/pages/investor/DashboardPage";
import { lazy, Suspense } from "react";
import { GoldSkeleton } from "@/components/investor/GoldSkeleton";

const ChartsPage = lazy(() => import("@/pages/investor/ChartsPage").then(m => ({ default: m.ChartsPage })));
const SalesForecastPage = lazy(() => import("@/pages/investor/SalesForecastPage").then(m => ({ default: m.SalesForecastPage })));
const RevenueBreakdownPage = lazy(() => import("@/pages/investor/RevenueBreakdownPage").then(m => ({ default: m.RevenueBreakdownPage })));
const CohortAnalysisPage = lazy(() => import("@/pages/investor/CohortAnalysisPage").then(m => ({ default: m.CohortAnalysisPage })));
const SalariesPage = lazy(() => import("@/pages/investor/SalariesPage").then(m => ({ default: m.SalariesPage })));
const OpexPage = lazy(() => import("@/pages/investor/OpexPage").then(m => ({ default: m.OpexPage })));
const CapexPage = lazy(() => import("@/pages/investor/CapexPage").then(m => ({ default: m.CapexPage })));
const IncomeStatementPage = lazy(() => import("@/pages/investor/IncomeStatementPage").then(m => ({ default: m.IncomeStatementPage })));
const BalanceSheetPage = lazy(() => import("@/pages/investor/BalanceSheetPage").then(m => ({ default: m.BalanceSheetPage })));
const CashFlowPage = lazy(() => import("@/pages/investor/CashFlowPage").then(m => ({ default: m.CashFlowPage })));
const BreakevenPage = lazy(() => import("@/pages/investor/BreakevenPage").then(m => ({ default: m.BreakevenPage })));
const KpiRatiosPage = lazy(() => import("@/pages/investor/KpiRatiosPage").then(m => ({ default: m.KpiRatiosPage })));

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<GoldSkeleton lines={8} className="p-8" />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
    ],
  },
  {
    path: "/investor/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute requiredRole="investor" />,
    children: [
      {
        element: <InvestorLayout />,
        children: [
          { path: "/investor/dashboard", element: <DashboardPage /> },
          { path: "/investor/charts", element: <LazyWrapper><ChartsPage /></LazyWrapper> },
          { path: "/investor/sales-forecast", element: <LazyWrapper><SalesForecastPage /></LazyWrapper> },
          { path: "/investor/revenue", element: <LazyWrapper><RevenueBreakdownPage /></LazyWrapper> },
          { path: "/investor/cohorts", element: <LazyWrapper><CohortAnalysisPage /></LazyWrapper> },
          { path: "/investor/salaries", element: <LazyWrapper><SalariesPage /></LazyWrapper> },
          { path: "/investor/opex", element: <LazyWrapper><OpexPage /></LazyWrapper> },
          { path: "/investor/capex", element: <LazyWrapper><CapexPage /></LazyWrapper> },
          { path: "/investor/income-statement", element: <LazyWrapper><IncomeStatementPage /></LazyWrapper> },
          { path: "/investor/balance-sheet", element: <LazyWrapper><BalanceSheetPage /></LazyWrapper> },
          { path: "/investor/cash-flow", element: <LazyWrapper><CashFlowPage /></LazyWrapper> },
          { path: "/investor/breakeven", element: <LazyWrapper><BreakevenPage /></LazyWrapper> },
          { path: "/investor/kpi-ratios", element: <LazyWrapper><KpiRatiosPage /></LazyWrapper> },
        ],
      },
    ],
  },
]);
