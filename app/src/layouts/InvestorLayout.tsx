import { Outlet } from "react-router-dom";
import { InvestorSidebar } from "@/components/investor/InvestorSidebar";
import { InvestorTopbar } from "@/components/investor/InvestorTopbar";
import { useState } from "react";

export function InvestorLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <InvestorSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className="flex-1 flex flex-col transition-[margin] duration-200"
        style={{ marginInlineStart: sidebarCollapsed ? 56 : 240 }}
      >
        <InvestorTopbar />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
