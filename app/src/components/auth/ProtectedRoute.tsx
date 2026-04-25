import { Outlet } from "react-router-dom";

export function ProtectedRoute({ requiredRole: _requiredRole }: { requiredRole: string }) {
  // Auth disabled — allow direct access without login
  return <Outlet />;
}
