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

export class MujarradClient {
  private apiUrl: string;
  private spaceSlug: string;
  private auth: MujarradClientConfig["auth"];

  constructor(config: MujarradClientConfig) {
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.spaceSlug = config.spaceSlug ?? DEFAULT_SPACE;
    this.auth = config.auth;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
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
  ): Promise<MujarradNode<T>> {
    const existing = await this.getNode<T>(nodeId);
    return this.request<MujarradNode<T>>(this.spacePath(`/nodes/${nodeId}`), {
      method: "PUT",
      body: JSON.stringify({
        title: updates.title ?? existing.title,
        slug: existing.slug,
        nodeType: updates.nodeType ?? existing.nodeType,
        content: updates.content ?? existing.content ?? "",
        nodeDetails: updates.nodeDetails ?? existing.nodeDetails,
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
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "MujarradError";
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
