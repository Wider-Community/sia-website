import { Outlet } from "react-router-dom";
import { InvestorSidebar } from "@/components/investor/InvestorSidebar";
import { InvestorTopbar } from "@/components/investor/InvestorTopbar";
import { useState, useCallback } from "react";
import { AdminContext } from "@/components/investor/AdminContext";

export function InvestorLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('sia-admin') === 'true'
  );

  const handleAdminLogin = useCallback(() => {
    const pass = window.prompt("Enter admin password:");
    if (pass === null) return; // cancelled
    if (pass === "sia2026") {
      sessionStorage.setItem('sia-admin', 'true');
      setIsAdmin(true);
    } else {
      window.alert("Incorrect password.");
    }
  }, []);

  const handleAdminLogout = useCallback(() => {
    sessionStorage.removeItem('sia-admin');
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={isAdmin}>
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
        <InvestorSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div
          className="flex-1 flex flex-col transition-[margin] duration-200"
          style={{ marginInlineStart: sidebarCollapsed ? 56 : 240 }}
        >
          <InvestorTopbar isAdmin={isAdmin} onLogin={handleAdminLogin} onLogout={handleAdminLogout} />
          <main className={`flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto ${!isAdmin ? 'read-only' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
