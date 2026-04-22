# SIA Portal — Feature Mesh & Implementation Strategy

## Software Category

**Partnership Management Portal with Deal Flow CRM capabilities**

A platform where each partner (investor, company, advisor) has a home base to build their partnership with SIA, access services, track progress on active deals, and achieve their cross-border investment goals. SIA manages the relationship and deal pipeline from the other side.

Not just a request ticketing system — it's each partner's workspace for their KSA-Malaysia corridor activities.

---

## Architecture Model

```
Phase 1 (MVP): Hardcoded workflows in frontend, Mujarrad stores data
Phase 2 (Full): XyOps configures processes, Mujarrad stores data, dynamic forms
```

```
Partner → Google Login (Mujarrad) → Onboard org → Partner Home
    → Start new engagement (deal inquiry, partnership setup, consultation)
    → Track active engagements + progress
    → Sign documents, upload files
    → Manage org members
```

**MVP principle:** Simple, working, clean. Configure later.

---

## The Partner Experience

Each partner organization gets a workspace where they can:

1. **Build their partnership** — Set up business profile, invite team members, establish their corridor presence
2. **Benefit from it** — Submit deal inquiries, request services, access SIA's facilitation
3. **Achieve their goals** — Track engagement progress, sign deals, see results

The portal is partner-centric, not request-centric. The partner's dashboard shows their overall relationship with SIA — not just a list of tickets.

---

## Modules

| # | Module | MVP Scope | Phase 2 | Reference |
|---|--------|-----------|---------|-----------|
| **1** | **Authentication** | Google OAuth via Mujarrad. JWT in Zustand + localStorage. Protected routes | Email/password option | Mujarrad-Frontend (own) |
| **2** | **Partner Profile & Organization** | Org account with business profile (company name, registration, country, sector, description, logo). Invite members by email → they sign up/login with Gmail → join same org. All members have equal access in MVP | Teams under org with role-based access. Multiple org memberships per user | — |
| **3** | **Partner Home (Dashboard)** | The partner's central hub. Shows: org profile summary, active engagements with status, pending actions (signatures needed, info requested), recent activity feed | Partnership health score, recommendations, corridor insights feed | shadcn-admin (Vite + shadcn) |
| **4** | **Engagement Intake (Multi-step form)** | Start a new engagement. Clean multi-step form, 2-4 fields per step, progress bar, Framer Motion transitions. 3 engagement types: Deal Inquiry, Partnership Setup, Consultation | Dynamic form builder via XyOps. Admin creates form sequences per engagement type | Tally.so (UX inspiration), shadcn Form |
| **5** | **Engagement Pipeline** | Each engagement moves through stages. Hardcoded stages per type in MVP. Partner sees: current stage, progress bar, what's needed next. SIA team advances stages from their side | XyOps-driven configurable pipelines. Branching, parallel stages, conditions, SLA timers | XyOps (own) |
| **6** | **Engagement Detail & Timeline** | Per-engagement view. Vertical timeline of every event: stage changes, documents uploaded, signatures completed, comments. Current stage highlighted with next action | Internal notes (SIA-only), comments between partner and SIA team | Peppermint (ticket history) |
| **7** | **Document Management** | Upload/download files per engagement. Documents tied to specific stages. Org-level document vault (shared across engagements: company registration, financials, etc.) | Version history, permission controls per doc, document templates | Papermark |
| **8** | **Digital Signatures** | Sign documents within the portal. Single or multi-signer. Flow: SIA uploads doc → marks signers → signers get notified → sign → once all sign, document finalized → stage can advance. Audit trail (timestamp, IP, identity) | Signature templates, bulk signing, legally binding certification | Documenso (9k stars, MIT) |
| **9** | **Notifications** | In-app toasts (sonner). Email on: new signature request, stage advancement, invitation to org, document uploaded by SIA | Configurable templates, digest mode, preferences per user | sonner (installed) |
| **10** | **Localization (i18n)** | Arabic RTL + English LTR. All UI, form labels, stage names, notifications | Bilingual labels stored in Mujarrad | react-i18next (already implemented) |
| **11** | **Audit Trail** | Automatic via Mujarrad node versioning. Every action logged: state changes, signatures, uploads, member joins | Exportable compliance report | Mujarrad versioning (built-in) |

---

## Organization & Team Model (MVP)

```
Partner Organization (shared workspace)
├── Owner (created the org)
├── Member (invited, same access)
├── Member
└── Member

All members see: org profile, all engagements, all documents, all signatures.
No roles in MVP — everyone has equal access.
```

**Invitation flow:**
1. Owner → Org Settings → Invite Member
2. Enters email address
3. Invitee receives email with link
4. Invitee signs up or logs in with Gmail
5. Automatically joins the org
6. Full access to org workspace

---

## Partner Home (Dashboard)

The dashboard is NOT just a table of requests. It's the partner's workspace:

```
┌─────────────────────────────────────────────────────┐
│  Welcome back, [Company Name]                       │
│  Partner since [date] · [sector] · [country]        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚡ Action Required (2)                             │
│  ┌──────────────────────────────────────┐           │
│  │ Sign NDA for Deal #12        [Sign]  │           │
│  │ Provide financials for P-05  [Upload]│           │
│  └──────────────────────────────────────┘           │
│                                                     │
│  📋 Active Engagements                              │
│  ┌────────────────────────────────────────────────┐ │
│  │ Deal Inquiry — Halal Food JV    Stage 3/6  ██░ │ │
│  │ Partnership Setup               Stage 2/5  █░░ │ │
│  │ Consultation — FinTech          Completed  ███ │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  📄 Recent Activity                                 │
│  • SIA uploaded term sheet for Deal #12 — 2h ago    │
│  • Partnership moved to Due Diligence — 1d ago      │
│  • You signed NDA for Deal #12 — 3d ago             │
│                                                     │
│  [+ Start New Engagement]                           │
│                                                     │
│  👥 Team: Omar, Sarah, Ahmed     [Manage Team]     │
└─────────────────────────────────────────────────────┘
```

---

## Signature Flow

```
1. SIA uploads a document to an engagement (NDA, term sheet, agreement)
2. SIA selects which org members need to sign (one or multiple)
3. Each signer sees it in their "Action Required" section + gets email
4. Signer opens document → reviews → draws/types signature → submits
5. Once all required signers complete → document finalized with audit trail
6. If signature was a stage gate → engagement automatically advances
```

---

## Multi-Step Form Experience

Clean multi-step form for starting new engagements:

```
Step 1: Engagement type selection
        [Deal Inquiry]  [Partnership Setup]  [Consultation]

Step 2: Details (varies by type)
        Sector, deal size, target market / partnership type / topic

Step 3: Description + supporting documents
        Textarea + file upload (optional)

Step 4: ✓ Confirmation — "Engagement started! SIA will review within 48 hours."
```

- 2-4 fields per step (grouped logically)
- Progress bar at top
- Smooth transitions (Framer Motion)
- Mobile-friendly
- Back/Next navigation
- Company details auto-filled from org profile

---

## Pages (MVP)

| Route | Page | Auth Required |
|-------|------|--------------|
| `/` | Landing page (current SIA marketing site) | No |
| `/login` | Google OAuth login | No |
| `/onboarding` | Create org + business profile setup | Yes |
| `/home` | Partner Home — dashboard with actions, engagements, activity | Yes |
| `/engagements/new` | Multi-step form to start new engagement | Yes |
| `/engagements/:id` | Engagement detail: timeline, documents, signatures | Yes |
| `/documents` | Org document vault (all docs across engagements) | Yes |
| `/settings` | Org profile, team members, invitations | Yes |

---

## Components Needed (MVP)

| Component | shadcn/ui Components | Source |
|-----------|---------------------|--------|
| GoogleLoginButton | Button | Copy from Mujarrad-Frontend |
| AuthStore (Zustand) | — | Copy from Mujarrad-Frontend |
| ProtectedRoute | — | Copy from Mujarrad-Frontend |
| OrgOnboarding | Card, Input, Button | New |
| PartnerHome | Card, Badge, Progress, Table | New |
| ActionRequired | Card, Badge, Button | New |
| EngagementCard | Card, Badge, Progress | New |
| ActivityFeed | — (Framer Motion) | New |
| MultiStepForm | Input, Select, Textarea, Button, Progress | New |
| EngagementTypeSelector | Card, Badge | New |
| EngagementDetail | Card, Badge, Separator | New |
| StatusTimeline | — (Framer Motion custom) | New |
| DocumentUpload | Input, Button, Card | New |
| DocumentVault | Table, Badge, Button | New |
| SignatureCanvas | Dialog, Button | New (canvas-based) |
| SignatureRequest | Card, Badge, Button | New |
| OrgSettings | Input, Button, Table, Dialog | New |
| InviteMember | Dialog, Input, Button | New |
| DashboardLayout | Sidebar, ScrollArea | Reference shadcn-admin |

---

## Engagement Pipelines (Hardcoded MVP)

### Deal Inquiry
```
Submission → SIA Review → Initial Assessment → Documentation & Signatures → In Progress → Completed
```
Form: sector, deal type (investment/JV/M&A/trade), deal size, target market, description, documents

### Partnership Setup
```
Application → Review → Due Diligence → Documentation & Signatures → Onboarding → Active Partner
```
Form: partnership type (advisory/referral/co-facilitation), expertise areas, track record, references

### General Consultation
```
Request Submitted → Under Review → Response Delivered → Completed
```
Form: topic of interest, preferred language, message

---

## Open Source Reference Matrix

| What | From | Stars | Stack Match |
|------|------|-------|-------------|
| Dashboard shell (sidebar, tables, cards) | satnaing/shadcn-admin | 11.8k | **Exact** (Vite + React + TS + shadcn) |
| Auth (Google OAuth, store, protected routes) | Mujarrad-Frontend (own) | — | **Exact** |
| Multi-step form UX | Tally.so | — | UX inspiration (simplified) |
| Engagement lifecycle (submit → track) | Peppermint | 3.1k | Medium (Next.js) |
| Digital signatures | Documenso | 9k | High (Next.js + TS + Prisma) |
| Document sharing/vault | Papermark | 6k | High (Next.js + TS) |
| CRM deal pipeline patterns | NextCRM | 579 | High (Next.js + shadcn) |

---

## Fastest Implementation Path

1. **Auth** — Copy Google OAuth from Mujarrad-Frontend, adapt for Vite
2. **Routing** — Add react-router-dom, set up all pages
3. **Org onboarding** — Create org + business profile form, store in Mujarrad
4. **Partner Home** — Action required section + engagement cards + activity feed
5. **Multi-step form** — Build step-based form with Framer Motion (2-4 fields/step, auto-fill from org profile)
6. **3 engagement types** — Hardcoded pipelines, submit to Mujarrad API
7. **Engagement detail** — Timeline + documents + signature status
8. **Document vault** — Org-level document storage, upload/download per engagement
9. **Signatures** — Canvas-based capture, multi-signer, stage-gated advancement
10. **Team invitations** — Invite by email, join org on Gmail signup
11. **Replace CTAs** — All "Schedule a Conversation" → "Get Started" → login → Partner Home
