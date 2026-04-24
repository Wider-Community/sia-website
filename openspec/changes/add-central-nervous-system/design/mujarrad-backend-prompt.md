# Mujarrad Backend Preparation — SIA Portal Requirements

## Context

The SIA Portal is a multi-user admin platform built with refine.dev (React). It uses Mujarrad as its sole data backend. A custom refine DataProvider will map all CRUD operations to Mujarrad's REST API.

There are two types of users:
- **Admin (Omar)** — Full access to everything. Manages all organizations, contacts, files, documents, tasks.
- **Client users** — One per client organization. They log in, see only their own organization's data, upload files, sign documents. They cannot see other organizations or system-wide data.

The portal is built across 3 sprints:
- **S1**: Organizations, contacts, files, notes, activity tracking, global search
- **S2**: Digital signature flow (signing requests, PDF viewing, signature capture, public signing pages)
- **S3**: Operations dashboard (tasks, SLA tracking, notifications, email compose)

Everything below needs to work in Mujarrad's space `sia-portal`.

---

## 1. User & Authentication

### User Model
Mujarrad needs to persist user records with these attributes:

| Attribute    | Type     | Notes                                         |
|-------------|----------|-----------------------------------------------|
| id          | string   | Mujarrad node ID                              |
| email       | string   | Unique, used for login                        |
| name        | string   | Display name                                  |
| avatar      | string   | Profile image URL (optional)                  |
| role        | string   | `"admin"` or `"client"`                       |
| locale      | string   | `"en"`, `"ar"`, etc. Default `"en"`           |
| theme       | string   | `"light"` or `"dark"`. Default `"dark"`       |
| lastLoginAt | datetime | Updated on each login                         |
| createdAt   | datetime | Auto-set                                      |
| updatedAt   | datetime | Auto-set                                      |

### Auth Endpoints Required

**Existing (verify still works):**
- `POST /api/auth/oauth/google` with `{ idToken }` → `{ token, user, isNewUser }`

**New:**
- `POST /api/auth/login` with `{ email, password }` → `{ token, user }`
- `POST /api/auth/register` with `{ email, password, name }` → `{ token, user }` — Admin creates client accounts, or clients self-register via invite link
- `GET /api/auth/me` → Returns the full user profile of the authenticated user (decoded from JWT Bearer token)
- `PATCH /api/auth/me` with `{ name?, avatar?, locale?, theme? }` → Updates profile fields, returns updated user
- `POST /api/auth/refresh` with `{ refreshToken }` → `{ token, refreshToken }` — Optional but recommended for long sessions

### JWT Requirements
The JWT payload should include at minimum: `userId`, `email`, `role`, `exp`. The frontend stores it in localStorage and sends it as `Authorization: Bearer <token>` on every request.

---

## 2. Multi-User Access Control

This is critical. Client users must only see their own organization's data.

### Organization-User Relationship
- Each client user is linked to one or more organizations via a `member_of` relationship: `User --[member_of]--> Organization`
- Admin users bypass all access checks — they see everything
- When a client user calls `GET /api/spaces/sia-portal/nodes?context=organizations`, they should only receive organizations they are a `member_of`

### Access Control Options (pick one)

**Option A — Backend-enforced filtering:**
Every `getList` / `getOne` call automatically filters by the authenticated user's organization memberships. Client users never receive data they shouldn't see. This is the safest approach.

**Option B — Frontend-filtered, backend-verified:**
The frontend sends the organization ID with each request. The backend verifies the authenticated user is a member of that organization before returning data. Reject with `403` if not.

**Recommendation:** Option A is strongly preferred. The frontend will also filter via refine's `accessControlProvider`, but the backend must be the source of truth for security.

### What Gets Scoped to an Organization
These entities are always accessed through an organization. A client user should only see entities linked to their organization(s):

- Contacts (linked via `has_contact`)
- FileRecords (linked via `has_file`)
- Notes (linked via `has_note`)
- ActivityEvents (linked via `has_activity`)
- SigningRequests (S2, linked via `has_signing_request`)
- Tasks (S3, linked via `has_task`)

---

## 3. Node CRUD Endpoints

### Basic CRUD (verify/confirm these work)
- `POST /api/spaces/sia-portal/nodes` — Create node with `{ context, type, nodeDetails }`
- `GET /api/spaces/sia-portal/nodes/{id}` — Get single node
- `PATCH /api/spaces/sia-portal/nodes/{id}` — Update node with `{ nodeDetails }`
- `DELETE /api/spaces/sia-portal/nodes/{id}` — Delete node

### List with Filtering, Sorting, Pagination
The frontend data table needs to fetch lists of nodes with query parameters:

```
GET /api/spaces/sia-portal/nodes?context=organizations&filter[status]=active&filter[type]=partner&sort=-createdAt&page=1&limit=10
```

**Filtering operators needed:**

| Operator   | Example                              | Meaning                        |
|-----------|--------------------------------------|--------------------------------|
| `eq`      | `filter[status]=active`              | status equals "active"         |
| `ne`      | `filter[status][ne]=inactive`        | status not equal "inactive"    |
| `contains`| `filter[name][contains]=acme`        | name contains "acme"           |
| `in`      | `filter[type][in]=partner,investor`  | type is one of these values    |
| `gt`/`gte`| `filter[createdAt][gte]=2026-01-01`  | created on or after date       |
| `lt`/`lte`| `filter[createdAt][lt]=2026-04-01`   | created before date            |

**Sorting:**
- `sort=name` — ascending by name
- `sort=-createdAt` — descending by createdAt
- `sort=-status,name` — multi-field: descending status, then ascending name

**Pagination:**
- `page=1&limit=10` — page number and page size
- Response must include `total` count:
```json
{
  "data": [...nodes...],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

**If full filtering/sorting is too much work right now**, the minimum viable version is:
1. Pagination with `total` count (required — blocks table UI)
2. Filter by `context` (required — already exists?)
3. Everything else can be done client-side temporarily

---

## 4. Relationship Endpoints

Relationships link nodes together (e.g., Organization → Contact, User → Organization).

**Create relationship:**
```
POST /api/spaces/sia-portal/relationships
{ "from": "org-123", "to": "contact-456", "type": "has_contact" }
```

**Get related nodes:**
```
GET /api/spaces/sia-portal/nodes/{orgId}/relationships/has_contact
→ Returns all Contact nodes linked to this organization
```

**Delete relationship (without deleting nodes):**
```
DELETE /api/spaces/sia-portal/relationships/{relationshipId}
```
Or:
```
DELETE /api/spaces/sia-portal/relationships?from={orgId}&to={contactId}&type=has_contact
```

**Bulk creation:**
When creating an organization with contacts, the frontend needs to:
1. Create the Organization node
2. Create each Contact node
3. Create `has_contact` relationships linking them

Ideally this is a single transactional call. If not possible, individual calls are fine — the frontend will handle sequencing.

### Relationship Types Needed

| Type                  | From           | To              | Sprint |
|-----------------------|----------------|-----------------|--------|
| `has_contact`         | Organization   | Contact         | S1     |
| `has_file`            | Organization   | FileRecord      | S1     |
| `has_note`            | Organization   | Note            | S1     |
| `has_activity`        | Organization   | ActivityEvent   | S1     |
| `member_of`           | User           | Organization    | S1     |
| `has_signing_request` | Organization   | SigningRequest   | S2     |
| `has_signer`          | SigningRequest | Signer          | S2     |
| `has_signature_field` | SigningRequest | SignatureField   | S2     |
| `has_task`            | Organization   | Task            | S3     |
| `has_sla_rule`        | Organization   | SLARule         | S3     |

---

## 5. Contexts (Collections) to Create

Create these contexts in space `sia-portal`:

**S1 (now):**
- `users`
- `organizations`
- `contacts`
- `files`
- `notes`
- `activity-events`

**S2 (next):**
- `signing-requests`
- `signature-fields`
- `signers`

**S3 (later):**
- `tasks`
- `sla-rules`
- `alerts`

---

## 6. API Documentation

Generate API documentation (Swagger/OpenAPI, Postman collection, or markdown) covering:
- All node CRUD endpoints with request/response examples
- Relationship endpoints with examples
- Auth endpoints (login, register, OAuth, me, refresh)
- Query parameter reference (filtering, sorting, pagination)
- Error response format and status codes (400, 401, 403, 404, 422, 500)
- Rate limiting details if any

This documentation is the contract between Mujarrad and the SIA Portal frontend. Without it, the DataProvider has to be built by trial and error.

---

## Priority Order

1. **Pagination with total count** on node listing — blocks all table UIs
2. **Relationship queries** (get related nodes, create/delete relationships) — blocks organization detail page
3. **User model + `GET /api/auth/me`** — blocks profile display and access control
4. **Multi-user access control** (user-org scoping) — blocks client user access
5. **Filtering and sorting** on node listing — can be client-side temporarily
6. **Context creation** in `sia-portal` space
7. **API documentation**

---

## Technical Notes

- All API calls come from the browser as client-side fetch requests (not server-to-server)
- Auth is Bearer JWT in the `Authorization` header
- CORS must allow requests from the portal's domain
- The frontend expects JSON responses with consistent structure
- Error responses should include a `message` field for display to the user
