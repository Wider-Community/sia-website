# ERD: Sprint 1 Data Model

All entities are stored as Mujarrad nodes in space `sia-portal`. Relationships are Mujarrad node relationships.

## Entities (Mujarrad Nodes)

### User (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| email           | string   | yes      | Unique                                   |
| name            | string   | yes      | Display name                             |
| avatar          | string   | no       | URL to profile image                     |
| role            | string   | yes      | "admin" or "client"                      |
| locale          | string   | no       | e.g. "en", "ar". Default "en"            |
| theme           | string   | no       | "light" or "dark". Default "dark"        |
| lastLoginAt     | datetime | no       | Updated on each login                    |
| createdAt       | datetime | yes      | Auto-set                                 |
| updatedAt       | datetime | yes      | Auto-set                                 |

### Organization (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| name            | string   | yes      |                                          |
| type            | string   | yes      | e.g. "partner", "investor", "vendor"     |
| status          | string   | yes      | e.g. "active", "inactive", "prospect"    |
| country         | string   | no       |                                          |
| website         | string   | no       |                                          |
| description     | string   | no       |                                          |
| tags            | string[] | no       |                                          |
| createdAt       | datetime | yes      | Auto-set                                 |
| updatedAt       | datetime | yes      | Auto-set                                 |

### Contact (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| firstName       | string   | yes      |                                          |
| lastName        | string   | yes      |                                          |
| email           | string   | no       |                                          |
| phone           | string   | no       |                                          |
| role            | string   | no       | Role at the organization                 |
| createdAt       | datetime | yes      |                                          |
| updatedAt       | datetime | yes      |                                          |

### FileRecord (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| name            | string   | yes      | Original filename                        |
| mimeType        | string   | yes      | e.g. "application/pdf"                   |
| size            | number   | yes      | Bytes                                    |
| r2ObjectKey     | string   | yes      | Key in Cloudflare R2 bucket              |
| uploadedBy      | string   | yes      | User ID                                  |
| createdAt       | datetime | yes      |                                          |

### Note (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| content         | string   | yes      | Note text                                |
| createdBy       | string   | yes      | User ID                                  |
| createdAt       | datetime | yes      |                                          |

### ActivityEvent (REGULAR node)
| Attribute       | Type     | Required | Notes                                    |
|-----------------|----------|----------|------------------------------------------|
| id              | string   | yes      | Mujarrad node ID                         |
| action          | string   | yes      | e.g. "created", "updated", "deleted"     |
| entityType      | string   | yes      | e.g. "organization", "contact", "file"   |
| entityId        | string   | yes      | ID of the affected entity                |
| entityName      | string   | no       | Display name snapshot                    |
| details         | object   | no       | JSON with changed fields                 |
| performedBy     | string   | yes      | User ID                                  |
| createdAt       | datetime | yes      |                                          |

## Relationships

```
Organization --[has_contact]--> Contact       (1:N, a contact can belong to multiple orgs)
Organization --[has_file]-----> FileRecord    (1:N)
Organization --[has_note]-----> Note          (1:N)
Organization --[has_activity]-> ActivityEvent (1:N)
Contact      --[has_activity]-> ActivityEvent (0:N)
FileRecord   --[has_activity]-> ActivityEvent (0:N)
```

### Relationship Details
- `has_contact`: Organization → Contact. Bidirectional — Contact has `belongs_to` back-reference. One Contact node can be linked to multiple Organizations (shared contacts, no duplication).
- `has_file`: Organization → FileRecord. Scoped — each file belongs to one org.
- `has_note`: Organization → Note. Scoped — each note belongs to one org.
- `has_activity`: Any entity → ActivityEvent. ActivityEvent stores `entityType` + `entityId` for querying. The relationship provides org-level filtering.

## Mujarrad Contexts (Collections)
- `organizations` — Organization nodes
- `contacts` — Contact nodes
- `files` — FileRecord nodes
- `notes` — Note nodes
- `activity-events` — ActivityEvent nodes
