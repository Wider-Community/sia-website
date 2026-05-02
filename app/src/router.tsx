import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { InvestorLayout } from "@/layouts/InvestorLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/investor/LoginPage";
import { DashboardPage } from "@/pages/investor/DashboardPage";
import { lazy, Suspense } from "react";
import { GoldSkeleton } from "@/components/investor/GoldSkeleton";
import { PortalApp, PortalAuthenticated } from "@/portal/PortalApp";
import { PortalLoginPage } from "@/portal/pages/LoginPage";
import { PortalDashboardPage } from "@/portal/pages/dashboard/DashboardPage";
import { OrganizationListPage } from "@/portal/pages/organizations/OrganizationListPage";
import { OrganizationFormPage } from "@/portal/pages/organizations/OrganizationFormPage";
import { OrganizationDetailPage } from "@/portal/pages/organizations/OrganizationDetailPage";
import { ContactListPage } from "@/portal/pages/contacts/ContactListPage";
import { ContactFormPage } from "@/portal/pages/contacts/ContactFormPage";
import { ContactDetailPage } from "@/portal/pages/contacts/ContactDetailPage";
import { SigningListPage } from "@/portal/pages/signing/SigningListPage";
import { NewSigningRequestPage } from "@/portal/pages/signing/NewSigningRequestPage";
import { SigningDetailPage } from "@/portal/pages/signing/SigningDetailPage";
import { PublicSigningPage } from "@/portal/pages/signing/PublicSigningPage";
import { TaskListPage } from "@/portal/pages/tasks/TaskListPage";
import { TaskBoardPage } from "@/portal/pages/tasks/TaskBoardPage";
import { TaskCreatePage } from "@/portal/pages/tasks/TaskCreatePage";
import { SlaSettingsPage } from "@/portal/pages/settings/SlaSettingsPage";
import { PipelinePage } from "@/portal/pages/pipeline/PipelinePage";
import { MapPage } from "@/portal/pages/map/MapPage";
import { EngagementListPage } from "@/portal/pages/engagements/EngagementListPage";
import { EngagementFormPage } from "@/portal/pages/engagements/EngagementFormPage";
import { EngagementDetailPage } from "@/portal/pages/engagements/EngagementDetailPage";

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
  // SIA Portal (refine.dev)
  {
    element: <PortalApp />,
    children: [
      { path: "/portal/login", element: <PortalLoginPage /> },
      {
        element: <PortalAuthenticated />,
        children: [
          { path: "/portal", element: <PortalDashboardPage /> },
          { path: "/portal/organizations", element: <OrganizationListPage /> },
          { path: "/portal/organizations/create", element: <OrganizationFormPage /> },
          { path: "/portal/organizations/edit/:id", element: <OrganizationFormPage /> },
          { path: "/portal/organizations/:id", element: <OrganizationDetailPage /> },
          { path: "/portal/contacts", element: <ContactListPage /> },
          { path: "/portal/contacts/create", element: <ContactFormPage /> },
          { path: "/portal/contacts/edit/:id", element: <ContactFormPage /> },
          { path: "/portal/contacts/:id", element: <ContactDetailPage /> },
          { path: "/portal/engagements", element: <EngagementListPage /> },
          { path: "/portal/engagements/create", element: <EngagementFormPage /> },
          { path: "/portal/engagements/edit/:id", element: <EngagementFormPage /> },
          { path: "/portal/engagements/:id", element: <EngagementDetailPage /> },
          { path: "/portal/map", element: <MapPage /> },
          { path: "/portal/pipeline", element: <PipelinePage /> },
          { path: "/portal/signing", element: <SigningListPage /> },
          { path: "/portal/signing/new", element: <NewSigningRequestPage /> },
          { path: "/portal/signing/:id", element: <SigningDetailPage /> },
          { path: "/portal/tasks", element: <TaskListPage /> },
          { path: "/portal/tasks/board", element: <TaskBoardPage /> },
          { path: "/portal/tasks/create", element: <TaskCreatePage /> },
          { path: "/portal/settings/sla", element: <SlaSettingsPage /> },
        ],
      },
    ],
  },
  // Public signing page (no auth required)
  {
    path: "/sign/:token",
    element: <PublicSigningPage />,
  },
]);
