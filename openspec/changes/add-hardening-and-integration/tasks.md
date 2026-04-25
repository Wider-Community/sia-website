# Tasks: Hardening, Integration & New Modules (Sprint 4)

## 1. R2 Storage Architecture
- [ ] 1.1 Update upload server to accept `path` and `userId` query parameters
- [ ] 1.2 Implement slug generation for org names in R2 keys (`orgId-orgSlug`)
- [ ] 1.3 Add folder creation endpoint (`POST /folder?path=...`)
- [ ] 1.4 Add folder listing endpoint (`GET /browse?prefix=...`) returning files and subfolders
- [ ] 1.5 Write migration script to move existing `orgs/{orgId}/` files to new `{userId}/organizations/{orgId}-{slug}/files/` structure
- [ ] 1.6 Run migration on existing R2 files (currently: `orgs/org-1/Wider Company Profile.pdf`)
- [ ] 1.7 Build folder browser UI component: breadcrumbs, folder navigation, create-folder dialog
- [ ] 1.8 Update FileUploader to use new path-aware upload endpoint
- [ ] 1.9 Wire download button to R2 via `/download?key=...` endpoint (streaming proxy)
- [ ] 1.10 Add in-browser PDF preview (open in new tab via blob URL)
- [ ] 1.11 Add file versioning support: original/pre-signed/post-signed stage folders
- [ ] 1.12 Update signing flow to copy files to pre-signed/post-signed folders on stage transitions

## 2. Relationship Pipeline Module
- [ ] 2.1 Add `stage` field to organization schema and seed data (default: `prospect`)
- [ ] 2.2 Add pipeline stages constant: prospect, engaged, due_diligence, negotiation, active_partner, inactive
- [ ] 2.3 Build PipelinePage with Kanban columns using @dnd-kit
- [ ] 2.4 Build org card component for Kanban (name, type, country, last activity)
- [ ] 2.5 Implement drag-and-drop stage change with confirmation dialog
- [ ] 2.6 Log stage transitions to activity events (with `from` and `to` fields)
- [ ] 2.7 Add "Pipeline" nav item to PortalSidebar
- [ ] 2.8 Add pipeline route to router.tsx
- [ ] 2.9 Build pipeline analytics widget: count per stage, bar chart
- [ ] 2.10 Add pipeline summary to dashboard page

## 3. Map View Module
- [ ] 3.1 Install react-simple-maps dependency
- [ ] 3.2 Build MapPage with world map SVG and organization markers
- [ ] 3.3 Map country names to geographic coordinates (lookup table)
- [ ] 3.4 Color markers by pipeline stage
- [ ] 3.5 Add tooltip on marker hover (org name, stage, type)
- [ ] 3.6 Add click-to-navigate to org detail
- [ ] 3.7 Add filter controls: stage, type, status
- [ ] 3.8 Add "Map" nav item to PortalSidebar
- [ ] 3.9 Add map route to router.tsx

## 4. Wire Mujarad Backend
- [ ] 4.1 Fix PortalApp.tsx: wire `mujarradDataProvider` when `VITE_USE_MOCK=false`
- [ ] 4.2 Fix auth provider toggle to use real Mujarad auth when not mock
- [ ] 4.3 Test getList, getOne, create, update, deleteOne against live Mujarad API
- [ ] 4.4 Handle schema normalization edge cases (dates, nested objects)
- [ ] 4.5 Add error handling for Mujarad API failures (toast notifications)

## 5. Wire Typesense to Cmd+K
- [ ] 5.1 Connect Typesense search adapter to CommandPalette component
- [ ] 5.2 Implement grouped results (organizations, contacts, files)
- [ ] 5.3 Add type indicators and keyboard navigation
- [ ] 5.4 Test search with typo tolerance

## 6. Email Integration
- [ ] 6.1 Install Resend SDK (`resend` npm package)
- [ ] 6.2 Add email sending endpoint to upload server (or separate email server)
- [ ] 6.3 Wire EmailComposeModal to send via Resend API
- [ ] 6.4 Build signing request email template
- [ ] 6.5 Build signing reminder email template
- [ ] 6.6 Build signing completion notification email template
- [ ] 6.7 Wire signing flow to send emails at each stage
- [ ] 6.8 Log all sent emails to activity events

## 7. Signature Flow Hardening
- [ ] 7.1 Add "Decline" button and reason dialog to PublicSigningPage
- [ ] 7.2 Update signer status to `declined` with reason stored
- [ ] 7.3 Add signing audit trail events: `signing_viewed`, `field_signed`, `signing_declined`
- [ ] 7.4 Add token expiration field to signing requests (default 30 days)
- [ ] 7.5 Show expiration error page for expired tokens
- [ ] 7.6 Implement "Resend" button on SigningDetailPage (regenerate token if expired)
- [ ] 7.7 Add error boundaries around PDF viewer and assembly
- [ ] 7.8 Notify admin on decline via activity event and optional email

## 8. Standalone Contacts Page
- [ ] 8.1 Build ContactListPage with refine useTable + shadcn table
- [ ] 8.2 Build ContactFormPage (create/edit) with org linking
- [ ] 8.3 Build ContactDetailPage with tabs: Overview, Organizations, Activity, Files
- [ ] 8.4 Add "Contacts" nav item to PortalSidebar (between Organizations and Documents)
- [ ] 8.5 Add contact routes to router.tsx

## 9. UX Polish
- [ ] 9.1 Audit all pages for broken interactions and fix
- [ ] 9.2 Ensure consistent loading skeletons on all data-fetching pages
- [ ] 9.3 Add error states for failed API calls (retry button)
- [ ] 9.4 Mobile responsiveness audit and fixes
- [ ] 9.5 Verify dark mode consistency across new pages
