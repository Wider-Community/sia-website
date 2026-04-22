import { Navigate, Outlet } from "react-router-dom";

function useAuth() {
  const stored = localStorage.getItem("sia-investor-session");
  if (!stored) return { isAuthenticated: false, role: null };
  try {
    const session = JSON.parse(stored);
    return { isAuthenticated: true, role: session.role as string };
  } catch {
    return { isAuthenticated: false, role: null };
  }
}

export function ProtectedRoute({ requiredRole }: { requiredRole: string }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/investor/login" replace />;
  }

  if (role !== requiredRole) {
    return <Navigate to="/investor/login" replace />;
  }

  return <Outlet />;
}
