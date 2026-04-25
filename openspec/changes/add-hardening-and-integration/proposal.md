# Change: Hardening, Integration & New Modules (Sprint 4)

## Why
Sprints 1-3 delivered a working UI shell with mock data. To make the portal production-ready, we need to: (1) wire real backends (Mujarad, R2, Typesense, email), (2) implement a proper multi-tenant R2 folder structure with file versioning across stages, (3) add the relationship pipeline module (stage tracking for each org relationship), (4) add a geographic map view for organizations, (5) harden the signature flow, and (6) build a standalone contacts page.

## What Changes

### 1. R2 Storage Architecture (Multi-Tenant, Versioned)
- Redesign R2 folder structure to be user-scoped and stage-aware:
  ```
  {userId}/
  ├── profile/                    # User's own files (avatar, preferences)
  ├── templates/                  # User's uploaded templates
  └── organizations/
      └── {orgId}-{orgName}/
          ├── general/            # General org files
          ├── contacts/           # Contact-related docs
          └── files/
              └── {fileId}-{fileName}/
                  ├── original/   # Original uploaded version
                  ├── pre-signed/ # Version sent for signing
                  └── post-signed/# Completed signed version
  ```
- Upload server updated to accept `path` parameter for subfolder targeting
- File browser UI with folder navigation, breadcrumbs, and create-folder action
- File versioning: track versions across stages (original → pre-signed → post-signed)

### 2. Relationship Pipeline Module
- **BREAKING**: Organizations gain a `stage` field tracking the relationship lifecycle
- Pipeline stages: `prospect` → `engaged` → `due_diligence` → `negotiation` → `active_partner` → `inactive`
- Kanban board view (using @dnd-kit, already installed) showing orgs as cards in stage columns
- Drag-and-drop to advance/regress stage, with confirmation dialog
- Stage history logged to activity events
- Pipeline analytics: conversion rates, time-in-stage, bottleneck detection
- Refine CRM deal-pipeline patterns as UX reference

### 3. Map View Module
- Geographic visualization of organizations on a world/regional map
- Cluster markers by country, colored by relationship stage
- Click marker to navigate to org detail
- Filter by stage, type, status
- Lightweight library: react-simple-maps or leaflet + react-leaflet

### 4. Wire Mujarad Backend
- Fix PortalApp.tsx provider toggle (currently both branches point to mockDataProvider)
- Wire `mujarradDataProvider` when `VITE_USE_MOCK=false`
- Wire real auth provider (Mujarad JWT + Google OAuth)
- Test all CRUD operations against live Mujarad API

### 5. Wire Typesense to Cmd+K
- Connect the existing search adapter to the command palette
- Search organizations, contacts, and file contents
- Display grouped results with type indicators

### 6. Email Integration
- Choose email provider (Resend recommended)
- Wire EmailComposeModal to actually send emails
- Signing request email notifications (send, remind, complete)
- Log all sent emails to activity events

### 7. Signature Flow Hardening
- Implement resend functionality for pending signers
- Add decline flow (signer can decline with reason)
- Add signing event audit trail (viewed, signed, declined timestamps)
- Token expiration (configurable, default 30 days)
- Error boundaries around PDF assembly

### 8. Standalone Contacts Page
- Full CRUD contacts page independent of organization context
- Link contacts to organizations (many-to-many)
- Contact detail page with activity, linked orgs, files

### 9. File Download from R2
- Wire the download button in org detail Files tab to R2 via upload server `/download` endpoint
- Support direct download and in-browser preview for PDFs

### 10. UX Polish
- Fix any broken interactions identified during validation
- Consistent loading states and error handling
- Mobile responsiveness audit

## Impact
- Affected specs: storage-architecture (NEW), relationship-pipeline (NEW), map-view (NEW), contacts-management (NEW), email-integration (NEW), signature-hardening (MODIFIED)
- Affected code: upload-server.ts, FileUploader.tsx, PortalApp.tsx, PortalSidebar.tsx, router.tsx, mock-data-provider.ts, all org pages, new pipeline/map/contacts pages
- New dependencies: react-simple-maps or react-leaflet (map), resend (email)
- **BREAKING**: R2 folder structure changes require migration of existing files
