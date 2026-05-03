import type { CrudFilter, CrudSort, Pagination } from "@refinedev/core";
import type { MujarradClient, MujarradNode } from "./mujarrad-client";
import { ENTITY_REGISTRY, type EntityDef } from "./entity-registry";

export interface EntityRecord {
  id: string;
  [key: string]: unknown;
}

export interface ListResult {
  data: EntityRecord[];
  total: number;
}

const SKIP_ACTIVITY_LOGGING = new Set([
  "activity-events",
  "users",
  "alerts",
  "sla-rules",
]);

export class EntityControlLayer {
  private client: MujarradClient;
  constructor(client: MujarradClient) {
    this.client = client;
  }

  async createEntity(
    resource: string,
    variables: Record<string, unknown>,
  ): Promise<EntityRecord> {
    const def = this.requireDef(resource);
    this.validateRequired(def, variables, resource);

    const title = this.buildTitle(def, variables, resource);
    const nodeDetails = { ...variables, _resourceType: resource };

    const node = await this.client.createNode(title, def.nodeType, nodeDetails);
    this.createSupplementaryAttributes(def, variables, node.id);

    const record = this.normalize(node);
    this.logActivity("created", resource, record);
    return record;
  }

  async getEntity(_resource: string, id: string): Promise<EntityRecord> {
    const node = await this.client.getNode(id);
    return this.normalize(node);
  }

  async listEntities(
    resource: string,
    options?: {
      filters?: CrudFilter[];
      sorters?: CrudSort[];
      pagination?: Pagination;
    },
  ): Promise<ListResult> {
    const nodes = (await this.client.listNodes()) ?? [];

    let data = nodes
      .filter(
        (n) =>
          (n.nodeDetails as Record<string, unknown>)?._resourceType === resource,
      )
      .map((n) => this.normalize(n));

    data = this.applyFilters(data, options?.filters);
    data = this.applySorters(data, options?.sorters);
    const total = data.length;
    data = this.applyPagination(data, options?.pagination);

    return { data, total };
  }

  async updateEntity(
    resource: string,
    id: string,
    variables: Record<string, unknown>,
  ): Promise<EntityRecord> {
    const def = this.requireDef(resource);
    const existing = await this.client.getNode(id);
    const existingDetails = (existing.nodeDetails ?? {}) as Record<
      string,
      unknown
    >;

    const merged = { ...existingDetails, ...variables };
    const title = this.buildTitle(def, merged, existing.title);

    this.updateSupplementaryAttributes(def, existingDetails, variables, id);

    const node = await this.client.updateNode(id, {
      title,
      nodeDetails: merged,
    }, existing);

    const record = this.normalize(node);
    this.logActivity("updated", resource, record);
    return record;
  }

  async deleteEntity(resource: string, id: string): Promise<{ id: string }> {
    const def = ENTITY_REGISTRY[resource];
    if (def?.relationships.length) {
      this.cleanupAttributes(id);
    }
    await this.client.deleteNode(id);
    this.logActivity("deleted", resource, { id } as EntityRecord);
    return { id };
  }

  private requireDef(resource: string): EntityDef {
    const def = ENTITY_REGISTRY[resource];
    if (!def) {
      throw new Error(
        `Unknown resource "${resource}" — not in entity registry`,
      );
    }
    return def;
  }

  private buildTitle(
    def: EntityDef,
    variables: Record<string, unknown>,
    fallback: string,
  ): string {
    const primary = variables[def.titleField];
    if (def.titleField === "firstName") {
      const last = variables["lastName"] ?? "";
      return String(primary ?? "") + (last ? ` ${last}` : "") || fallback;
    }
    return String(primary ?? variables.name ?? variables.title ?? fallback);
  }

  private validateRequired(
    def: EntityDef,
    variables: Record<string, unknown>,
    resource: string,
  ): void {
    const missing = def.requiredFields.filter(
      (f) =>
        variables[f] === undefined ||
        variables[f] === null ||
        variables[f] === "",
    );
    if (missing.length > 0) {
      throw new Error(
        `${resource}: missing required fields: ${missing.join(", ")}`,
      );
    }
  }

  private createSupplementaryAttributes(
    def: EntityDef,
    variables: Record<string, unknown>,
    sourceId: string,
  ): void {
    for (const rel of def.relationships) {
      const targetId = variables[rel.fkField];
      if (typeof targetId === "string" && targetId) {
        this.client
          .createAttribute(sourceId, targetId, rel.verb)
          .catch((err) => {
            console.warn(`[ECL] Attribute ${rel.verb} from ${sourceId} to ${targetId} failed:`, err);
          });
      }
    }
  }

  private updateSupplementaryAttributes(
    def: EntityDef,
    existingDetails: Record<string, unknown>,
    newVariables: Record<string, unknown>,
    nodeId: string,
  ): void {
    for (const rel of def.relationships) {
      const newTarget = newVariables[rel.fkField];
      if (newTarget === undefined) continue;
      const oldTarget = existingDetails[rel.fkField];
      if (newTarget === oldTarget) continue;

      this.client
        .getAttributes(nodeId)
        .then((attrs) => {
          const old = attrs.find(
            (a) =>
              a.attributeName === rel.verb &&
              a.targetNodeId === String(oldTarget),
          );
          if (old) this.client.deleteAttribute(old.id).catch((err) => {
            console.warn(`[ECL] Delete old attribute ${old.id} failed:`, err);
          });
        })
        .catch((err) => {
          console.warn(`[ECL] Get attributes for ${nodeId} failed:`, err);
        });

      if (typeof newTarget === "string" && newTarget) {
        this.client
          .createAttribute(nodeId, newTarget, rel.verb)
          .catch((err) => {
            console.warn(`[ECL] Create attribute ${rel.verb} from ${nodeId} to ${newTarget} failed:`, err);
          });
      }
    }
  }

  private cleanupAttributes(nodeId: string): void {
    this.client
      .getAttributes(nodeId)
      .then((attrs) =>
        Promise.all(
          attrs.map((a) => this.client.deleteAttribute(a.id).catch((err) => {
            console.warn(`[ECL] Cleanup attribute ${a.id} failed:`, err);
          })),
        ),
      )
      .catch((err) => {
        console.warn(`[ECL] Get attributes for cleanup ${nodeId} failed:`, err);
      });
  }

  private logActivity(
    action: string,
    resource: string,
    record: EntityRecord,
  ): void {
    if (SKIP_ACTIVITY_LOGGING.has(resource)) return;

    const entityType = resource.replace(/-/g, "_").replace(/s$/, "");
    const entityName =
      (record.name as string) ??
      (record.firstName
        ? `${record.firstName} ${record.lastName ?? ""}`.trim()
        : undefined) ??
      (record.title as string) ??
      String(record.id);

    const event = {
      action,
      entityType,
      entityId: record.id,
      entityName,
      performedBy: "user-1",
      organizationId:
        (record.organizationId as string) ??
        (resource === "organizations" ? record.id : undefined),
      _resourceType: "activity-events",
    };

    this.client
      .createNode(`${action} ${entityType}`, "REGULAR", event)
      .catch(() => {});
  }

  private normalize(node: MujarradNode): EntityRecord {
    const details = (node.nodeDetails ?? {}) as Record<string, unknown>;
    const envelope: Record<string, unknown> = {
      id: node.id,
      _title: node.title,
      _slug: node.slug,
      _nodeType: node.nodeType,
      _content: node.content,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
    if (!details.createdBy) envelope.createdBy = node.createdBy;
    if (!details.modifiedBy) envelope.modifiedBy = node.modifiedBy;
    return { ...envelope, ...details } as EntityRecord;
  }

  private applyFilters(
    data: EntityRecord[],
    filters?: CrudFilter[],
  ): EntityRecord[] {
    if (!filters?.length) return data;
    return data.filter((item) =>
      filters.every((f) => {
        if (!("field" in f)) return true;
        const val = item[f.field];
        if (f.operator === "eq") return val === f.value;
        if (f.operator === "ne") return val !== f.value;
        if (f.operator === "contains")
          return (
            typeof val === "string" &&
            val.toLowerCase().includes(String(f.value).toLowerCase())
          );
        if (f.operator === "in")
          return Array.isArray(f.value) && f.value.includes(val);
        return true;
      }),
    );
  }

  private applySorters(
    data: EntityRecord[],
    sorters?: CrudSort[],
  ): EntityRecord[] {
    if (!sorters?.length) return data;
    return [...data].sort((a, b) => {
      for (const s of sorters) {
        const aVal = a[s.field];
        const bVal = b[s.field];
        if (typeof aVal === "number" && typeof bVal === "number") {
          const cmp = aVal - bVal;
          if (cmp !== 0) return s.order === "desc" ? -cmp : cmp;
        } else {
          const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
          if (cmp !== 0) return s.order === "desc" ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  private applyPagination(
    data: EntityRecord[],
    pagination?: Pagination,
  ): EntityRecord[] {
    if (!pagination || pagination.mode === "off") return data;
    const page = pagination.currentPage ?? 1;
    const size = pagination.pageSize ?? 10;
    return data.slice((page - 1) * size, page * size);
  }
}
