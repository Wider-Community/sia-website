# SIA Platform — Open-Source Overlap Matrix

**Version:** 1.0
**Date:** April 2026
**Purpose:** Identify every feature overlap between the 11 tools in the distilled stack so we make deliberate choices about which tool owns which capability.

---

## 1. Overlap Matrix

A checkmark means the tool provides that capability. **Bold** marks the recommended owner.

| Capability | refine.dev | shadcn-admin | react-dropzone | react-pdf | pdf-lib | signature_pad | react-signature-canvas | @dnd-kit | react-email | react-chrono | recharts | sonner | libreoffice-convert |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Data fetching / CRUD** | **YES** | - | - | - | - | - | - | - | - | - | - | - | - |
| **Auth (login/logout/permissions)** | **YES** | YES | - | - | - | - | - | - | - | - | - | - | - |
| **Access control (RBAC)** | **YES** | - | - | - | - | - | - | - | - | - | - | - | - |
| **Routing / resource definitions** | YES | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Form handling** | YES | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Form validation (Zod)** | YES | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Data tables (sort/filter/paginate)** | YES | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Toast notifications** | YES | YES | - | - | - | - | - | - | - | - | - | **YES** | - |
| **App shell / sidebar / layout** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Command palette / global search** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Dark/light theme** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Error pages (401/403/404/500)** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Settings pages** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **Charts / analytics** | - | YES | - | - | - | - | - | - | - | - | **YES** | - | - |
| **RTL layout support** | - | **YES** | - | - | - | - | - | - | - | - | - | - | - |
| **i18n (translations)** | YES | - | - | - | - | - | - | - | - | YES | - | - | - |
| **Audit log** | **YES** | - | - | - | - | - | - | - | - | - | - | - | - |
| **Real-time / live updates** | **YES** | - | - | - | - | - | - | - | - | - | - | - | - |
| **File upload (drag-and-drop)** | - | - | **YES** | - | - | - | - | - | - | - | - | - | - |
| **PDF viewing** | - | - | - | **YES** | - | - | - | - | - | - | - | - | - |
| **PDF creation / modification** | - | - | - | - | **YES** | - | - | - | - | - | - | - | - |
| **Signature capture (draw)** | - | - | - | - | - | **YES** | YES | - | - | - | - | - | - |
| **Signature React wrapper** | - | - | - | - | - | - | **YES** | - | - | - | - | - | - |
| **Drag-and-drop / sortable** | - | - | - | - | - | - | - | **YES** | - | - | - | - | - |
| **Email templates** | - | - | - | - | - | - | - | - | **YES** | - | - | - | - |
| **Activity timeline** | - | - | - | - | - | - | - | - | - | **YES** | - | - | - |
| **Document format conversion** | - | - | - | - | - | - | - | - | - | - | - | - | **YES** |

---

## 2. Overlap Details — Conflicts & Resolutions

### OVERLAP 1: Authentication
**Who provides it:** refine.dev + shadcn-admin

| Aspect | refine.dev | shadcn-admin |
|--------|-----------|-------------|
| Auth provider interface | Full (login/logout/register/forgot/2FA/identity/permissions) | None (just UI pages) |
| Auth UI pages | Basic (via shadcn integration) | Complete (sign-in x2 variants, sign-up, forgot-password, OTP) |
| Auth state store | Via auth provider hooks | Zustand auth-store.ts |
| Google OAuth | Supported via provider | Not included |

**Resolution:** Use **refine's auth provider** for the logic (hooks, state, token management, Mujarrad integration). Use **shadcn-admin's auth pages** for the UI (polished sign-in/sign-up/OTP screens). Delete shadcn-admin's Zustand auth store — refine's `useGetIdentity`/`useIsAuthenticated` replaces it.

---

### OVERLAP 2: Routing
**Who provides it:** refine.dev + shadcn-admin

| Aspect | refine.dev | shadcn-admin |
|--------|-----------|-------------|
| Router | Supports React Router, TanStack Router, Next.js | TanStack Router (file-based) |
| Resource routing | Automatic CRUD route generation from resource definitions | Manual route definitions |
| Route guards | `<Authenticated>` component, `authProvider.check()` | Manual auth guard in `_authenticated/route.tsx` |

**Resolution:** Use **refine's resource-based routing** with React Router (already in our app). Adopt **shadcn-admin's layout structure** (sidebar nav groups, authenticated layout wrapper) but wire routes through refine's resource definitions. Do not use TanStack Router — we already use React Router.

---

### OVERLAP 3: Forms + Validation
**Who provides it:** refine.dev + shadcn-admin

| Aspect | refine.dev | shadcn-admin |
|--------|-----------|-------------|
| Form library | `@refinedev/react-hook-form` (wraps RHF with CRUD awareness) | react-hook-form + Zod directly |
| Validation | Zod via `@hookform/resolvers` | Same |
| CRUD integration | `useForm` auto-calls `create`/`update` on data provider | Manual API calls |
| Form components | Via shadcn/ui integration | Full shadcn form components (form.tsx, password-input, date-picker, select-dropdown) |

**Resolution:** Use **refine's `useForm`** for all CRUD forms (organizations, contacts, tasks, signing requests) — it handles create/update/data-provider integration automatically. Use **shadcn-admin's form UI components** (password-input, date-picker, select-dropdown) for the visual layer.

---

### OVERLAP 4: Data Tables
**Who provides it:** refine.dev + shadcn-admin

| Aspect | refine.dev | shadcn-admin |
|--------|-----------|-------------|
| Table library | `useTable` hook (wraps TanStack Table with data provider) | TanStack Table directly |
| Server-side pagination | Built-in via data provider | Manual with URL state sync |
| Sorting/filtering | Built-in | Built-in (column-header, faceted-filter, toolbar) |
| UI components | Via shadcn integration | Full set (7 reusable data-table components) |
| Bulk actions | Supported | Built-in (bulk-actions.tsx) |

**Resolution:** Use **refine's `useTable`** for data fetching (pagination, sort, filter against Mujarrad). Use **shadcn-admin's table UI components** (column-header, toolbar, faceted-filter, pagination, bulk-actions) for the visual layer.

---

### OVERLAP 5: Toast Notifications
**Who provides it:** refine.dev + shadcn-admin + sonner

| Aspect | refine.dev | shadcn-admin | sonner |
|--------|-----------|-------------|-------|
| API | `useNotification` hook + notification provider | Sonner integration | `toast()` function |
| Toast types | success, error, open, close | Via sonner | success, error, warning, info, loading, promise, custom |
| UI | Delegates to provider (Ant Design, MUI, or custom) | Sonner component | Own styled toasts |

**Resolution:** Use **sonner** as the toast renderer (already in shadcn-admin). Wire refine's **notification provider** to call sonner's `toast()` — this is a ~10 line adapter. All three systems converge on sonner as the single toast UI.

---

### OVERLAP 6: Charts
**Who provides it:** shadcn-admin + recharts

| Aspect | shadcn-admin | recharts |
|--------|-------------|---------|
| Charts | Uses recharts internally | The library itself |

**Resolution:** No conflict — **recharts IS the library** that shadcn-admin uses. One dependency, one usage.

---

### OVERLAP 7: Signature Capture
**Who provides it:** signature_pad + react-signature-canvas

| Aspect | signature_pad | react-signature-canvas |
|--------|-------------|----------------------|
| Role | Core engine (Bezier drawing, export) | React wrapper (~150 LOC) |
| Canvas access | Direct | Via `getCanvas()`, `getTrimmedCanvas()` |

**Resolution:** No conflict — **react-signature-canvas wraps signature_pad**. Install react-signature-canvas, which brings signature_pad as a dependency. One API surface.

---

### OVERLAP 8: i18n
**Who provides it:** refine.dev + react-chrono + (react-i18next already in stack)

| Aspect | refine.dev | react-chrono | react-i18next |
|--------|-----------|-------------|--------------|
| i18n | `useTranslate` hook + i18n provider | 60+ configurable text strings | Full translation framework |

**Resolution:** Use **react-i18next** (already installed) as the single i18n system. Wire refine's **i18n provider** to delegate to react-i18next. Configure react-chrono's text strings from i18next translations.

---

### OVERLAP 9: Drag-and-Drop
**Who provides it:** @dnd-kit (used by refine internally in some examples)

**Resolution:** No real conflict. Install **@dnd-kit** once. Both our signature field placement (Sprint 2) and any future Kanban (Sprint 4) use the same library instance.

---

## 3. Zero-Overlap Tools (Unique Capabilities)

These tools provide capabilities that NO other tool in the stack covers:

| Tool | Unique Capability | No Alternative In Stack |
|------|-------------------|------------------------|
| **react-dropzone** | Drag-and-drop file selection with validation | Refine has basic file input, not drag-drop UX |
| **react-pdf** (wojtekmaj) | Render PDFs in-browser | Nothing else does this |
| **pdf-lib** | Modify existing PDFs (embed images, text, forms) | Nothing else does this |
| **react-email** | Build email templates as React components | Nothing else does this |
| **react-chrono** | Visual timeline component | Nothing else does this |
| **libreoffice-convert** | Server-side DOCX/XLSX/PPTX to PDF conversion | Nothing else does this |

---

## 4. Final Ownership Map

Who owns what — the definitive answer for every capability:

| Capability | Owner | Runner-Up (use for UI/fallback) |
|-----------|-------|-------------------------------|
| Data fetching / CRUD | **refine.dev** | — |
| Auth logic (hooks, state, tokens) | **refine.dev** | — |
| Auth UI (login/signup pages) | **shadcn-admin** | — |
| Access control (RBAC) | **refine.dev** | — |
| Routing | **refine.dev** (resource definitions) | shadcn-admin (layout structure) |
| Forms (CRUD-connected) | **refine.dev** (`useForm`) | shadcn-admin (UI components) |
| Forms (standalone/settings) | **shadcn-admin** (RHF + Zod) | — |
| Data tables (data layer) | **refine.dev** (`useTable`) | — |
| Data tables (UI components) | **shadcn-admin** (7 table components) | — |
| App shell / sidebar / nav | **shadcn-admin** | — |
| Command palette | **shadcn-admin** (cmdk) | — |
| Theme (dark/light) | **shadcn-admin** | — |
| Error pages | **shadcn-admin** | — |
| Settings pages | **shadcn-admin** | — |
| Toast notifications | **sonner** (via refine notification provider adapter) | — |
| Charts | **recharts** (via shadcn-admin) | — |
| RTL layout | **shadcn-admin** | — |
| i18n translations | **react-i18next** (via refine i18n provider adapter) | — |
| Audit log | **refine.dev** | — |
| Real-time updates | **refine.dev** | — |
| File upload UX | **react-dropzone** | — |
| PDF viewing | **react-pdf** (wojtekmaj) | — |
| PDF modification | **pdf-lib** | — |
| Signature capture | **react-signature-canvas** (wraps signature_pad) | — |
| Drag-and-drop | **@dnd-kit** | — |
| Email templates | **react-email** | — |
| Activity timeline | **react-chrono** | — |
| Document conversion | **libreoffice-convert** | — |

---

## 5. Integration Points

Where tools need to be wired together:

| Integration | What To Build | Effort |
|------------|---------------|--------|
| refine notification provider -> sonner | Adapter: `useNotification` calls `toast()` | ~10 lines |
| refine i18n provider -> react-i18next | Adapter: `useTranslate` delegates to `i18next.t()` | ~15 lines |
| refine auth provider -> Mujarrad + Google OAuth | Adapter: `login`/`check`/`logout` call Mujarrad API | ~80 lines |
| refine data provider -> Mujarrad API | Adapter: CRUD methods map to Mujarrad nodes/attributes/relationships | ~200 lines |
| shadcn-admin auth pages -> refine auth hooks | Replace shadcn-admin's manual auth with `useLogin`/`useRegister` | ~50 lines |
| shadcn-admin tables -> refine `useTable` | Replace manual data fetching with refine's table hooks | ~30 lines per table |
| react-chrono i18n -> react-i18next | Pass translated strings to react-chrono's text config | ~20 lines |

**Total integration glue: ~400-500 lines of adapter code.**

---

## 6. What This Means

- **9 of 27 capabilities have overlaps** between 2+ tools
- **All 9 overlaps have clean resolutions** — no tool needs to be removed
- The pattern is consistent: **refine owns logic, shadcn-admin owns UI, sonner owns toasts, react-i18next owns translations**
- **7 tools have zero overlap** — they provide unique capabilities nothing else covers
- **~400-500 lines of adapter code** wires everything together
- **signature_pad + react-signature-canvas is not an overlap** — it's a wrapper pattern (like React + ReactDOM)
- **recharts in shadcn-admin is not an overlap** — shadcn-admin uses recharts as a dependency
