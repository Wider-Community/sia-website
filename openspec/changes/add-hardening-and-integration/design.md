## Context
Sprints 1-3 built the portal UI with a localStorage mock provider. Sprint 4 transitions to production-readiness: real backends, multi-tenant storage, and new CRM modules (pipeline, map, contacts). The portal serves SIA's investor/partner relationship management needs.

## Goals / Non-Goals
- Goals:
  - Multi-tenant R2 folder structure with file versioning across signing stages
  - Relationship pipeline (Kanban) for tracking org relationship stages
  - Geographic map visualization of organizations
  - Real backend integration (Mujarad, Typesense, email)
  - Hardened signature flow with audit trail
- Non-Goals:
  - Multi-user RBAC (single admin user for now)
  - Real-time collaboration / WebSocket updates
  - Mobile native app
  - AI-powered features (deferred to S5+)

## Decisions

### R2 Folder Structure
- **Decision**: User-scoped hierarchy with stage-based versioning
- **Why**: Prevents data mixing between users, provides clear audit trail for document lifecycle
- **Structure**:
  ```
  {userId}/
  ├── profile/
  ├── templates/
  └── organizations/
      └── {orgId}-{orgSlug}/
          └── files/
              └── {fileId}-{fileSlug}/
                  ├── original/
                  ├── pre-signed/
                  └── post-signed/
  ```
- **Migration**: Existing files at `orgs/{orgId}/{fileName}` will be moved to new structure via a one-time script
- **Alternatives considered**: Flat structure with metadata-only versioning (rejected — harder to browse in R2 console, no clear stage separation)

### Relationship Pipeline
- **Decision**: Add `stage` field to organizations, render as Kanban columns
- **Why**: CRM best practice (refine CRM, atomic-crm, HubSpot all use pipeline stages)
- **Stages**: prospect → engaged → due_diligence → negotiation → active_partner → inactive
- **Alternatives considered**: Separate "deals" entity (rejected — overengineered for current scale; org IS the deal)

### Map Library
- **Decision**: react-simple-maps (lightweight, SVG-based, no tile server needed)
- **Why**: We only need country-level visualization, not street-level maps. react-simple-maps is ~50KB vs leaflet at ~200KB+
- **Alternatives considered**: react-leaflet (too heavy), Google Maps (API key cost, overkill)

### Email Provider
- **Decision**: Resend (developer-friendly, React email support, generous free tier)
- **Why**: Native react-email integration, simple API, good deliverability
- **Alternatives considered**: SendGrid (heavier SDK), AWS SES (more ops overhead)

## Risks / Trade-offs
- R2 migration could fail for large files → Mitigation: dry-run mode, rollback script
- Mujarad API may have schema mismatches with mock data → Mitigation: adapter normalization layer exists
- react-simple-maps may lack interactivity for future needs → Mitigation: can swap to leaflet later

## Migration Plan
1. Deploy new upload server with path-aware upload endpoint
2. Run migration script to move existing R2 files to new structure
3. Update FileUploader and file browser to use new paths
4. Set `VITE_USE_MOCK=false` and test against Mujarad
5. Rollback: `VITE_USE_MOCK=true` reverts to localStorage

## Open Questions
- Is Mujarad backend currently deployed and accessible? What's the API URL?
- Which email provider does Omar prefer? (Resend recommended)
- Should the map show global or MENA-focused view by default?
- What are the exact pipeline stage names Omar wants? (proposed: prospect → engaged → due_diligence → negotiation → active_partner → inactive)
