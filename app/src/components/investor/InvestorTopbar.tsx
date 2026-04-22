import { useState, useCallback } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useStore, calcMonthlyForecast, DEFAULTS, SCENARIOS, SCENARIO_META } from "@/stores/financialModel";
import { exportToExcel } from "@/utils/excel";

interface InvestorTopbarProps {
  isAdmin?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function InvestorTopbar({ isAdmin, onLogin, onLogout }: InvestorTopbarProps) {
  const navigate = useNavigate();
  const s = useStore();
  const [showScenarios, setShowScenarios] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSessionLogout = () => {
    localStorage.removeItem("sia-investor-session");
    navigate("/");
  };

  const handleExport = async () => {
    const forecast = calcMonthlyForecast(s);
    await exportToExcel(s, forecast);
  };

  const handleSave = useCallback(() => {
    localStorage.setItem('sia-financial-model', JSON.stringify({ state: useStore.getState(), version: 0 }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleSaveSnapshot = useCallback(() => {
    const state = useStore.getState();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (typeof v !== 'function') data[k] = v;
    }
    const json = JSON.stringify({ snapshot: data, version: 1, savedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sia-financial-model-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleLoadSnapshot = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const data = parsed.snapshot || parsed.state || parsed;
          if (data && typeof data === 'object' && 'dealsPerYear' in data) {
            s.set(data);
            localStorage.setItem('sia-financial-model', JSON.stringify({ state: { ...useStore.getState() }, version: 0 }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          } else {
            alert('Invalid snapshot file');
          }
        } catch {
          alert('Could not parse file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [s]);

  const handleReset = useCallback(() => {
    if (!window.confirm('Reset all inputs to defaults?')) return;
    localStorage.removeItem('sia-financial-model');
    s.set(DEFAULTS);
  }, [s]);

  // Toolbar button style
  const tbBtn = "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all hover:bg-[var(--surface-hover)]";
  const tbBtnPrimary = `${tbBtn} text-[var(--accent)]`;
  const divider = <div className="w-px h-5 mx-1" style={{ backgroundColor: "var(--border)" }} />;

  return (
    <header
      className="h-14 flex items-center justify-between px-4 border-b"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Investor Portal
        </span>
        {isAdmin && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded" style={{ backgroundColor: "var(--accent)", color: "#1a1a1a" }}>
            Control Panel
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Excel export — visible to everyone */}
        <button onClick={handleExport} className={tbBtn} style={{ color: "var(--text-secondary)" }} title="Download Excel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span className="hidden sm:inline">Excel</span>
        </button>

        {/* Admin-only actions */}
        {isAdmin && (
          <>
            {divider}
            {saved && <span className="text-[var(--success)] text-xs font-bold animate-pulse">&#10003;</span>}
            <button onClick={handleSave} className={tbBtnPrimary} title="Save">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
            <button onClick={handleSaveSnapshot} className={tbBtn} style={{ color: "var(--text-secondary)" }} title="Save Snapshot">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <button onClick={handleLoadSnapshot} className={tbBtn} style={{ color: "var(--text-secondary)" }} title="Load Snapshot">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            {divider}
            {/* Scenario dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowScenarios(v => !v)}
                className={`${tbBtn} ${showScenarios ? 'bg-[var(--surface-hover)]' : ''}`}
                style={{ color: "var(--text-secondary)" }}
                title="Scenarios"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: showScenarios ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showScenarios && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowScenarios(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 z-50 glass-card p-2" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider px-3 py-2" style={{ color: "var(--text-tertiary)" }}>
                      Load Scenario
                    </div>
                    {Object.entries(SCENARIO_META).map(([key, meta]) => (
                      <button
                        key={key}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--surface-hover)]"
                        onClick={() => {
                          s.set(SCENARIOS[key]);
                          localStorage.setItem('sia-financial-model', JSON.stringify({ state: { ...useStore.getState() }, version: 0 }));
                          setShowScenarios(false);
                          setSaved(true);
                          setTimeout(() => setSaved(false), 2000);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                          <span style={{ color: "var(--text)" }}>{meta.label}</span>
                        </div>
                        <div className="text-[11px] ml-4" style={{ color: "var(--text-tertiary)" }}>{meta.description}</div>
                      </button>
                    ))}
                    <div className="h-px my-1" style={{ backgroundColor: "var(--border)" }} />
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ color: "var(--danger)" }}
                      onClick={() => { handleReset(); setShowScenarios(false); }}
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {divider}
        {/* Control Panel toggle */}
        <button
          onClick={isAdmin ? onLogout : onLogin}
          className={`${isAdmin ? tbBtnPrimary : tbBtn} gap-2`}
          style={!isAdmin ? { color: "var(--text-secondary)" } : undefined}
          title={isAdmin ? "Exit Control Panel" : "Control Panel"}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isAdmin ? "Exit Control Panel" : "Control Panel"}</span>
        </button>

        <ThemeToggle />

        {/* Session logout */}
        <button
          onClick={handleSessionLogout}
          className={tbBtn}
          style={{ color: "var(--text-secondary)" }}
          title="Logout"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>
  );
}
