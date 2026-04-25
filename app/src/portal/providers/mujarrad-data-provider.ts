import type { DataProvider, CrudFilter, CrudSort, Pagination } from "@refinedev/core";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const API_URL = "/mujarrad-api";
const SPACE = "sia-portal-platform";
const ADMIN_EMAIL = import.meta.env.VITE_MUJARRAD_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = import.meta.env.VITE_MUJARRAD_ADMIN_PASSWORD ?? "";

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;
let lastError: string | null = null;

export function getMujarradStatus(): { connected: boolean; error: string | null } {
  return { connected: !!cachedToken, error: lastError };
}

function safeLocalGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLocalSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* private browsing */ }
}

function safeLocalRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* private browsing */ }
}

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (!res.ok) {
      lastError = `Login failed (HTTP ${res.status})`;
      return null;
    }
    const data = await res.json();
    if (!data.token) {
      lastError = "No token in login response";
      return null;
    }
    cachedToken = data.token;
    safeLocalSet("sia_mujarrad_token", data.token);
    lastError = null;
    return data.token;
  } catch (err) {
    lastError = `Login fetch error: ${(err as Error).message}`;
    return null;
  }
}

async function ensureToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const stored = safeLocalGet("sia_mujarrad_token");
  if (stored) {
    try {
      const parts = stored.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 > Date.now() + 60000) {
          cachedToken = stored;
          return stored;
        }
      }
    } catch { /* expired or malformed */ }
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    lastError = "Mujarrad credentials not configured in environment";
    return null;
  }
  if (tokenPromise) return tokenPromise;
  tokenPromise = fetchToken();
  const result = await tokenPromise;
  tokenPromise = null;
  return result;
}

ensureToken();

async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  let token = await ensureToken();
  if (!token) {
    cachedToken = null;
    token = await ensureToken();
  }
  if (!token) return null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      cachedToken = null;
      safeLocalRemove("sia_mujarrad_token");
    }
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

interface MujarradNode {
  id: string;
  spaceId: string;
  nodeType: string;
  title: string;
  slug: string;
  content: string | null;
  nodeDetails: Record<string, unknown>;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeNode(node: MujarradNode): Record<string, unknown> {
  const details = node.nodeDetails ?? {};
  return {
    id: node.id,
    ...details,
    _title: node.title,
    _slug: node.slug,
    _nodeType: node.nodeType,
    _content: node.content,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

function clientFilter(data: Record<string, unknown>[], filters?: CrudFilter[]): Record<string, unknown>[] {
  if (!filters?.length) return data;
  return data.filter((item) =>
    filters.every((f) => {
      if (!("field" in f)) return true;
      const val = item[f.field];
      if (f.operator === "eq") return val === f.value;
      if (f.operator === "ne") return val !== f.value;
      if (f.operator === "contains") return typeof val === "string" && val.toLowerCase().includes(String(f.value).toLowerCase());
      return true;
    }),
  );
}

function clientSort(data: Record<string, unknown>[], sorters?: CrudSort[]): Record<string, unknown>[] {
  if (!sorters?.length) return data;
  return [...data].sort((a, b) => {
    for (const s of sorters) {
      const cmp = String(a[s.field] ?? "").localeCompare(String(b[s.field] ?? ""));
      if (cmp !== 0) return s.order === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function clientPaginate(data: Record<string, unknown>[], pagination?: Pagination): Record<string, unknown>[] {
  if (!pagination || pagination.mode === "off") return data;
  const page = pagination.current ?? 1;
  const size = pagination.pageSize ?? 10;
  return data.slice((page - 1) * size, page * size);
}

function notConnectedError(action: string): Error {
  const reason = lastError ?? "unknown reason";
  return new Error(`${action} failed — not connected to Mujarrad (${reason})`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mujarradDataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  async getList({ resource, pagination, filters, sorters }) {
    const nodes = await request<MujarradNode[]>(`/spaces/${SPACE}/nodes?search=`);
    if (!nodes) return { data: [] as any, total: 0 };
    const allNormalized = nodes.map(normalizeNode);
    let data = allNormalized.filter((n) => n._resourceType === resource);
    data = clientFilter(data, filters);
    data = clientSort(data, sorters);
    const total = data.length;
    data = clientPaginate(data, pagination);
    return { data: data as any, total };
  },

  async getOne({ id }) {
    const node = await request<MujarradNode>(`/spaces/${SPACE}/nodes/${id}`);
    if (!node) throw notConnectedError("Get");
    return { data: normalizeNode(node) as any };
  },

  async create({ resource, variables }) {
    const vars = variables as Record<string, unknown>;
    const title = (vars.name as string) || (vars.title as string) || resource;
    const node = await request<MujarradNode>(`/spaces/${SPACE}/nodes`, {
      method: "POST",
      body: JSON.stringify({
        title,
        slug: slugify(title + "-" + Date.now()),
        nodeType: "REGULAR",
        content: (vars.description as string) ?? "",
        nodeDetails: { ...vars, _resourceType: resource },
      }),
    });
    if (!node) throw notConnectedError("Create");
    return { data: normalizeNode(node) as any };
  },

  async update({ id, variables }) {
    const vars = variables as Record<string, unknown>;
    const existing = await request<MujarradNode>(`/spaces/${SPACE}/nodes/${id}`);
    if (!existing) throw notConnectedError("Fetch for update");
    const title = (vars.name as string) || (vars.title as string) || existing.title;
    const node = await request<MujarradNode>(`/spaces/${SPACE}/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        slug: existing.slug,
        nodeType: existing.nodeType,
        content: (vars.description as string) ?? existing.content ?? "",
        nodeDetails: { ...existing.nodeDetails, ...vars, _resourceType: existing.nodeDetails._resourceType },
      }),
    });
    if (!node) throw notConnectedError("Update");
    return { data: normalizeNode(node) as any };
  },

  async deleteOne({ id }) {
    await request(`/spaces/${SPACE}/nodes/${id}`, { method: "DELETE" });
    return { data: { id } as any };
  },

  getMany: undefined,

  async custom({ url, method, payload, query: q, headers: customHeaders }) {
    const qs = q ? `?${new URLSearchParams(q as Record<string, string>).toString()}` : "";
    const res = await request<Record<string, unknown>>(`${url}${qs}`, {
      method: method.toUpperCase(),
      body: payload ? JSON.stringify(payload) : undefined,
      headers: customHeaders as HeadersInit,
    });
    return { data: (res ?? {}) as any };
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
