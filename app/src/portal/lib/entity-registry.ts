import type { NodeType } from "./mujarrad-client";

export interface RelationshipDef {
  targetResource: string;
  fkField: string;
  verb: string;
  direction: "outgoing" | "incoming";
}

export interface EntityDef {
  nodeType: NodeType;
  titleField: string;
  requiredFields: string[];
  relationships: RelationshipDef[];
}

export const ENTITY_REGISTRY: Record<string, EntityDef> = {
  organizations: {
    nodeType: "CONTEXT",
    titleField: "name",
    requiredFields: ["name", "type", "status"],
    relationships: [],
  },
  contacts: {
    nodeType: "CONTEXT",
    titleField: "firstName",
    requiredFields: ["firstName", "lastName"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  files: {
    nodeType: "REGULAR",
    titleField: "name",
    requiredFields: ["name", "mimeType", "size", "r2ObjectKey", "uploadedBy", "organizationId"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "belongs_to",
        direction: "outgoing",
      },
      {
        targetResource: "engagements",
        fkField: "engagementId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  notes: {
    nodeType: "REGULAR",
    titleField: "content",
    requiredFields: ["content", "createdBy", "organizationId"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "belongs_to",
        direction: "outgoing",
      },
      {
        targetResource: "engagements",
        fkField: "engagementId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  engagements: {
    nodeType: "REGULAR",
    titleField: "title",
    requiredFields: ["title", "organizationId", "stage", "category", "createdBy"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  tasks: {
    nodeType: "REGULAR",
    titleField: "title",
    requiredFields: ["title", "dueDate", "status", "priority"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "relates_to",
        direction: "outgoing",
      },
      {
        targetResource: "engagements",
        fkField: "engagementId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  "signing-requests": {
    nodeType: "REGULAR",
    titleField: "title",
    requiredFields: ["title", "status", "pdfUrl", "pdfFileName", "createdBy"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "belongs_to",
        direction: "outgoing",
      },
      {
        targetResource: "engagements",
        fkField: "engagementId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  "signature-fields": {
    nodeType: "REGULAR",
    titleField: "page",
    requiredFields: ["signingRequestId", "signerId", "page", "xPct", "yPct", "widthPct", "heightPct"],
    relationships: [
      {
        targetResource: "signing-requests",
        fkField: "signingRequestId",
        verb: "belongs_to",
        direction: "outgoing",
      },
      {
        targetResource: "signers",
        fkField: "signerId",
        verb: "assigned_to",
        direction: "outgoing",
      },
    ],
  },
  signers: {
    nodeType: "REGULAR",
    titleField: "name",
    requiredFields: ["signingRequestId", "name", "email", "status", "token"],
    relationships: [
      {
        targetResource: "signing-requests",
        fkField: "signingRequestId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  "activity-events": {
    nodeType: "REGULAR",
    titleField: "action",
    requiredFields: ["action", "entityType", "entityId", "performedBy"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationId",
        verb: "relates_to",
        direction: "outgoing",
      },
    ],
  },
  users: {
    nodeType: "CONTEXT",
    titleField: "name",
    requiredFields: ["email", "name", "role"],
    relationships: [],
  },
  "sla-rules": {
    nodeType: "REGULAR",
    titleField: "name",
    requiredFields: ["name", "entityType", "thresholdDays"],
    relationships: [],
  },
  alerts: {
    nodeType: "REGULAR",
    titleField: "title",
    requiredFields: ["type", "title", "message", "read"],
    relationships: [],
  },
  matches: {
    nodeType: "REGULAR",
    titleField: "matchReason",
    requiredFields: ["organizationAId", "organizationBId", "status", "matchScore", "matchReason", "category", "suggestedBy"],
    relationships: [
      {
        targetResource: "organizations",
        fkField: "organizationAId",
        verb: "matches_with",
        direction: "outgoing",
      },
      {
        targetResource: "organizations",
        fkField: "organizationBId",
        verb: "matches_with",
        direction: "outgoing",
      },
    ],
  },
  "component-definitions": {
    nodeType: "TEMPLATE",
    titleField: "slug",
    requiredFields: ["slug", "renderer", "componentCategory"],
    relationships: [],
  },
  "component-instances": {
    nodeType: "REGULAR",
    titleField: "definitionId",
    requiredFields: ["definitionId"],
    relationships: [
      {
        targetResource: "component-definitions",
        fkField: "definitionId",
        verb: "belongs_to",
        direction: "outgoing",
      },
    ],
  },
  "flow-definitions": {
    nodeType: "TEMPLATE",
    titleField: "slug",
    requiredFields: ["slug", "entryStageId"],
    relationships: [],
  },
  "flow-sessions": {
    nodeType: "CONTEXT",
    titleField: "flowId",
    requiredFields: ["flowId", "userId", "currentStageId", "status"],
    relationships: [
      {
        targetResource: "flow-definitions",
        fkField: "flowId",
        verb: "executing",
        direction: "outgoing",
      },
    ],
  },
  "notification-definitions": {
    nodeType: "TEMPLATE",
    titleField: "slug",
    requiredFields: ["slug", "trigger", "enabled"],
    relationships: [],
  },
  "permission-grants": {
    nodeType: "REGULAR",
    titleField: "permission",
    requiredFields: ["subjectType", "subjectId", "permission", "resourceType", "resourceId", "grantedBy"],
    relationships: [],
  },
  "role-assignments": {
    nodeType: "REGULAR",
    titleField: "role",
    requiredFields: ["userId", "role"],
    relationships: [],
  },
  "agent-suggestions": {
    nodeType: "ASSUMPTION",
    titleField: "title",
    requiredFields: ["type", "title", "suggestedBy"],
    relationships: [],
  },
  "publish-requests": {
    nodeType: "ASSUMPTION",
    titleField: "resourceName",
    requiredFields: ["resourceName", "resourceType", "resourceId", "description", "requestedBy"],
    relationships: [],
  },
  "notification-preferences": {
    nodeType: "REGULAR",
    titleField: "userId",
    requiredFields: ["userId", "globalMute", "categories", "defaultChannels"],
    relationships: [],
  },
};

export function getEntityDef(resource: string): EntityDef | undefined {
  return ENTITY_REGISTRY[resource];
}
