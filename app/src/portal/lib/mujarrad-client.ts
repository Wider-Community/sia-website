const DEFAULT_API_URL = import.meta.env.VITE_MUJARRAD_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "https://mujarrad.onrender.com";
const DEFAULT_SPACE = "sia-portal-platform";

export type NodeType = "REGULAR" | "CONTEXT" | "ASSUMPTION" | "TEMPLATE";

export interface MujarradNode<T = Record<string, unknown>> {
  id: string;
  spaceId: string;
  nodeType: NodeType;
  title: string;
  slug: string;
  content: string | null;
  nodeDetails: T;
  currentVersionId: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MujarradAttribute {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  attributeName: string;
  attributeType: string;
  attributeTypeMode: string;
  attributeValue?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MujarradClientConfig {
  apiUrl?: string;
  spaceSlug?: string;
  auth:
    | { type: "apiKey"; apiKey: string; secretKey: string }
    | { type: "jwt"; getToken: () => Promise<string | null> };
}

// In-flight request dedup + short TTL cache for GET requests
const CACHE_TTL = 5_000; // 5 seconds
interface CacheEntry { data: unknown; expiresAt: number }

export class MujarradClient {
  private apiUrl: string;
  private spaceSlug: string;
  private auth: MujarradClientConfig["auth"];
  private inflight = new Map<string, Promise<unknown>>();
  private cache = new Map<string, CacheEntry>();

  constructor(config: MujarradClientConfig) {
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.spaceSlug = config.spaceSlug ?? DEFAULT_SPACE;
    this.auth = config.auth;
  }

  /** Invalidate cache entries matching a path prefix */
  invalidate(pathPrefix?: string) {
    if (!pathPrefix) { this.cache.clear(); return; }
    for (const key of this.cache.keys()) {
      if (key.startsWith(pathPrefix)) this.cache.delete(key);
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const method = (options?.method ?? "GET").toUpperCase();
    const isRead = method === "GET";

    // For GET: check cache first, then dedup in-flight requests
    if (isRead) {
      const cached = this.cache.get(path);
      if (cached && cached.expiresAt > Date.now()) return cached.data as T;

      const existing = this.inflight.get(path);
      if (existing) return existing as Promise<T>;
    }

    const promise = this._fetch<T>(path, options);

    if (isRead) {
      this.inflight.set(path, promise);
      promise.then(
        (data) => {
          this.cache.set(path, { data, expiresAt: Date.now() + CACHE_TTL });
          this.inflight.delete(path);
        },
        () => { this.inflight.delete(path); },
      );
    } else {
      // Mutations invalidate relevant cache entries
      promise.then(() => {
        this.invalidate(this.spacePath("/nodes"));
      });
    }

    return promise;
  }

  private async _fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.auth.type === "apiKey") {
      headers["X-API-Key"] = this.auth.apiKey;
      headers["X-API-Secret"] = this.auth.secretKey;
    } else {
      const token = await this.auth.getToken();
      if (!token) throw new MujarradError("Not authenticated", 401);
      headers["Authorization"] = `Bearer ${token}`;
    }

    {
      const res = await fetch(`${this.apiUrl}${path}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
      });

      if (res.status === 204) return null as T;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new MujarradError(
          (body as Record<string, string>).message ?? `HTTP ${res.status}`,
          res.status,
        );
      }

      return await res.json();
    }
  }

  private spacePath(suffix: string): string {
    return `/api/spaces/${this.spaceSlug}${suffix}`;
  }

  async createNode<T = Record<string, unknown>>(
    title: string,
    nodeType: NodeType,
    nodeDetails: T,
    content?: string,
  ): Promise<MujarradNode<T>> {
    return this.request<MujarradNode<T>>(this.spacePath("/nodes"), {
      method: "POST",
      body: JSON.stringify({
        title,
        slug: slugify(title + "-" + Date.now()),
        nodeType,
        content: content ?? "",
        nodeDetails,
      }),
    });
  }

  async getNode<T = Record<string, unknown>>(
    nodeId: string,
  ): Promise<MujarradNode<T>> {
    return this.request<MujarradNode<T>>(this.spacePath(`/nodes/${nodeId}`));
  }

  async listNodes<T = Record<string, unknown>>(options?: {
    nodeType?: NodeType;
    search?: string;
  }): Promise<MujarradNode<T>[]> {
    const params = new URLSearchParams();
    if (options?.nodeType) params.set("nodeType", options.nodeType);
    if (options?.search) params.set("search", options.search);
    const qs = params.toString();
    return this.request<MujarradNode<T>[]>(
      this.spacePath(`/nodes${qs ? `?${qs}` : "?search="}`),
    );
  }

  async updateNode<T = Record<string, unknown>>(
    nodeId: string,
    updates: {
      title?: string;
      nodeType?: NodeType;
      nodeDetails?: T;
      content?: string;
    },
    /** Pass existing node to skip redundant GET */
    existing?: MujarradNode<T>,
  ): Promise<MujarradNode<T>> {
    const base = existing ?? await this.getNode<T>(nodeId);
    return this.request<MujarradNode<T>>(this.spacePath(`/nodes/${nodeId}`), {
      method: "PUT",
      body: JSON.stringify({
        title: updates.title ?? base.title,
        slug: base.slug,
        nodeType: updates.nodeType ?? base.nodeType,
        content: updates.content ?? base.content ?? "",
        nodeDetails: updates.nodeDetails ?? base.nodeDetails,
      }),
    });
  }

  async getDescendants<T = Record<string, unknown>>(
    nodeId: string,
  ): Promise<MujarradNode<T>[]> {
    return this.request<MujarradNode<T>[]>(
      this.spacePath(`/nodes/${nodeId}/descendants`),
    );
  }

  async getAncestors<T = Record<string, unknown>>(
    nodeId: string,
  ): Promise<MujarradNode<T>[]> {
    return this.request<MujarradNode<T>[]>(
      this.spacePath(`/nodes/${nodeId}/ancestors`),
    );
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.request<void>(this.spacePath(`/nodes/${nodeId}`), {
      method: "DELETE",
    });
  }

  async createAttribute(
    sourceNodeId: string,
    targetNodeId: string,
    attributeName: string,
    metadata?: Record<string, unknown>,
  ): Promise<MujarradAttribute> {
    return this.request<MujarradAttribute>(`/api/nodes/${sourceNodeId}/attributes`, {
      method: "POST",
      body: JSON.stringify({
        sourceNodeId,
        targetNodeId,
        attributeName,
        attributeType: "RELATES_TO",
        ...(metadata ? { attributeValue: metadata } : {}),
      }),
    });
  }

  async getAttributes(nodeId: string): Promise<MujarradAttribute[]> {
    return this.request<MujarradAttribute[]>(`/api/nodes/${nodeId}/attributes`);
  }

  async updateAttribute(
    attributeId: string,
    updates: { attributeName?: string; attributeValue?: Record<string, unknown> },
  ): Promise<MujarradAttribute> {
    return this.request<MujarradAttribute>(`/api/attributes/${attributeId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteAttribute(attributeId: string): Promise<void> {
    await this.request<void>(`/api/attributes/${attributeId}`, {
      method: "DELETE",
    });
  }
}

export class MujarradError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MujarradError";
    this.status = status;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
