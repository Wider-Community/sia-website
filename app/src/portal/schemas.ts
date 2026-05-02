import { z } from "zod";

export const locationSchema = z.object({
  id: z.string(),
  country: z.string().min(1, "Country is required"),
  countryName: z.string().min(1),
  city: z.string().min(1, "City is required"),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean(),
});

export type OrgLocation = z.infer<typeof locationSchema>;

export const organizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["partner", "investor", "vendor", "client", "market_entity"], { message: "Type is required" }),
  status: z.enum(["active", "inactive", "prospect"], { message: "Status is required" }),
  locations: z.array(locationSchema).min(1, "At least one location is required").refine(
    (locs) => locs.filter((l) => l.isDefault).length === 1,
    { message: "Exactly one location must be default" }
  ),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  organizationId: z.string().optional(),
});

export const fileRecordSchema = z.object({
  name: z.string().min(1),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
  size: z.number().max(100 * 1024 * 1024, "File must be under 100MB"),
  r2ObjectKey: z.string().min(1),
  uploadedBy: z.string().min(1),
  organizationId: z.string().min(1),
  engagementId: z.string().optional(),
});

export const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty"),
  createdBy: z.string().min(1),
  organizationId: z.string().min(1),
  engagementId: z.string().optional(),
});

export const activityEventSchema = z.object({
  action: z.enum(["created", "updated", "deleted", "email_sent"]),
  entityType: z.enum(["organization", "contact", "file", "note", "task"]),
  entityId: z.string().min(1),
  entityName: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  performedBy: z.string().min(1),
  organizationId: z.string().optional(),
});

export const userSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  avatar: z.string().optional(),
  role: z.enum(["admin", "client"]),
  locale: z.string().optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

export type Organization = z.infer<typeof organizationSchema> & { id: string; createdAt: string; updatedAt: string };
export type Contact = z.infer<typeof contactSchema> & { id: string; createdAt: string; updatedAt: string };
export type FileRecord = z.infer<typeof fileRecordSchema> & { id: string; createdAt: string };
export type Note = z.infer<typeof noteSchema> & { id: string; createdAt: string };
export type ActivityEvent = z.infer<typeof activityEventSchema> & { id: string; createdAt: string };
export type User = z.infer<typeof userSchema> & { id: string; lastLoginAt?: string; createdAt: string; updatedAt: string };

// ── Signing ──

export const signingRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["draft", "sent", "partially_signed", "completed", "cancelled"]),
  pdfUrl: z.string().min(1, "PDF is required"),
  pdfFileName: z.string().min(1),
  message: z.string().optional(),
  createdBy: z.string().min(1),
  completedPdfUrl: z.string().optional(),
  organizationId: z.string().optional(),
  engagementId: z.string().optional(),
});

export const signatureFieldSchema = z.object({
  signingRequestId: z.string().min(1),
  signerId: z.string().min(1),
  page: z.number().int().min(1),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0).max(100),
  heightPct: z.number().min(0).max(100),
  signedImageUrl: z.string().optional(),
});

export const signerSchema = z.object({
  signingRequestId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  status: z.enum(["pending", "signed", "declined"]),
  token: z.string().min(1),
  signedAt: z.string().optional(),
  color: z.string().optional(),
  expiresAt: z.string().optional(),
  declineReason: z.string().optional(),
});

export type SigningRequest = z.infer<typeof signingRequestSchema> & { id: string; createdAt: string; updatedAt: string };
export type SignatureField = z.infer<typeof signatureFieldSchema> & { id: string; createdAt: string };
export type Signer = z.infer<typeof signerSchema> & { id: string; createdAt: string };

// ── Engagements ──

export const ENGAGEMENT_STAGES = ["prospect", "in_progress", "negotiating", "formalized", "active", "completed", "dormant"] as const;
export const ENGAGEMENT_CATEGORIES = ["deal", "project", "opportunity", "initiative", "regulatory", "diplomatic"] as const;

export const engagementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  organizationId: z.string().min(1, "Organization is required"),
  stage: z.enum(ENGAGEMENT_STAGES),
  category: z.enum(ENGAGEMENT_CATEGORIES),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assignedTo: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  value: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().min(1),
});

export type Engagement = z.infer<typeof engagementSchema> & { id: string; createdAt: string; updatedAt: string };

// ── Tasks ──

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  engagementId: z.string().optional(),
  engagementName: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["open", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema> & { id: string; createdAt: string; updatedAt: string };

// ── SLA Rules ──

export const slaRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  entityType: z.enum(["organization", "signing-request", "task"]),
  thresholdDays: z.coerce.number().min(1, "Must be at least 1 day"),
  description: z.string().optional(),
});

export type SLARule = z.infer<typeof slaRuleSchema> & { id: string; createdAt: string; updatedAt: string };

// ── Alerts ──

export const alertSchema = z.object({
  type: z.enum(["overdue", "at_risk", "info"]),
  title: z.string().min(1),
  message: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  read: z.boolean(),
});

export type Alert = z.infer<typeof alertSchema> & { id: string; createdAt: string; updatedAt: string };
