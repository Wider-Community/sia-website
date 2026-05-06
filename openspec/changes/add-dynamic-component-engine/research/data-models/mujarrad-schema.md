# Mujarrad Node Schemas — Dynamic Component Engine

## Relationship Type Catalog

| Relationship | From | To | Semantics | Cardinality |
|-------------|------|----|-----------|----|
| `instance_of` | REGULAR (instance) | TEMPLATE (definition) | This instance is rendered according to this definition | N:1 |
| `belongs_to` | REGULAR (instance) | TEMPLATE (stage) | This component instance is placed in this stage | N:1 |
| `has_stage` | TEMPLATE (flow) | TEMPLATE (stage) | This flow contains this stage | 1:N |
| `transitions_to` | TEMPLATE (stage) | TEMPLATE (stage) | Possible next stage (with conditions on edge) | N:M |
| `composes` | TEMPLATE (composite) | TEMPLATE (child def) | This composite component contains this child | 1:N |
| `executing` | CONTEXT (session) | TEMPLATE (flow) | User is currently in this flow | N:1 |
| `at_stage` | CONTEXT (session) | TEMPLATE (stage) | User is currently at this stage | N:1 |
| `triggered_by` | TEMPLATE (notification) | TEMPLATE (stage/flow/component) | This notification fires on events from this source | N:M |
| `delivers_via` | TEMPLATE (notification) | TEMPLATE (channel) | This notification uses this delivery channel | N:M |
| `escalates_to` | TEMPLATE (escalation level) | TEMPLATE (next level) | Escalation chain progression | 1:1 |
| `discovered_from` | REGULAR (schema field) | REGULAR (source document) | This field was extracted from this document | N:1 |
| `matches_on` | REGULAR (match) | TEMPLATE (dimension) | This match was discovered on this dimension | N:M |

---

## Node Schemas

### Component Definition (TEMPLATE)

```json
{
  "nodeType": "TEMPLATE",
  "category": "component_definition",
  "schema": {
    "slug": {
      "type": "string",
      "description": "Human-readable unique identifier",
      "example": "sector-selector"
    },
    "componentCategory": {
      "type": "string",
      "enum": ["field", "composite", "layout", "action", "navigation"],
      "description": "Component classification"
    },
    "renderer": {
      "type": "string",
      "description": "Key into the React renderer registry",
      "example": "SectorTreeSelect"
    },
    "dataSchema": {
      "type": "object",
      "description": "JSON Schema 7 defining the data shape this component produces",
      "example": {
        "type": "object",
        "properties": {
          "primary": { "type": "string" },
          "sub": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["primary"]
      }
    },
    "defaultConfig": {
      "type": "object",
      "description": "Default configuration values for this component",
      "example": {
        "maxDepth": 3,
        "searchable": true,
        "allowMultiple": false
      }
    },
    "validations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rule": { "type": "string", "enum": ["required", "min", "max", "pattern", "custom"] },
          "value": {},
          "message_en": { "type": "string" },
          "message_ar": { "type": "string" }
        }
      }
    },
    "i18n": {
      "type": "object",
      "properties": {
        "en": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "placeholder": { "type": "string" },
            "helpText": { "type": "string" }
          }
        },
        "ar": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "placeholder": { "type": "string" },
            "helpText": { "type": "string" }
          }
        }
      }
    },
    "version": {
      "type": "integer",
      "description": "Incremented on every update; used for cache invalidation"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "deprecated"],
      "description": "Lifecycle status"
    }
  }
}
```

### Component Instance (REGULAR)

```json
{
  "nodeType": "REGULAR",
  "category": "component_instance",
  "schema": {
    "definitionId": {
      "type": "string",
      "description": "References the TEMPLATE component definition (also expressed as instance_of relationship)"
    },
    "configOverrides": {
      "type": "object",
      "description": "Instance-level overrides to the definition's defaultConfig",
      "example": {
        "maxDepth": 2,
        "searchable": false
      }
    },
    "i18nOverrides": {
      "type": "object",
      "description": "Instance-level label overrides (e.g., different placeholder text)"
    },
    "placement": {
      "type": "object",
      "properties": {
        "flowId": { "type": "string" },
        "stageId": { "type": "string" },
        "order": { "type": "integer", "description": "Position within stage (0-indexed)" }
      }
    },
    "visibility": {
      "type": "object",
      "description": "Conditional visibility rules",
      "properties": {
        "conditions": { "type": "array" },
        "logic": { "type": "string", "enum": ["AND", "OR"] }
      }
    }
  },
  "relationships": {
    "instance_of": "→ TEMPLATE (component_definition)",
    "belongs_to": "→ TEMPLATE (stage_definition)"
  }
}
```

### Flow Definition (TEMPLATE)

```json
{
  "nodeType": "TEMPLATE",
  "category": "flow_definition",
  "schema": {
    "slug": {
      "type": "string",
      "example": "org-matching-flow"
    },
    "entryStageId": {
      "type": "string",
      "description": "Starting stage node ID"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "name_en": { "type": "string" },
        "name_ar": { "type": "string" },
        "description": { "type": "string" },
        "owner": { "type": "string" },
        "purpose": { "type": "string" }
      }
    },
    "entryConditions": {
      "type": "array",
      "description": "Who can start this flow (role-based, relationship-based)",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["role", "relationship", "attribute"] },
          "value": {}
        }
      }
    },
    "version": { "type": "integer" },
    "status": { "type": "string", "enum": ["draft", "active", "archived"] }
  },
  "relationships": {
    "has_stage": "→ TEMPLATE[] (stage_definition)"
  }
}
```

### Stage Definition (TEMPLATE)

```json
{
  "nodeType": "TEMPLATE",
  "category": "stage_definition",
  "schema": {
    "slug": {
      "type": "string",
      "example": "basic-info"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "label_en": { "type": "string" },
        "label_ar": { "type": "string" },
        "description": { "type": "string" },
        "icon": { "type": "string" }
      }
    },
    "isTerminal": {
      "type": "boolean",
      "description": "If true, completing this stage ends the flow"
    },
    "componentOrder": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Ordered list of component instance IDs in this stage"
    }
  },
  "relationships": {
    "transitions_to": {
      "target": "→ TEMPLATE (stage_definition)",
      "edgeProperties": {
        "conditions": { "type": "array", "description": "BranchCondition[]" },
        "logic": { "type": "string", "enum": ["AND", "OR"] },
        "priority": { "type": "integer" }
      }
    },
    "uses_component": "→ REGULAR[] (component_instance)"
  }
}
```

### Flow Session (CONTEXT)

```json
{
  "nodeType": "CONTEXT",
  "category": "flow_session",
  "schema": {
    "flowId": { "type": "string" },
    "flowVersion": { "type": "integer", "description": "Pinned flow version at session start" },
    "userId": { "type": "string" },
    "currentStageId": { "type": "string" },
    "visitedStages": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Stage history for back-navigation"
    },
    "collectedData": {
      "type": "object",
      "description": "All data collected so far, keyed by stageId",
      "additionalProperties": true
    },
    "status": {
      "type": "string",
      "enum": ["active", "paused", "completed", "abandoned"]
    },
    "startedAt": { "type": "string", "format": "date-time" },
    "lastActivityAt": { "type": "string", "format": "date-time" },
    "completedAt": { "type": "string", "format": "date-time" }
  },
  "relationships": {
    "executing": "→ TEMPLATE (flow_definition)",
    "at_stage": "→ TEMPLATE (stage_definition)"
  }
}
```

### Notification Definition (TEMPLATE)

```json
{
  "nodeType": "TEMPLATE",
  "category": "notification_definition",
  "schema": {
    "slug": { "type": "string", "example": "deal-stage-advancement" },
    "trigger": {
      "type": "object",
      "properties": {
        "eventType": {
          "type": "string",
          "enum": ["flow.started", "flow.completed", "stage.entered", "stage.submitted",
                   "component.value_changed", "branch.selected", "match.discovered",
                   "data.threshold_breached", "schedule"]
        },
        "source": {
          "type": "object",
          "properties": {
            "flowId": { "type": "string", "description": "null = all flows" },
            "stageId": { "type": "string", "description": "null = all stages" },
            "componentId": { "type": "string", "description": "null = all components" }
          }
        },
        "filter": {
          "type": "array",
          "description": "Additional conditions on event payload"
        }
      }
    },
    "channels": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "channel": { "type": "string", "enum": ["in_app", "email", "push", "sms", "webhook", "slack"] },
          "config": { "type": "object" },
          "fallback": { "type": "string" }
        }
      }
    },
    "template": {
      "type": "object",
      "properties": {
        "en": {
          "type": "object",
          "properties": {
            "subject": { "type": "string" },
            "body": { "type": "string", "description": "Supports {{variable}} interpolation" },
            "actionUrl": { "type": "string" },
            "actionLabel": { "type": "string" }
          }
        },
        "ar": {
          "type": "object",
          "properties": {
            "subject": { "type": "string" },
            "body": { "type": "string" },
            "actionUrl": { "type": "string" },
            "actionLabel": { "type": "string" }
          }
        }
      }
    },
    "recipients": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["role", "user", "relationship", "dynamic"] },
        "roles": { "type": "array", "items": { "type": "string" } },
        "userIds": { "type": "array", "items": { "type": "string" } },
        "relationship": { "type": "string" }
      }
    },
    "escalation": {
      "type": "object",
      "properties": {
        "timeout": { "type": "integer", "description": "ms before escalation" },
        "maxEscalations": { "type": "integer" },
        "chain": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "level": { "type": "integer" },
              "recipientRule": { "type": "object" },
              "channelOverride": { "type": "string" }
            }
          }
        }
      }
    },
    "cooldown": { "type": "integer", "description": "Minimum ms between re-fires" },
    "enabled": { "type": "boolean" },
    "priority": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
    "version": { "type": "integer" }
  },
  "relationships": {
    "triggered_by": "→ TEMPLATE (stage/flow/component — event source)",
    "delivers_via": "→ TEMPLATE (channel_config)"
  }
}
```

### Discovered Schema (ASSUMPTION → promotes to TEMPLATE)

```json
{
  "nodeType": "ASSUMPTION",
  "category": "discovered_schema",
  "description": "Extracted from big-data; ASSUMPTION until validated by human/agent and promoted to TEMPLATE",
  "schema": {
    "sourceDocumentId": { "type": "string" },
    "extractedFields": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "inferredType": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "sampleValues": { "type": "array" },
          "suggestedRenderer": { "type": "string" },
          "suggestedAsMatchDimension": { "type": "boolean" }
        }
      }
    },
    "overallConfidence": { "type": "number" },
    "status": {
      "type": "string",
      "enum": ["pending_review", "approved", "rejected", "promoted"],
      "description": "promoted = converted to TEMPLATE component definitions"
    },
    "reviewedBy": { "type": "string" },
    "promotedDefinitionIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "TEMPLATE node IDs created from this schema after promotion"
    }
  },
  "relationships": {
    "discovered_from": "→ REGULAR (source document node)",
    "proposed_by": "→ agent identifier"
  }
}
```

### Match Discovery (REGULAR)

```json
{
  "nodeType": "REGULAR",
  "category": "match_discovery",
  "schema": {
    "orgAId": { "type": "string" },
    "orgBId": { "type": "string" },
    "dimensions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "dimensionName": { "type": "string" },
          "orgAValue": {},
          "orgBValue": {},
          "alignmentScore": { "type": "number", "minimum": 0, "maximum": 1 },
          "explanation": { "type": "string" }
        }
      }
    },
    "overallScore": { "type": "number" },
    "status": {
      "type": "string",
      "enum": ["discovered", "notified", "accepted", "rejected", "in_progress", "completed"]
    },
    "generatedFlowSessionId": {
      "type": "string",
      "description": "Flow session auto-created when match is accepted"
    }
  },
  "relationships": {
    "matches_on": "→ TEMPLATE[] (matching dimensions)",
    "between": "→ REGULAR[] (organization nodes)",
    "generates": "→ CONTEXT (flow session for deal progression)"
  }
}
```

---

## Schema Evolution Strategy

### Principle: Additive-Only at Node Level

```
Version 1:  { name, sector, size }
Version 2:  { name, sector, size, esgScore }         ← field added
Version 3:  { name, sector, size, esgScore, tags[] }  ← array field added
```

- New fields are added with `required: false` — existing instances unaffected
- Removed fields: mark `deprecated: true` in schema, stop rendering, but keep data
- Type changes: create new field, migrate data, deprecate old field (never mutate types)

### Discovery → Component Pipeline

```
Raw Document
    │
    ▼ (Extraction Agent)
Discovered Schema (ASSUMPTION node, confidence scored)
    │
    ▼ (Human Review in Control Board)
Approved Schema
    │
    ▼ (Promotion: ASSUMPTION → TEMPLATE)
Component Definition (TEMPLATE node, published)
    │
    ▼ (Auto-attach to relevant flows)
Component Instance (REGULAR node, placed in stage)
    │
    ▼ (Render)
User sees new field in their flow
```
