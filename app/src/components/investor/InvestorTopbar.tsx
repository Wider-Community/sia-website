import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function InvestorTopbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("sia-investor-session");
    navigate("/");
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Investor Portal
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          className="p-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-danger hover:bg-[var(--surface-hover)]"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
