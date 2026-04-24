import type { DataProvider, BaseRecord, CrudFilter, LogicalFilter, CrudSort } from "@refinedev/core";

type MockRecord = BaseRecord & { id: string; [key: string]: unknown };

const STORAGE_KEY = "sia_portal_data";

function loadStore(): Map<string, MockRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    }
  } catch { /* ignore */ }
  return new Map();
}

function saveStore(): void {
  try {
    const obj = Object.fromEntries(store);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

const store: Map<string, MockRecord[]> = loadStore();

function getCollection(resource: string): MockRecord[] {
  if (!store.has(resource)) store.set(resource, []);
  return store.get(resource)!;
}

function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLogicalFilter(f: CrudFilter): f is LogicalFilter {
  return "field" in f;
}

function matchesFilters(item: MockRecord, filters?: CrudFilter[]): boolean {
  if (!filters?.length) return true;
  return filters.every((f) => {
    if (!isLogicalFilter(f)) return true;
    const val = item[f.field];
    switch (f.operator) {
      case "eq": return val === f.value;
      case "ne": return val !== f.value;
      case "contains": return typeof val === "string" && val.toLowerCase().includes(String(f.value).toLowerCase());
      case "in": return Array.isArray(f.value) && f.value.includes(val);
      default: return true;
    }
  });
}

function applySorters(data: MockRecord[], sorters?: CrudSort[]): MockRecord[] {
  if (!sorters?.length) return data;
  return [...data].sort((a, b) => {
    for (const s of sorters) {
      const aVal = String(a[s.field] ?? "");
      const bVal = String(b[s.field] ?? "");
      const cmp = aVal.localeCompare(bVal);
      if (cmp !== 0) return s.order === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockDataProvider: DataProvider = {
  getApiUrl: () => "mock://",

  async getList({ resource, pagination, filters, sorters }) {
    let data = getCollection(resource).filter((item) => matchesFilters(item, filters));
    data = applySorters(data, sorters);
    const total = data.length;
    const currentPage = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    if (pagination?.mode !== "off") {
      const start = (currentPage - 1) * pageSize;
      data = data.slice(start, start + pageSize);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: data as any, total };
  },

  async getOne({ resource, id }) {
    const item = getCollection(resource).find((r) => r.id === id);
    if (!item) throw new Error(`${resource}/${id} not found`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: item as any };
  },

  async create({ resource, variables }) {
    const item: MockRecord = { ...(variables as MockRecord), id: (variables as MockRecord).id ?? generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    getCollection(resource).push(item);
    logActivity("created", resource, item);
    saveStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: item as any };
  },

  async update({ resource, id, variables }) {
    const col = getCollection(resource);
    const idx = col.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`${resource}/${id} not found`);
    col[idx] = { ...col[idx], ...(variables as MockRecord), updatedAt: new Date().toISOString() };
    logActivity("updated", resource, col[idx]);
    saveStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: col[idx] as any };
  },

  async deleteOne({ resource, id }) {
    const col = getCollection(resource);
    const idx = col.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`${resource}/${id} not found`);
    const [deleted] = col.splice(idx, 1);
    logActivity("deleted", resource, deleted);
    saveStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: deleted as any };
  },

  getMany: undefined,

  async custom() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: {} as any };
  },
};

const SKIP_LOGGING = new Set(["activity-events", "users"]);

function logActivity(action: string, resource: string, record: MockRecord) {
  if (SKIP_LOGGING.has(resource)) return;
  const singular = resource.replace(/s$/, "");
  const entityName = (record.name as string) ?? (record.firstName ? `${record.firstName} ${record.lastName}` : record.id);
  getCollection("activity-events").unshift({
    id: generateId(),
    action,
    entityType: singular,
    entityId: record.id,
    entityName,
    organizationId: (record.organizationId as string) ?? (singular === "organization" ? record.id : undefined),
    performedBy: "user-1",
    createdAt: new Date().toISOString(),
  });
}

// Seed only if no data exists
function seed() {
  const orgs = getCollection("organizations");
  if (orgs.length > 0) return;

  const seedOrgs: MockRecord[] = [
    { id: "org-1", name: "Abu Dhabi Investment Authority", type: "investor", status: "active", country: "UAE", website: "https://adia.ae", description: "Sovereign wealth fund", tags: ["sovereign", "institutional"], createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-04-01T10:00:00Z" },
    { id: "org-2", name: "Saudi Aramco Ventures", type: "partner", status: "active", country: "Saudi Arabia", website: "https://aramco.com", description: "Corporate venture arm", tags: ["energy", "corporate"], createdAt: "2026-02-01T10:00:00Z", updatedAt: "2026-03-15T10:00:00Z" },
    { id: "org-3", name: "Dubai Future Foundation", type: "partner", status: "prospect", country: "UAE", website: "https://dubaifuture.gov.ae", description: "Government innovation entity", tags: ["government", "innovation"], createdAt: "2026-03-01T10:00:00Z", updatedAt: "2026-04-10T10:00:00Z" },
    { id: "org-4", name: "Mubadala Investment Company", type: "investor", status: "active", country: "UAE", website: "https://mubadala.com", description: "Sovereign investor", tags: ["sovereign", "diversified"], createdAt: "2026-01-20T10:00:00Z", updatedAt: "2026-04-20T10:00:00Z" },
    { id: "org-5", name: "NEOM Tech & Digital", type: "vendor", status: "inactive", country: "Saudi Arabia", website: "https://neom.com", description: "Smart city tech division", tags: ["technology", "smart-city"], createdAt: "2026-02-15T10:00:00Z", updatedAt: "2026-03-01T10:00:00Z" },
  ];
  orgs.push(...seedOrgs);

  const contacts = getCollection("contacts");
  contacts.push(
    { id: "contact-1", firstName: "Ahmed", lastName: "Al Maktoum", email: "ahmed@adia.ae", phone: "+971501234567", role: "Managing Director", organizationId: "org-1", createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-01-15T10:00:00Z" },
    { id: "contact-2", firstName: "Fatima", lastName: "Al Saud", email: "fatima@aramco.com", phone: "+966501234567", role: "VP Investments", organizationId: "org-2", createdAt: "2026-02-01T10:00:00Z", updatedAt: "2026-02-01T10:00:00Z" },
    { id: "contact-3", firstName: "Omar", lastName: "Khalifa", email: "omar@dubaifuture.ae", phone: "+971509876543", role: "Director", organizationId: "org-3", createdAt: "2026-03-01T10:00:00Z", updatedAt: "2026-03-01T10:00:00Z" },
    { id: "contact-4", firstName: "Sara", lastName: "Hassan", email: "sara@mubadala.com", phone: "+971502345678", role: "Investment Analyst", organizationId: "org-4", createdAt: "2026-01-20T10:00:00Z", updatedAt: "2026-01-20T10:00:00Z" },
    { id: "contact-5", firstName: "Khalid", lastName: "bin Rashid", email: "khalid@neom.com", phone: "+966509876543", role: "CTO", organizationId: "org-5", createdAt: "2026-02-15T10:00:00Z", updatedAt: "2026-02-15T10:00:00Z" },
  );

  const files = getCollection("files");
  files.push(
    { id: "file-1", name: "ADIA_Partnership_Agreement.pdf", mimeType: "application/pdf", size: 2450000, r2ObjectKey: "orgs/org-1/adia-partnership.pdf", uploadedBy: "user-1", organizationId: "org-1", createdAt: "2026-02-10T10:00:00Z" },
    { id: "file-2", name: "Aramco_MOU_Draft.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1200000, r2ObjectKey: "orgs/org-2/aramco-mou.docx", uploadedBy: "user-1", organizationId: "org-2", createdAt: "2026-03-05T10:00:00Z" },
    { id: "file-3", name: "DFF_Innovation_Report.pdf", mimeType: "application/pdf", size: 5600000, r2ObjectKey: "orgs/org-3/dff-report.pdf", uploadedBy: "user-1", organizationId: "org-3", createdAt: "2026-03-20T10:00:00Z" },
  );

  const notes = getCollection("notes");
  notes.push(
    { id: "note-1", content: "Initial meeting went well. Ahmed expressed interest in Series A participation.", createdBy: "user-1", organizationId: "org-1", createdAt: "2026-01-16T14:00:00Z" },
    { id: "note-2", content: "MOU draft sent to Fatima for review. Follow up by end of March.", createdBy: "user-1", organizationId: "org-2", createdAt: "2026-03-06T09:00:00Z" },
    { id: "note-3", content: "NEOM partnership on hold due to restructuring.", createdBy: "user-1", organizationId: "org-5", createdAt: "2026-03-01T16:00:00Z" },
  );

  const events = getCollection("activity-events");
  events.push(
    { id: "event-1", action: "created", entityType: "organization", entityId: "org-1", entityName: "Abu Dhabi Investment Authority", performedBy: "user-1", createdAt: "2026-01-15T10:00:00Z" },
    { id: "event-2", action: "created", entityType: "organization", entityId: "org-2", entityName: "Saudi Aramco Ventures", performedBy: "user-1", createdAt: "2026-02-01T10:00:00Z" },
    { id: "event-3", action: "created", entityType: "file", entityId: "file-1", entityName: "ADIA_Partnership_Agreement.pdf", performedBy: "user-1", details: { organizationId: "org-1" }, createdAt: "2026-02-10T10:00:00Z" },
    { id: "event-4", action: "updated", entityType: "organization", entityId: "org-5", entityName: "NEOM Tech & Digital", performedBy: "user-1", details: { status: { from: "active", to: "inactive" } }, createdAt: "2026-03-01T16:00:00Z" },
  );

  const users = getCollection("users");
  users.push(
    { id: "user-1", email: "board@wider.community", name: "Omar", avatar: "", role: "admin", locale: "en", theme: "dark", lastLoginAt: "2026-04-24T10:00:00Z", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-04-24T10:00:00Z" },
  );

  saveStore();
}

seed();
