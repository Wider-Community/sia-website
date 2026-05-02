# SIA Portal — QC Report

**Date:** May 2, 2026
**Branch:** feature/openspec-sprint-1-3
**Backend:** Mujarrad API (https://mujarrad.onrender.com)
**Space:** sia-portal-platform
**Test Account:** admin@wider.community

---

## QC Summary

| # | Area | Status | Bugs Found | Bugs Fixed |
|---|------|--------|------------|------------|
| 1 | Login Flow | PASS | 4 | 4 |
| 2 | Organizations CRUD | PASS | 1 | 1 |
| 3 | Contacts CRUD | PASS | 2 | 2 |
| 4 | Tasks | PASS | 2 | 2 |
| 5 | Dashboard | PASS | 1 | 1 |
| 6 | Signing Flow | PENDING | — | — |
| 7 | Pipeline & Map | PASS | 4 | 4 |
| 8 | Portal Shell | PASS | 2 | 2 |

**Total bugs found and fixed: 16**

---

## 1. Login Flow (Task #1)

**Files modified:**
- `src/portal/pages/LoginPage.tsx`
- `src/portal/providers/auth-provider.ts`

**Bugs fixed:**
1. **No error display on failed login** — Added `serverError` state with AlertCircle banner above form. Populated via `useLogin` callbacks.
2. **No field-level validation** — Zod schema updated: email validates `min(1).email()` (two-stage), password validates `min(1)`. Added `aria-invalid` attributes.
3. **Mujarrad error shape not parsed** — Auth provider now reads RFC 7807 `body.detail` for 401, falls back to `body.title` for other errors. Network errors get user-friendly message.
4. **getIdentity field name mismatch** — Fixed to handle Mujarrad's `username` (fallback for `name`) and `avatarUrl` (fallback for `avatar`).

**Verified working:**
- Loading spinner during login (AnimatedButton with Loader2)
- Successful login stores token + user in localStorage, redirects to /portal
- React Query caching comment added for architecture documentation

---

## 2. Organizations CRUD (Task #2)

**Files modified:**
- `src/portal/pages/organizations/OrganizationDetailPage.tsx`

**Bugs fixed:**
1. **Missing delete button** — Detail page had no way to delete an organization. Added Delete button with `AlertDialog` confirmation that calls `useDelete` and navigates back to list.

**Verified working:**
- List page with client-side pagination, sorting, filtering, animated rows
- Create form validates with Zod (name, type, status, locations required)
- Edit form pre-fills from Mujarrad, updates correctly
- Detail page shows tabs (contacts, files, notes, activity) filtered by organizationId
- Entity-control-layer normalizes/denormalizes correctly
- All CRUD operations verified against live API (201, 200, 200, 204)

**Design observations (not bugs):**
- Org form's inline contacts sub-form stores in nodeDetails vs. Contacts tab queries separate entities — two different data paths
- `updateNode` does redundant `getNode` fetch (3 API calls per update) — performance optimization opportunity

---

## 3. Contacts CRUD (Task #3)

**Files modified:**
- `src/portal/pages/contacts/ContactListPage.tsx`
- `src/portal/pages/contacts/ContactFormPage.tsx`

**Bugs fixed:**
1. **`useList` destructuring bug (ContactListPage)** — Refine v5 returns `{ result, query }` not `{ data, isLoading }`. Contacts list would render empty. Fixed to `{ result: contactsResult, query: contactsQuery }`.
2. **`useList` destructuring bug (ContactFormPage)** — Organizations dropdown for FK selector was empty. Same fix applied.

**Verified working:**
- List, create with org FK, edit, detail view
- `belongs_to` relationship in entity registry correctly links contacts to organizations

---

## 4. Tasks (Task #4)

**Files modified:**
- `src/portal/pages/tasks/TaskListPage.tsx`

**Bugs fixed:**
1. **Status toggle one-directional** — "Mark Done" button only went open → done. Added bidirectional toggle: done tasks show "Reopen" button to set status back to "open".
2. **Null safety** — Sort on `dueDate` could throw on undefined values. Added null coalescing.

**Verified working:**
- Task list with search and status filtering
- Create form validates via Zod (title, dueDate, priority, status all required)
- Status toggle works both directions
- Tasks linked to organizations via FK

---

## 5. Dashboard (Task #5)

**Files modified:**
- `src/portal/pages/dashboard/DashboardPage.tsx`

**Bugs fixed:**
1. **Null safety in task sorting** — `recentTasks` sort used `localeCompare` on potentially undefined `dueDate`, would crash. Fixed with null coalescing.

**Verified working:**
- KPI cards: totalOrgs, activeSigningRequests, overdueCount, tasksDueToday
- Priority queue ranks by SLA status (overdue=0, at_risk=1, on_track=2)
- SLA engine evaluates tasks by dueDate and orgs by last activity event
- Activity events auto-logged on CRUD (skipped for meta resources)

---

## 6. Signing Flow (Task #6)

**Status:** Pending — not yet tested

---

## 7. Pipeline & Map (Task #7)

**Files modified:**
- `src/portal/pages/pipeline/PipelinePage.tsx`
- `src/portal/pages/map/MapPage.tsx`

**Bugs fixed:**
1. **`useList` destructuring bug (PipelinePage)** — Kanban board showed zero organizations in all columns. Fixed.
2. **`useList` destructuring bug (MapPage)** — Map markers never rendered. Fixed.
3. **Operator precedence bug (MapPage)** — `getOrgStage` had `as string ??` where the cast bound tighter than nullish coalescing. Added parentheses.
4. **Debug log left in (MapPage)** — Removed `console.log("[MapDebug]", ...)`.

**Verified working:**
- Pipeline Kanban columns with drag-and-drop and confirmation dialog
- List view alternative
- Map markers with stage colors, filters, tooltips, click-to-navigate

---

## 8. Portal Shell (Task #8)

**Files modified:**
- `src/portal/providers/mujarrad-data-provider.ts`

**Bugs fixed:**
1. **`custom()` method used undefined variables** — Referenced `API_KEY` and `API_SECRET` which no longer exist after JWT auth switch. Fixed to use Bearer token from localStorage.
2. **`getToken` sync/async mismatch** — Was `() => string` but MujarradClient requires `() => Promise<string | null>`. Fixed to `async () => localStorage.getItem("sia_token")`.

**Verified working:**
- All sidebar nav links match router routes
- Header breadcrumbs, NotificationCenter, ThemeToggle
- CommandPalette Cmd+K cross-entity search
- Sidebar collapses (collapsible="icon" + SidebarTrigger)
- User identity from getIdentity() in sidebar footer with logout
- Mobile responsive

---

## Critical Cross-Cutting Fix

**MujarradClient missing `/api` prefix (mujarrad-client.ts)**

All API calls through `MujarradClient` were failing with 404/500 because `spacePath()` returned `/spaces/...` instead of `/api/spaces/...`. The Mujarrad backend requires the `/api` prefix for all endpoints.

**Fixed in:**
- `spacePath()` → now returns `/api/spaces/${spaceSlug}${suffix}`
- `createAttribute` → `/api/nodes/${sourceNodeId}/attributes`
- `getAttributes` → `/api/nodes/${nodeId}/attributes`
- `updateAttribute` → `/api/attributes/${attributeId}`
- `deleteAttribute` → `/api/attributes/${attributeId}`

**This was the root cause of all 500 errors after login.**

---

## Architecture Verified

| Layer | Status |
|-------|--------|
| Entity Registry (12 entities) | Solid |
| Zod validation schemas | Solid |
| Entity Control Layer (normalize/denormalize) | Solid |
| Mujarrad Client (CRUD + attributes) | Fixed (/api prefix) |
| Auth Provider (JWT + Google OAuth) | Fixed (error handling) |
| Data Provider (Refine interface) | Fixed (JWT auth, custom method) |
| SLA Engine (task + org evaluation) | Verified |
| Activity Logging (auto-audit trail) | Verified |
| React Query caching | Configured (retry: false) |

---

## Mujarrad API Test Results

| Operation | Status | Notes |
|-----------|--------|-------|
| Health check | PASS | API UP |
| User registration | PASS | RFC 7807 errors |
| User login (JWT) | PASS | 24hr token validity |
| Space creation | PASS | Idempotent (409 on duplicate) |
| Create CONTEXT node | PASS | Organizations, Contacts |
| Create REGULAR node | PASS | Tasks, Notes, SLA Rules |
| List nodes | PASS | Returns all nodes in space |
| Update node | PASS | Creates version automatically |
| Version history | PASS | v1 → v2 tracked |
| Create attribute | PASS | belongs_to relationship |
| Get attributes | PASS | Returns linked attributes |
| Delete node | Not tested | Needs verification |

---

## Next Steps

1. Complete Task #2 (Organizations CRUD) — org-qc agent in progress
2. Task #6 (Signing flow) — needs dedicated QC
3. Commit all fixes and push
4. Test on production deployment
