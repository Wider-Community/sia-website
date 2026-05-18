# SIA Platform — Complete Software Requirements

**Version:** 1.0
**Date:** May 2026
**Scope:** SIA Website + SIA Portal + Wider Labs integration engine

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Users & Personas](#2-users--personas)
3. [Functional Requirements](#3-functional-requirements)
   - [M1 — Partner Registry](#m1--partner-registry)
   - [M2 — AI-Powered Matching](#m2--ai-powered-matching)
   - [M3 — Relationship Management](#m3--relationship-management)
   - [M4 — Portfolio Management](#m4--portfolio-management)
   - [M5 — Financial Model Deployment](#m5--financial-model-deployment)
   - [M6 — Integration Journey](#m6--integration-journey)
   - [Digital Signature Flow](#digital-signature-flow)
   - [Document Lifecycle](#document-lifecycle)
   - [OKR System](#okr-system)
   - [Secure Deal Rooms](#secure-deal-rooms)
   - [Portfolio Aggregation — The Arsenal](#portfolio-aggregation--the-arsenal)
   - [Organization & Team Model](#organization--team-model)
   - [Admin & Operations Panel](#admin--operations-panel)
   - [Partner Home Dashboard](#partner-home-dashboard)
   - [Notification System](#notification-system)
   - [Internationalization](#internationalization)
4. [Page Routes](#4-page-routes)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Tech Stack](#6-tech-stack)
7. [Data Model](#7-data-model)
8. [Current Build Status](#8-current-build-status)
9. [Success Metrics](#9-success-metrics)
10. [Build Phases](#10-build-phases)

---

## 1. Product Overview

**SIA Portal** is a bilingual (EN/AR) B2B deal facilitation platform for the Saudi Arabia–Malaysia investment corridor. It targets $2M–$50M deals with a 6-month cycle, compared to 12–18 months via traditional consultants.

### Two-Part System

| Part | Description |
|------|-------------|
| **SIA Website** (`siaportal.com`) | Public marketing site converting visitors to portal users |
| **SIA Portal** | Private application for partner matching, OKR alignment, deal rooms, document workflows (LOI → NDA → MoU → Contract), and financial modeling |

### Strategic Positioning

Between Big 4 consulting (expensive, enterprise) and generic platforms (no corridor expertise). Mid-market, 6-month deal cycles, bilingual, corridor-expert.

### Architecture Phases

```
Phase 1 (MVP):  Frontend workflows hardcoded, Mujarrad stores all data
Phase 2 (Full): XyOps configures processes dynamically, Wider Labs AI fully integrated
```

---

## 2. Users & Personas

| Persona | Description | Goal |
|---------|-------------|------|
| **GCC Investor** | Saudi investors, family offices, sovereign-adjacent capital holders | Deploy capital into Malaysian digital infrastructure; needs visibility, credibility, clear first step |
| **Malaysian Company** | Data centers, AI companies, solar farms, tech manufacturers | Find capital partners and strategic alliances; reach formal MOU stage |
| **Government Entity** | Malaysian ministries, MDEC, Saudi embassy, government programs | Oversight, formal documentation, structured bilateral engagement record |
| **Startup / Investment Seeker** | Early-stage companies on either side | Expose financial model to investors, get discovered via AI matching |
| **SIA Admin / Operator** | Internal SIA team | Manage all of the above; verify partners, create matches, oversee integrations |

All four active personas must be served simultaneously. The platform must feel native to all.

---

## 3. Functional Requirements

### M1 — Partner Registry

**Sprint:** 1 | **Priority:** MUST HAVE

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| REG-01 | Guided multi-step onboarding — 4 paths (investor / company / gov / startup), 2–4 fields/step, Framer transitions, progress bar | Yes | NOT BUILT |
| REG-02 | Profile completeness score with gamified prompts on dashboard | Yes | NOT BUILT |
| REG-03 | Document upload: company registration, MDEC status, investment mandates, MOUs, government credentials | Yes | BUILT |
| REG-04 | Profile edit with version history (via Mujarrad versioning) | Yes | PARTIAL |
| REG-05 | Public-facing partner card with privacy controls (toggle public/private) | Yes | NOT BUILT |
| REG-06 | Admin verification queue — SIA team approves/rejects with badge | Yes | NOT BUILT |

**Partner profile fields:** name, entity type, country, sector, stage, investment capacity or funding need, integration tier interest.

**Phase 2:** Dynamic form builder via XyOps; automated pre-screening; enhanced visibility settings.

---

### M2 — AI-Powered Matching

**Sprint:** 2 | **Priority:** MUST HAVE

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| MATCH-01 | Manual match creation by admin — selects two orgs, creates match | Yes (manual) | NOT BUILT |
| MATCH-02 | Match cards: who, why matched, match strength score, list page | Yes (simplified) | NOT BUILT |
| MATCH-03 | Two-way accept/decline flow; relationship created on mutual accept | Yes | NOT BUILT |
| MATCH-04 | Match filtering by country, sector, investment size, entity type | Yes | NOT BUILT |
| MATCH-05 | Match history — log of all matches shown / accepted / rejected | Yes | NOT BUILT |
| MATCH-06 | Automated AI matching by Wider Labs within 24h of profile completion | Phase 2 | Deferred |
| MATCH-07 | "Explain this match" — natural language explanation | Phase 2 | Deferred |

**Phase 2 (Wider Labs):** Matching algorithm using profile vectors, sector taxonomy, integration tier data, historical signals. Scores on compatibility, urgency, strategic fit. Re-ranks as profiles update.

---

### M3 — Relationship Management

**Sprint:** 2 | **Priority:** MUST HAVE

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| REL-01 | Relationship dashboard grouped by status: new / in conversation / MOU stage / active / dormant | Yes | PARTIAL |
| REL-02 | Relationship timeline — chronological log of interactions, documents, status changes | Yes | BUILT |
| REL-03 | Status progression: introduced → engaged → negotiating → formalised → active (both parties confirm) | Yes | PARTIAL |
| REL-04 | Meeting logger: date, attendees, summary, outcome → appended to timeline | Yes | NOT BUILT |
| REL-05 | Document exchange — private document space per relationship | Yes | PARTIAL |
| REL-06 | Notes and tags | Yes | BUILT |
| REL-07 | Relationship alerts — inactivity, document shared, profile updated | Yes (in-app) | PARTIAL |
| REL-08 | Relationship health / engagement level score | Phase 2 | BUILT |
| REL-09 | Kanban pipeline view with drag-and-drop | Phase 2 | BUILT |

**Phase 2 (Wider Labs):** Dynamic health scores. Identifies at-risk relationships. Suggests re-engagement actions. Extracts data from meetings/documents to enrich records.

---

### M4 — Portfolio Management

**Sprint:** 3 | **Priority:** MUST HAVE

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| PORT-01 | Portfolio dashboard — visual summary of all org assets | Yes | NOT BUILT |
| PORT-02 | Asset entries: name, type (company/project/asset/program), status, sector, valuation range, description | Yes | NOT BUILT |
| PORT-03 | Investor deal tracker — active investments, committed capital, pipeline, exits | Yes | NOT BUILT |
| PORT-04 | Company project/asset registry — live projects, infrastructure, revenue products, partnerships | Yes | NOT BUILT |
| PORT-05 | Government program registry — national programs, bilateral agreements, MOUs, open mandates | Yes | NOT BUILT |
| PORT-06 | Shareable portfolio — permission-controlled read-only link | Yes | NOT BUILT |
| PORT-07 | Portfolio analytics — total value, sector diversification, tier coverage, activity level | Simplified | NOT BUILT |

**Phase 2 (Wider Labs):** Analyses composition, identifies gaps. Generates health insights: overconcentration, underutilised assets. Enriches with market data and benchmarks.

---

### M5 — Financial Model Deployment

**Sprint:** 3 | **Priority:** MUST HAVE

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| FIN-01 | Financial model builder: revenue model, current/projected revenue, funding ask, use of funds, runway, team size, traction | Yes | INVESTOR PORTAL ONLY |
| FIN-02 | Model types: pre-revenue startup / revenue-stage company / infrastructure co-investment / government program seeking private capital | Yes | NOT BUILT |
| FIN-03 | Standardized financial summary card for quick investor consumption and comparison | Yes | NOT BUILT |
| FIN-04 | Visibility controls — only visible to matched + accepted investors, never publicly searchable | Yes | NOT BUILT |
| FIN-05 | Investor interest signals — one-click interest → notifies company → initiates M3 relationship | Yes | NOT BUILT |
| FIN-06 | Model versioning — material changes notify interested investors | Yes | NOT BUILT |
| FIN-07 | AI commentary — strengths, risks, comparable opportunities | Phase 2 | Deferred |

**Phase 2 (Wider Labs):** Validates inputs for consistency. Generates commentary and risk flags. Scores investor attractiveness. Auto-matches models to investor profiles.

---

### M6 — Integration Journey

**Sprint:** 3 | **Priority:** MUST HAVE (Tiers 1–2 only for MVP)

#### Five-Tier Integration Framework

| Tier | Name | MVP | Description |
|------|------|-----|-------------|
| **1** | Service Level | Yes | Define first action/service exchange. Both parties sign off digitally. First formal commitment |
| **2** | Business Level | Yes | Upload/initiate MOU, define project scope, assign project lead, set milestones. SIA facilitates |
| **3** | Company Level | Phase 2 | Co-founder matching. Equity split, roles, country of incorporation. Term sheet template. Legal review required |
| **4A** | Regulatory (Existing) | Phase 2 | SIA allocates relevant regulations/compliance. Country + sector-specific checklist generated |
| **4B** | Regulatory (New Frontier) | Phase 2 | New regulatory pathways flagged for escalation to SIA government relations |
| **5** | Diplomatic | Phase 2 | National program-level partnerships. SIA admin approval. Formal bilateral program entry |

#### Journey Feature Requirements

| ID | Requirement | MVP | Status |
|----|-------------|-----|--------|
| INT-01 | Journey launcher — both parties opt in from "engaged" status | Yes | NOT BUILT |
| INT-02 | Journey progress tracker — visual stepper, completion %, next action | Yes | NOT BUILT |
| INT-03 | Tier 1: define first service action + digital signature gate | Yes | NOT BUILT |
| INT-04 | Tier 2: MOU upload + project scope + milestones + SIA facilitation | Yes | NOT BUILT |
| INT-05 | Document vault per journey — structured, auditable storage per tier | Yes | NOT BUILT |
| INT-06 | Journey notifications — step-by-step prompts for both parties | Yes | NOT BUILT |

**Phase 2 (Wider Labs):** Recommends starting tier. Analyses tier documents for gaps. Generates compliance checklists (4A). Tracks velocity and flags stalled journeys.

---

### Digital Signature Flow

**Sprint:** 2 | **Priority:** MUST HAVE

| ID | Requirement | Status |
|----|-------------|--------|
| SIG-01 | Upload any PDF document | BUILT |
| SIG-02 | View PDF in-browser with page navigation and zoom | BUILT |
| SIG-03 | Place signature fields via drag-and-drop on PDF pages | BUILT |
| SIG-04 | Assign each signature field to a signer from the contact book | BUILT |
| SIG-05 | Send signing requests via email with unique token link per signer | BUILT |
| SIG-06 | Public signing page (no login): draw / type / upload signature | BUILT |
| SIG-07 | Embed signatures into final PDF via pdf-lib at exact coordinates | BUILT |
| SIG-08 | Track signing status per document (pending / signed / declined) | BUILT |
| SIG-09 | Download completed signed PDF | BUILT |
| SIG-10 | Resend reminder to pending signers | BUILT |
| SIG-11 | Audit trail: timestamp, IP, signer identity, document hash | BUILT |
| SIG-12 | Signature as tier/stage gate — auto-advances journey on completion | NOT BUILT |
| SIG-13 | Multi-party signing: Party A + Party B + SIA (3-party) | PARTIAL |

#### Signing Flow Sequence

```
1. Document uploaded to an engagement or journey tier (by SIA or partner)
2. Signers selected (one or multiple from org members)
3. Each signer notified (in-app + email)
4. Signer opens doc → reviews → draws/types signature → submits
5. All required signers complete → document finalized
6. Audit trail stored: timestamp, IP, signer identity, document hash
7. If signature is a tier gate → journey/engagement advances automatically
```

---

### Document Lifecycle

**Phase:** Partial MVP, Full Phase 2

**Document chain:** LOI → NDA → MoU → Term Sheet → Contract → Close

| Feature | Requirement |
|---------|-------------|
| Template library | LOI, NDA, MoU, Term Sheet, and custom templates |
| Auto-fill from profiles | Pre-fill company names, registration numbers, addresses, and sectors |
| Collaborative editing | Rich text editor with structured sections |
| Tracked changes | Every edit logged: who changed what, and when |
| Comment threads | Inline comments on specific clauses |
| Version history | Roll back to any previous version |
| Lock for signing | No more edits once signing is requested |
| Multi-party signatures | Each signer signs independently |
| Finalize and store | Audit trail: hash, timestamps, IPs, identities |

---

### OKR System

**Phase:** 2 (Go-to-market flywheel engine)

| ID | Requirement |
|----|-------------|
| OKR-01 | Each org defines Objectives + Key Results with targets and deadlines |
| OKR-02 | CAPEX/OPEX estimates (manual or AI) per objective |
| OKR-03 | AI objective matching — detect where two orgs' goals align |
| OKR-04 | Joint OKR creation — shared objectives between partner organizations |
| OKR-05 | OKR progress tracking feeds into relationship health and integration journey |
| OKR-06 | Free OKR entry (GTM flywheel) — match visibility is gated for paid tier |

#### GTM Flywheel

```
1. Free OKRs attract users — everyone defines their goals at no cost
2. Goals create data — the platform learns what everyone wants
3. Data reveals matches — AI finds where objectives align
4. Matches create desire — "there's a partner out there for you"
5. Desire drives engagement — users want to connect and explore
6. Engagement drives conversion — free users become paying users
7. Conversion drives more data — more partners, better matches
8. Repeat
```

---

### Secure Deal Rooms

**Phase:** 2

| ID | Requirement |
|----|-------------|
| DR-01 | Create deal room when integration journey starts or manually by admin |
| DR-02 | Members: Party A, Party B, SIA facilitator, government authority (Tier 4+), legal counsel (Tier 3+) |
| DR-03 | Encrypted, logged secure messaging |
| DR-04 | Document sharing tied to the room |
| DR-05 | Meeting notes appended to timeline |
| DR-06 | Action items assigned to members with due dates |
| DR-07 | Collaborative document editing within room |
| DR-08 | Signature requests initiated from room |
| DR-09 | OKR tracking — joint objectives visible to all room members |
| DR-10 | Financial projections visible in room |
| DR-11 | Exportable compliance and audit report |

---

### Portfolio Aggregation — The Arsenal

**Phase:** 2

| ID | Requirement |
|----|-------------|
| AG-01 | Aggregate portfolios across partnered organizations |
| AG-02 | Present combined view to investors and governments as a consortium |
| AG-03 | Dynamic value projection — "if Company E joins, combined revenue → $9M" |
| AG-04 | Investor view: unified consortium (diversified, de-risked, at scale) |
| AG-05 | Government view: program impact (jobs created, capital deployed, sectors served) |
| AG-06 | Partner view: ecosystem strength and reasons to join the consortium |

---

### Organization & Team Model

**Sprint:** 1 | **Priority:** MUST HAVE

| ID | Requirement | Status |
|----|-------------|--------|
| ORG-01 | Create organization during onboarding flow | PARTIAL |
| ORG-02 | Invite team members by email (Owner → Settings → Invite → enters email) | NOT BUILT |
| ORG-03 | Join organization via invitation link + Gmail OAuth → auto-join with full access | NOT BUILT |
| ORG-04 | Shared workspace — all members have equal access to org profile, engagements, docs, signatures, portfolio | NOT BUILT |
| ORG-05 | Team management — members list, remove member option | NOT BUILT |

**MVP model:** Owner + Members (equal access, no roles). Phase 2 adds teams with role-based access control.

#### Invitation Flow

```
1. Owner → Settings → Invite Member → enters email
2. Invitee receives email with invitation link
3. Invitee signs up or logs in with Gmail (Google OAuth)
4. Invitee is automatically joined to the org with full access
```

---

### Admin & Operations Panel

**Sprint:** 1 | **Priority:** Day-1 requirement

| ID | Requirement | Status |
|----|-------------|--------|
| ADMIN-01 | Partner verification queue — review documents, approve/reject with badge | NOT BUILT |
| ADMIN-02 | Manual match override — suggest a match not surfaced by algorithm | NOT BUILT |
| ADMIN-03 | Relationship oversight — all active relationships, health scores, current tier | PARTIAL |
| ADMIN-04 | Analytics dashboard — active partners, matches, relationships by tier, journeys in progress | PARTIAL |
| ADMIN-05 | Announcement broadcaster — platform-wide or targeted notifications | NOT BUILT |
| ADMIN-06 | Integration escalation queue — Tier 4B and 5 flagged partnerships | Phase 2 |
| ADMIN-07 | SLA/OLA priority queue — overdue items ranked by urgency | BUILT |
| ADMIN-08 | Task management — create, assign, and complete tasks linked to orgs | BUILT |
| ADMIN-09 | SLA rules configuration — trigger events and thresholds | BUILT |

---

### Partner Home Dashboard

**Sprint:** 1 | **Priority:** MUST HAVE

```
┌─────────────────────────────────────────────────────┐
│  Welcome back, [Company Name]                        │
│  [Entity Type] · Partner since [date] · [sector]     │
│  Profile completeness: ████████░░ 80%  [Complete]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ⚡ Action Required                                  │
│  ┌───────────────────────────────────────┐           │
│  │ Sign MOU for Integration #3  [Sign]   │           │
│  │ New match suggestion          [View]  │           │
│  │ Complete financial model      [Edit]  │           │
│  └───────────────────────────────────────┘           │
│                                                      │
│  🤝 Active Relationships                             │
│  Acme Corp     — Engaged       Tier 1  ██░░░  20%   │
│  GovTech MY    — Negotiating   Tier 2  ████░  60%   │
│  AlFaisal      — Active        Tier 2  █████ 100%   │
│                                                      │
│  📊 Portfolio: 3 assets · $12M total · 2 sectors     │
│                                                      │
│  📋 Recent Activity                                  │
│  • New match: DataVault MY (95% fit) — 2h ago        │
│  • MOU uploaded for Integration #3 — 1d ago          │
│  • You signed NDA for Acme Corp — 3d ago             │
│                                                      │
│  [+ New Engagement]  [View Matches]  [View Portfolio]│
│                                                      │
│  👥 Team: Omar, Sarah, Ahmed          [Manage Team]  │
└──────────────────────────────────────────────────────┘
```

---

### Notification System

| ID | Requirement | Status |
|----|-------------|--------|
| NOTIF-01 | In-app toast notifications via Sonner | BUILT |
| NOTIF-02 | Email notifications — signing requests, stage changes, invitations | NOT BUILT |
| NOTIF-03 | Notification center / bell icon with alert list in top nav | BUILT |
| NOTIF-04 | In-app alerts for inactivity, document shared, profile updated | PARTIAL |

---

### Internationalization

| ID | Requirement | Phase |
|----|-------------|-------|
| I18N-01 | English + Arabic — not bolted on later, RTL support mandatory from day 1 | MVP |
| I18N-02 | Bahasa Malaysia | Phase 2 |
| I18N-03 | IBM Plex Arabic font for Arabic sections | MVP |
| I18N-04 | RTL layout validation — all core modules must be verified in RTL | MVP |
| I18N-05 | Bilingual testing — both EN and AR layouts verified before each release | MVP |

---

## 4. Page Routes

| Route | Page | Auth Required | Sprint |
|-------|------|---------------|--------|
| `/` | Marketing landing page | No | — |
| `/login` | Google OAuth login | No | 1 |
| `/onboarding` | Multi-step partner registration (4 paths by entity type) | Yes | 1 |
| `/home` | Partner Home dashboard | Yes | 1 |
| `/matches` | Match suggestions + history | Yes | 2 |
| `/matches/:id` | Match detail + accept/decline | Yes | 2 |
| `/relationships` | All relationships list | Yes | 2 |
| `/relationships/:id` | Relationship detail, timeline, documents, status | Yes | 2 |
| `/portfolio` | Portfolio dashboard + asset list | Yes | 3 |
| `/portfolio/new` | Add portfolio asset | Yes | 3 |
| `/financial-model` | Financial model builder/editor | Yes | 3 |
| `/integrations` | Active integration journeys | Yes | 3 |
| `/integrations/:id` | Journey detail, tier progress, docs, signatures | Yes | 3 |
| `/documents` | Org document vault | Yes | 1 |
| `/settings` | Org profile, team members, invitations | Yes | 1 |
| `/admin` | SIA admin panel (verification, matches, oversight) | Admin only | 1 |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Data Residency** | Malaysian entity data on Malaysia-based infrastructure (Cyberjaya). Saudi data PDPL compliant |
| **Security** | E2E encryption for documents. RBAC across all modules. Immutable audit log for all admin actions |
| **Performance** | Match generation < 24h. Page load < 2s. Mobile-responsive on all core modules |
| **Authentication** | Google OAuth (MVP). Email + password with 2FA (Phase 2). Microsoft SSO (Phase 2) |
| **Compliance** | PDPA (Malaysia), PDPL (Saudi Arabia), GDPR-compatible data handling |
| **Uptime** | 99.5% availability. Incident response < 4 hours |
| **Scale** | MVP: 500 concurrent partners. Architecture must support 10× without redesign |
| **Languages** | English + Arabic (MVP). Bahasa Malaysia (Phase 2) |
| **Design System** | Institutional tone. 3-color discipline only: Gold `#C8A951`, Charcoal `#1C1C1E`, Silver `#C0C0C0` |
| **Typography** | Playfair Display (headings) + Inter (body) + IBM Plex Arabic (Arabic sections) |

---

## 6. Tech Stack

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Meta-framework | refine.dev (data provider, auth, CRUD, routing, i18n) |
| Routing | React Router v7 |
| Styling | Tailwind CSS 3.4 |
| UI Components | shadcn/ui (60+ pre-installed components) |
| Animation | Framer Motion |
| 3D (website only) | Three.js + @react-three/fiber + Drei |
| Icons | Lucide React |

### State & Data

| Layer | Technology |
|-------|------------|
| Server State | TanStack Query v5 (React Query) |
| Client State | Zustand |
| Data Provider | refine adapter → Mujarrad (~200 lines) |
| Auth Provider | refine adapter → Mujarrad JWT + Google OAuth (~80 lines) |
| Forms | react-hook-form + Zod |
| i18n | i18next + react-i18next |

### Specialized Libraries

| Feature | Library |
|---------|---------|
| PDF Viewing | react-pdf |
| PDF Manipulation | pdf-lib (in-browser, no server required) |
| Signature Capture | react-signature-canvas + @dnd-kit/core (field placement) |
| File Upload | @uppy/core + @uppy/tus |
| Charts | Recharts |
| Toast Notifications | Sonner |
| Maps | react-simple-maps + dotted-map + cobe (globe) |
| Data Tables | @tanstack/react-table |
| Email Templates | Resend / react-email |

### Backend & Infrastructure

| Layer | Technology |
|-------|------------|
| Backend | Mujarrad (graph DB) at `https://mujarrad.onrender.com/api` |
| Auth | Google OAuth via Mujarrad (`POST /api/auth/oauth/google`) |
| Node Types | CONTEXT (identity), REGULAR (data), ASSUMPTION (drafts), TEMPLATE (blueprints) |
| Auth Headers | `X-API-Key` / `X-API-Secret` |

---

## 7. Data Model

### Core Entities

| Entity | Key Fields |
|--------|------------|
| **User** | `id`, `email`, `name`, `avatar_url`, `auth_provider`, `created_at` |
| **Organization** | `id`, `name`, `country`, `sector`, `description`, `logo_url`, `registration_number` |
| **OrgMembership** | `user_id`, `org_id`, `role` (owner \| member), `joined_at` |
| **PartnerProfile** | `org_id`, `entity_type` (investor \| company \| government \| startup), `country`, `sector_focus`, `stage`, `investment_capacity`, `funding_need`, `integration_tier_interest`, `completeness_score`, `is_verified`, `is_public` |
| **Match** | `partner_a_id`, `partner_b_id`, `status` (pending \| accepted_a \| accepted_b \| mutual \| declined), `match_reason`, `match_score`, `created_by` |
| **Relationship** | `party_a_id`, `party_b_id`, `match_id`, `status` (introduced \| engaged \| negotiating \| formalised \| active \| dormant) |
| **RelationshipEvent** | `relationship_id`, `event_type`, `description`, `actor_id`, `metadata`, `created_at` |
| **IntegrationJourney** | `relationship_id`, `current_tier` (1–5), `status` (active \| completed \| stalled), `started_at` |
| **JourneyTier** | `journey_id`, `tier_number`, `status` (pending \| in_progress \| completed), `tier_data` (scope/milestones), `completed_at` |
| **Document** | `org_id`, `relationship_id?`, `journey_tier_id?`, `name`, `file_url`, `file_type`, `file_size`, `uploaded_by` |
| **SignatureRequest** | `document_id`, `requested_by`, `status` (pending \| completed \| cancelled), `is_stage_gate` |
| **Signature** | `request_id`, `signer_id`, `signature_data` (base64), `ip_address`, `document_hash`, `signed_at` |
| **PortfolioAsset** | `org_id`, `name`, `asset_type` (company \| project \| asset \| program), `status`, `sector`, `valuation_range` |
| **FinancialModel** | `org_id`, `model_type` (pre_revenue \| revenue_stage \| infra_coinvest \| gov_program), `revenue_model`, `funding_ask`, `use_of_funds`, `runway`, `team_size`, `traction_metrics`, `version` |
| **InvestorInterest** | `model_id`, `investor_org_id`, `expressed_at` |
| **Invitation** | `org_id`, `invited_by`, `email`, `token`, `status` (pending \| accepted \| expired), `expires_at` |
| **Notification** | `user_id`, `type`, `title`, `message`, `link`, `is_read` |
| **Task** | `title`, `description`, `due_date`, `priority` (high \| medium \| low), `status` (open \| done), `org_id?`, `contact_id?` |
| **SLARule** | `name`, `trigger_event`, `expected_days`, `at_risk_days` |

### Mujarrad Graph Mapping

```
Mujarrad Concept          →  Domain Entity
──────────────────────────────────────────────────────
Space: "sia-portal"       →  The entire portal workspace
Context: "partners"       →  Partner profiles collection
Context: "relationships"  →  Relationships collection
Context: "journeys"       →  Integration journeys collection
Context: "portfolios"     →  Portfolio assets collection
Context: "fin-models"     →  Financial models collection
Node                      →  Any entity instance (partner, relationship, doc, etc.)
Node.nodeDetails          →  Entity attributes as JSON
Attribute (next)          →  Stage/tier transitions
Attribute (belongs_to)    →  Ownership (org → asset)
Attribute (has_stage)     →  Current status pointer
Node Versions             →  Automatic audit trail
```

---

## 8. Current Build Status

**Overall MVP completion: ~30%** *(as of May 2, 2026)*

### Module Coverage

| Module | Total Stories | Built | Partial | Not Built | Coverage |
|--------|--------------|-------|---------|-----------|----------|
| M1 Partner Registry | 6 | 1 | 1 | 4 | 25% |
| M2 Matching | 5 | 0 | 0 | 5 | 0% |
| M3 Relationships | 7 | 3 | 3 | 1 | 57% |
| M4 Portfolio | 6 | 0 | 0 | 6 | 0% |
| M5 Financial Model | 6 | 0 | 0 | 6 | 0% |
| M6 Integration Journey | 6 | 0 | 0 | 6 | 0% |
| Admin Panel | 5 | 0 | 2 | 3 | 20% |
| Organization/Team | 5 | 0 | 1 | 4 | 10% |
| Platform (Auth/Doc/Sig/Notif) | 10 | 4 | 2 | 4 | 50% |
| **Total MVP** | **56** | **8** | **9** | **39** | **30%** |

### What's Working Well

- Organization CRUD — complete and polished
- Engagement CRUD — complete (3 views: Kanban, org list, engagement list)
- Full digital signing flow — wizard → PDF → signature placement → audit trail
- SLA engine — computes at-risk / overdue correctly
- Global search via Cmd+K
- Engagement-level health score on org detail
- Activity timeline (VerticalTimeline)
- React Query caching and request dedup layer

### Critical UX Gaps (Must Fix Before Shipping)

| Priority | Gap | Fix Required |
|----------|-----|--------------|
| Critical | Task detail / edit / delete pages missing | Create `TaskDetailPage`, `TaskEditPage`, add routes |
| Critical | No global React error boundary | Add `ErrorBoundary` wrapping portal routes |
| Critical | Toast spam in multi-mutation signing flows (5–10 toasts) | Suppress intermediate toasts |
| Critical | Signing async errors only logged to console | Add user-facing error toasts |
| Critical | Contact form ignores org pre-fill from URL | Add `useSearchParams` to `ContactFormPage` |
| High | Engagement detail notes tab hardcoded empty | Wire notes to `engagementId` filter |
| High | Signing requests disconnected from org/engagement | Add org/engagement selector |
| High | Schema mismatches between form schemas and `schemas.ts` | Consolidate to shared schemas |
| High | Cascade delete missing — deleting org/engagement orphans children | Prevent delete or cascade cleanup |

---

## 9. Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Partners onboarded | 50 verified across all 4 entity types | 60 days post-launch |
| Match acceptance rate | 40%+ of matches → mutual accept | Ongoing |
| Active relationships | 20+ | 30 days post-launch |
| Integration journeys started | 5+ | 90 days |
| Financial models published | 10+ | 60 days |
| MOUs facilitated | 2+ initiated/signed via platform | 90 days |
| User retention | 60%+ return within 30 days | Ongoing |

---

## 10. Build Phases

### Phase A — Matching + Opportunities (The Connection Layer)

**Why first:** Without matching, the platform is a CRM. With matching, it's a marketplace.

| What | PRD Stories | Effort |
|------|-------------|--------|
| Match entity (admin creates org↔org match) | MATCH-01 | M |
| Match list page (partner sees matches) | MATCH-02 | L |
| Accept/decline flow (two-way) | MATCH-03 | M |
| On mutual accept → engagement created | MATCH-03 → REL-01 | S |
| Match filtering (country/sector/size) | MATCH-04 | M |

### Phase B — Partner Self-Service Portal

**Why second:** Partners need to log in and see their own view.

| What | PRD Stories | Effort |
|------|-------------|--------|
| Multi-step onboarding wizard | REG-01 | L |
| Partner Home dashboard | HOME-01 to HOME-04 | L |
| Profile completeness score | REG-02 | M |
| Org invitation flow | ORG-02, ORG-03 | M |
| Team management | ORG-05 | S |

### Phase C — Portfolio + Financial Models

**Why third:** Partners need to present what they have before matching makes sense at scale.

| What | PRD Stories | Effort |
|------|-------------|--------|
| Portfolio entity + CRUD | PORT-01, PORT-02 | L |
| Type-specific portfolio views (investor/company/gov) | PORT-03, PORT-04, PORT-05 | L |
| Financial model builder | FIN-01, FIN-02, FIN-03 | L |
| Visibility controls | FIN-04 | M |
| Investor interest signals | FIN-05 | S |

### Phase D — Integration Journey (Tiers 1–2)

**Why fourth:** Once matches become engagements, the journey formalizes them.

| What | PRD Stories | Effort |
|------|-------------|--------|
| Journey launcher (both parties opt in) | INT-01 | M |
| Tier 1: Service Level sign-off | INT-03 | M |
| Tier 2: MOU + project scope + milestones | INT-04 | L |
| Document vault per journey | INT-05 | M |
| Progress tracker stepper | INT-02 | M |

### Phase E — Admin Hardening

**Why last:** Admin tools are operational — they serve the platform, not the end user.

| What | PRD Stories | Effort |
|------|-------------|--------|
| Partner verification queue | ADMIN-01 | M |
| Analytics enrichment | ADMIN-04 | M |
| Announcement broadcaster | ADMIN-05 | M |
| Email notifications | NOTIF-02 | M |

### Phase 2 — Wider Labs AI Integration

Unlocked after MVP proves the model with real partners and real data.

| Capability | Description |
|------------|-------------|
| Automated matching | Wider Labs algorithm using profile vectors, sector taxonomy, integration tier data |
| OKR system | Objective matching, joint OKRs, CAPEX/OPEX estimation |
| Relationship health | Dynamic scores, at-risk detection, re-engagement suggestions |
| Financial model analysis | AI commentary, risk flags, investor attractiveness scoring |
| Compliance checklists | Auto-generated for Tier 4A by sector and country |
| Secure deal rooms | Multi-stakeholder collaboration with encrypted messaging |
| Portfolio aggregation | "The Arsenal" — consortium view for investors and governments |
| Document intelligence | Extraction from meetings and documents to enrich records |
