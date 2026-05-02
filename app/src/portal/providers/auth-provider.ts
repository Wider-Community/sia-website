import type { AuthProvider } from "@refinedev/core";

const API_URL = import.meta.env.VITE_MUJARRAD_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "https://mujarrad.onrender.com";
const TOKEN_KEY = "sia_token";
const USER_KEY = "sia_user";

// Note: React Query (used by Refine's useLogin) provides automatic caching
// for auth state. The token/user stored in localStorage act as the persistent
// cache layer, while React Query's in-memory cache prevents redundant API calls
// during the session. No additional caching setup is needed.

export const authProvider: AuthProvider = {
  async login(params) {
    try {
      if (params.provider === "google" && params.credential) {
        const res = await fetch(`${API_URL}/api/auth/oauth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: params.credential }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const detail = body?.detail ?? "Google login failed";
          throw new Error(detail);
        }
        const { token, user } = await res.json();
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return { success: true, redirectTo: "/portal" };
      }

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: params.email, password: params.password }),
      });
      if (!res.ok) {
        // Mujarrad returns RFC 7807 problem detail: { status, title, detail }
        const body = await res.json().catch(() => null);
        if (res.status === 401) {
          throw new Error(body?.detail ?? "Invalid email or password");
        }
        throw new Error(body?.detail ?? body?.title ?? "Login failed. Please try again.");
      }
      const { token, user } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { success: true, redirectTo: "/portal" };
    } catch (err) {
      const message =
        err instanceof TypeError && err.message === "Failed to fetch"
          ? "Network error. Please check your connection and try again."
          : (err as Error).message;
      return {
        success: false,
        error: { name: "LoginError", message },
      };
    }
  },

  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { success: true, redirectTo: "/portal/login" };
  },

  async check() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { authenticated: false, redirectTo: "/portal/login" };

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return { authenticated: false, redirectTo: "/portal/login" };
      }
    } catch {
      // If token can't be decoded, still treat as authenticated (mock mode)
    }

    return { authenticated: true };
  },

  async onError(error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      return { logout: true };
    }
    return { error };
  },

  async getIdentity() {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      return { id: user.id, name: user.name ?? user.username, email: user.email, avatar: user.avatar ?? user.avatarUrl };
    }
    return null;
  },

  async getPermissions() {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      return { role: user.role ?? "admin" };
    }
    return { role: "admin" };
  },
};

export const mockAuthProvider: AuthProvider = {
  async login() {
    const mockUser = { id: "user-1", name: "Omar", email: "board@wider.community", avatar: "", role: "admin" };
    localStorage.setItem(TOKEN_KEY, "mock-jwt-token");
    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    return { success: true, redirectTo: "/portal" };
  },

  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { success: true, redirectTo: "/portal/login" };
  },

  async check() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { authenticated: false, redirectTo: "/portal/login" };
    return { authenticated: true };
  },

  async onError(error) {
    if ((error as { statusCode?: number }).statusCode === 401) {
      return { logout: true };
    }
    return { error };
  },

  async getIdentity() {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return JSON.parse(stored);
    return { id: "user-1", name: "Omar", email: "board@wider.community", avatar: "", role: "admin" };
  },

  async getPermissions() {
    return { role: "admin" };
  },
};
