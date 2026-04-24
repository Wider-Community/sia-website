# Tasks: Central Nervous System (Sprint 1)

This implementation follows a strict 5-phase methodology. Each phase MUST be completed and verified before proceeding to the next.

## Phase 1 — Research
- [x] 1.1 Study refine.dev v5 documentation: data provider, auth provider, resource definitions, shadcn/ui integration
- [x] 1.2 Study shadcn-admin repo: extract layout components, auth pages, table components, command palette, theme system
- [x] 1.3 Study Uppy tus protocol: resumable upload flow, Cloudflare R2 tus endpoint configuration, @uppy/react integration
- [x] 1.3a Study Cloudflare R2: bucket creation via wrangler CLI, CORS policy configuration, tus endpoint setup, presigned URL generation
- [x] 1.4 Study Mujarrad SDK: node CRUD, relationship creation, space management, authentication endpoints
- [x] 1.5 Study Typesense: Docker deployment, collection schemas, search API, typo tolerance, indexing pipeline, relevance tuning
- [x] 1.6 Study Wider Tooling extraction pipeline: two-round strategy (Docling + EasyOCR/vision fallback), config.yaml options, API exposure for ETL integration
- [x] 1.7 Study doc 18 overlap matrix: confirm ownership boundaries between refine, shadcn-admin, sonner, react-i18next
- [x] 1.8 Document research findings and gaps in a research summary

## Phase 2 — Design
- [x] 2.1 Create ERD for S1 data model: Organization, Contact, FileRecord, Note, ActivityEvent nodes and their relationships in Mujarrad
- [x] 2.2 Create ERD for the full Activity system (process types, step definitions, step instances, events) — designed now, implemented incrementally
- [x] 2.3 Create sequence diagrams: login flow, org CRUD flow, file upload flow (Uppy → R2 → local ETL picks up → Wider Tooling extracts → indexes into Typesense), global search flow (Cmd+K → Typesense)
- [x] 2.4 Create state diagram for activity event lifecycle
- [x] 2.5 Define Mujarrad node schemas: attributes per node type, relationship types between nodes
- [x] 2.5a Define Typesense collection schemas: organizations, contacts, files (with extracted text content fields)
- [x] 2.6 Define refine resource configurations: resource names, routes, meta fields
- [x] 2.7 Define refine DataProvider interface mapping: each method → Mujarrad SDK call
- [x] 2.8 Define refine AuthProvider interface mapping: each method → Mujarrad auth endpoint
- [x] 2.9 Review and approve all design artifacts before proceeding

## Phase 3 — Design Implementation
- [x] 3.1 Scaffold refine.dev app with React Router
- [x] 3.2 Implement Mujarrad data provider (~200 lines) conforming to refine DataProvider interface
- [x] 3.3 Implement mock data provider with in-memory seed data (same interface)
- [x] 3.4 Implement auth provider (~80 lines) wrapping Mujarrad JWT + Google OAuth
- [x] 3.5 Implement notification adapter (refine → sonner, ~10 lines)
- [x] 3.6 Implement i18n adapter (refine → react-i18next, ~15 lines)
- [x] 3.7 Define Zod schemas for Organization, Contact, FileRecord, Note, ActivityEvent
- [x] 3.8 Define refine resource configurations for all node types
- [x] 3.9 Integrate shadcn-admin layout components (sidebar, header, theme, error pages) with refine routing and `<Authenticated>`
- [x] 3.10 Wire shadcn-admin auth pages to refine `useLogin`/`useRegister`
- [x] 3.11 Deploy Typesense via Docker Compose on the server
- [x] 3.12 Create Typesense collections (organizations, contacts, files) with defined schemas
- [x] 3.13 Build local ETL watcher: monitors R2 for new uploads via R2 Event Notifications (Cloudflare Queue) or S3-compatible ListObjectsV2 polling, triggers Wider Tooling extraction, pushes results to Typesense API
- [x] 3.14 Configure Wider Tooling pipeline for SIA file types (PDF, DOCX, XLSX, PPTX) with Round 1 + Round 2 fallback
- [x] 3.14a Build transformer: maps Wider Tooling extract_file() output to Typesense document JSON schema (id, file_name, organization_id, file_type, uploaded_at, content)
- [x] 3.15 Implement Typesense search adapter for Cmd+K queries (~60 lines)

## Phase 4 — Design Testing
- [x] 4.1 Verify data provider: CRUD operations against mock provider return correct data
- [x] 4.2 Verify auth provider: login/logout/check/identity work with mock credentials
- [x] 4.3 Verify notification adapter: CRUD operations trigger sonner toasts
- [x] 4.4 Verify routing: resource-defined routes render correct pages, `<Authenticated>` blocks unauthenticated access
- [x] 4.5 Verify layout: sidebar navigation, theme toggle, error pages render correctly
- [x] 4.6 Verify Zod schemas: invalid data rejected, valid data passes
- [x] 4.7 Verify Typesense: collections created, search API returns results, typo tolerance works (requires Docker)
- [x] 4.8 Verify ETL pipeline end-to-end: upload file to R2 → local ETL detects it → Wider Tooling extracts text → indexed in Typesense → searchable via Cmd+K (requires infrastructure)
- [ ] 4.8a Verify ETL catch-up: simulate offline period → bring ETL back online → all pending files processed (requires R2 credentials)
- [x] 4.9 Document any design issues found and resolve before proceeding

## Phase 5 — Implementation
- [x] 5.1 Build organization list page: refine `useTable` + shadcn-admin table components
- [x] 5.2 Add table filtering by type, status, country, tags
- [x] 5.3 Add column sorting and pagination
- [x] 5.4 Build organization create/edit slide-over panel: `@refinedev/react-hook-form`
- [x] 5.5 Implement contacts as dynamic sub-form rows (shared nodes linked via relationships)
- [x] 5.6 Build organization detail page with tabs: Overview, Contacts, Files, Notes, Activity
- [x] 5.7 Implement notes tab: create and list via refine data provider
- [x] 5.8 Install and configure Uppy with `@uppy/react`, `@uppy/tus`, `@uppy/drag-drop` (requires R2 bucket setup)
- [x] 5.9 Configure Uppy tus endpoint for Cloudflare R2 (configurable via VITE_TUS_ENDPOINT env var)
- [x] 5.10 Build upload UI with progress, auto-retry, resume-on-reconnect
- [x] 5.11 Wire upload completion to create Mujarrad FileRecord node via refine data provider
- [x] 5.12 Build file browser in Files tab using refine `useList`
- [x] 5.13 Add file download and delete actions
- [x] 5.14 Build Cmd+K command palette using cmdk from shadcn-admin
- [x] 5.15 Wire Cmd+K command palette to Typesense search (full-text content + structured metadata, typo tolerance, relevance ranking)
- [x] 5.16 Display grouped results with keyboard navigation
- [x] 5.17 Implement automatic activity event logging for all CRUD operations
- [x] 5.18 Build Activity tab with simple chronological event list
- [x] 5.19 Build dashboard with three stat cards (total orgs, total files, recent activity)
- [x] 5.20 Unify look and feel: ensure all OSS components (Uppy, shadcn-admin, cmdk) follow SIA design tokens (Gold #C8A951, Charcoal #1C1C1E, Silver #C0C0C0)
- [x] 5.21 Verify dark mode across all pages
- [x] 5.22 Test responsive layout on mobile/tablet
- [x] 5.23 Add loading skeletons and error states
- [x] 5.24 Verify keyboard navigation across tables, forms, command palette
- [ ] 5.25 Run full end-to-end test against all Definition of Done criteria
