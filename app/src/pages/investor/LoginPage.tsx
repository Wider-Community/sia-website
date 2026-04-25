import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/themeStore";
export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Force light mode for investor login
  const setTheme = useThemeStore((s) => s.setTheme);
  useEffect(() => { setTheme("light"); }, [setTheme]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const session = localStorage.getItem("sia-investor-session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.token) navigate("/investor/dashboard", { replace: true });
      } catch { /* ignore */ }
    }
  }, [navigate]);

  const handleDummyLogin = () => {
    setLoading(true);
    const session = {
      token: "dummy-token",
      role: "investor",
      email: "investor@sia.com",
      name: "SIA Investor",
      provider: "dummy",
    };
    localStorage.setItem("sia-investor-session", JSON.stringify(session));
    navigate("/investor/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="glass-card glass-card-accent w-full max-w-md p-8 text-center">
        <img src="/images/sia-logo.png" alt="SIA" className="h-12 w-auto mx-auto mb-6" />
        <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--text)" }}>
          Investor Portal
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Sign in to access financial models and analytics
        </p>

<button
          onClick={handleDummyLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#1a1a1a" }}
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>

        <a href="/" className="inline-block mt-6 text-sm transition-colors" style={{ color: "var(--text-tertiary)" }}>
          &larr; Back to website
        </a>
      </div>
    </div>
  );
}
