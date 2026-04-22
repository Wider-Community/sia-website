# Sequence Diagrams

All user-facing scenarios broken down into exact system interactions.

---

## 1. Authentication — Google Login

```mermaid
sequenceDiagram
    actor User
    participant SIA as SIA Portal
    participant Google as Google OAuth
    participant Mujarrad as Mujarrad Backend

    User->>SIA: Clicks "Sign in with Google"
    SIA->>Google: Opens Google consent popup
    Google->>User: Shows Google account picker
    User->>Google: Selects account / grants consent
    Google->>SIA: Returns Google ID token (credential)
    SIA->>Mujarrad: POST /api/auth/oauth/google { idToken }
    Mujarrad->>Google: Verifies ID token
    Google-->>Mujarrad: Token valid + user email + name

    alt New user
        Mujarrad->>Mujarrad: Creates user record
        Mujarrad-->>SIA: { token, user, isNewUser: true }
        SIA->>SIA: Store JWT in Zustand + localStorage
        SIA->>User: Redirect to /onboarding
    else Existing user
        Mujarrad-->>SIA: { token, user, isNewUser: false }
        SIA->>SIA: Store JWT in Zustand + localStorage
        SIA->>User: Redirect to /home
    end
```

---

## 2. Partner Onboarding (New User)

```mermaid
sequenceDiagram
    actor User
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    User->>SIA: Lands on /onboarding after first login

    Note over SIA: Step 1 — User Type
    SIA->>User: "What type of entity are you?"
    User->>SIA: Selects: Investor / Company / Government / Startup

    Note over SIA: Step 2 — Organization
    SIA->>User: "Create your organization"
    User->>SIA: Enters: org name, country, sector
    SIA->>Mujarrad: POST /api/spaces/sia-portal/nodes (create org node)
    Mujarrad-->>SIA: { orgId }
    SIA->>Mujarrad: POST /api/spaces/sia-portal/nodes (create membership: user → org)

    Note over SIA: Step 3 — Profile Details (varies by type)
    alt Investor
        SIA->>User: Investment capacity, sector focus, stage preference
    else Company
        SIA->>User: Registration number, projects, funding need
    else Government
        SIA->>User: Ministry/agency, programs, bilateral interests
    else Startup
        SIA->>User: Stage, runway, funding ask, traction
    end
    User->>SIA: Fills fields
    SIA->>Mujarrad: POST /api/spaces/sia-portal/nodes (create partner profile)
    Mujarrad-->>SIA: { profileId }

    Note over SIA: Step 4 — Documents
    SIA->>User: "Upload company documents"
    User->>SIA: Uploads files (registration, mandates, etc.)
    SIA->>Mujarrad: POST /api/spaces/sia-portal/nodes (create document nodes)

    Note over SIA: Step 5 — Complete
    SIA->>User: "Profile created! Completeness: 75%"
    SIA->>User: Redirect to /home (Partner Home)
    SIA->>Mujarrad: Notification: new partner pending verification
```

---

## 3. Invite Team Member to Organization

```mermaid
sequenceDiagram
    actor Owner
    actor Invitee
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend
    participant Email as Email Service

    Owner->>SIA: Goes to /settings → Invite Member
    Owner->>SIA: Enters invitee email
    SIA->>Mujarrad: POST create invitation node { orgId, email, token }
    Mujarrad-->>SIA: { invitationId, token }
    SIA->>Email: Send invitation email with link: /join?token=xxx

    Note over Invitee: Invitee receives email
    Invitee->>SIA: Clicks invitation link → /join?token=xxx
    SIA->>Mujarrad: GET validate invitation token
    Mujarrad-->>SIA: { valid, orgId, orgName }

    alt Invitee has no account
        SIA->>Invitee: "Join [OrgName] — Sign in with Google to continue"
        Invitee->>SIA: Clicks Google Sign In
        Note over SIA,Mujarrad: Same auth flow as Scenario 1
        Mujarrad-->>SIA: { token, user, isNewUser: true }
        SIA->>Mujarrad: POST create membership { userId, orgId, role: member }
        SIA->>Mujarrad: PUT invitation status → accepted
        SIA->>Invitee: Redirect to /home (sees org dashboard)
    else Invitee already has account
        SIA->>Invitee: "Join [OrgName] — Sign in to continue"
        Invitee->>SIA: Signs in with Google
        Mujarrad-->>SIA: { token, user, isNewUser: false }
        SIA->>Mujarrad: POST create membership { userId, orgId, role: member }
        SIA->>Mujarrad: PUT invitation status → accepted
        SIA->>Invitee: Redirect to /home (sees org dashboard)
    end

    SIA->>Owner: Notification: "[Invitee] joined your organization"
```

---

## 4. Admin Verifies Partner

```mermaid
sequenceDiagram
    actor Admin as SIA Admin
    participant SIA as SIA Portal (Admin Panel)
    participant Mujarrad as Mujarrad Backend

    Admin->>SIA: Opens /admin → Verification Queue
    SIA->>Mujarrad: GET unverified partner profiles
    Mujarrad-->>SIA: List of partners with uploaded documents

    Admin->>SIA: Clicks partner to review
    SIA->>Mujarrad: GET partner profile + documents
    Mujarrad-->>SIA: Profile data + document URLs
    SIA->>Admin: Shows profile details + document previews

    alt Approve
        Admin->>SIA: Clicks "Approve" + optional note
        SIA->>Mujarrad: PUT partner profile { is_verified: true }
        SIA->>Mujarrad: Create notification for partner: "Your profile has been verified"
        Mujarrad-->>SIA: Updated
        SIA->>Admin: Partner moved to "Verified" list. Badge visible on partner card
    else Reject
        Admin->>SIA: Clicks "Reject" + reason
        SIA->>Mujarrad: Create notification for partner: "Verification needs attention: [reason]"
        SIA->>Admin: Partner stays in queue with rejection note
    end
```

---

## 5. Admin Creates Match

```mermaid
sequenceDiagram
    actor Admin as SIA Admin
    participant SIA as SIA Portal (Admin Panel)
    participant Mujarrad as Mujarrad Backend

    Admin->>SIA: Opens /admin → Create Match
    SIA->>Mujarrad: GET all verified partners
    Mujarrad-->>SIA: Partner list

    Admin->>SIA: Searches and selects Partner A (e.g., Saudi investor)
    Admin->>SIA: Searches and selects Partner B (e.g., Malaysian company)
    Admin->>SIA: Enters match reason + score
    Admin->>SIA: Clicks "Create Match"

    SIA->>Mujarrad: POST create match node { partner_a, partner_b, reason, score }
    Mujarrad-->>SIA: { matchId }

    SIA->>Mujarrad: Create notification for Partner A: "New match suggestion: [Partner B]"
    SIA->>Mujarrad: Create notification for Partner B: "New match suggestion: [Partner A]"

    Note over SIA: Both partners see match card in /matches and Action Required on /home
```

---

## 6. Partner Responds to Match (Two-Way Acceptance)

```mermaid
sequenceDiagram
    actor PartnerA as Partner A
    actor PartnerB as Partner B
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    Note over PartnerA: Partner A sees match on dashboard
    PartnerA->>SIA: Opens /matches → views match card for Partner B
    SIA->>Mujarrad: GET match details + Partner B public profile
    Mujarrad-->>SIA: Match card data

    alt Partner A accepts
        PartnerA->>SIA: Clicks "Accept"
        SIA->>Mujarrad: PUT match { status: accepted_a }
        SIA->>Mujarrad: Notify Partner B: "Partner A is interested in connecting"
    else Partner A declines
        PartnerA->>SIA: Clicks "Decline"
        SIA->>Mujarrad: PUT match { status: declined }
        Note over SIA: Match closed. No notification to Partner B
    end

    Note over PartnerB: Partner B sees updated match
    PartnerB->>SIA: Opens /matches → views match card for Partner A

    alt Partner B also accepts
        PartnerB->>SIA: Clicks "Accept"
        SIA->>Mujarrad: PUT match { status: mutual }

        Note over SIA: MUTUAL MATCH — Create Relationship
        SIA->>Mujarrad: POST create relationship { party_a, party_b, status: introduced }
        SIA->>Mujarrad: POST relationship event { type: status_change, desc: "Relationship created from mutual match" }
        SIA->>Mujarrad: Notify both: "You're connected! View your new relationship"

        SIA->>PartnerA: Relationship card appears on /home
        SIA->>PartnerB: Relationship card appears on /home
    else Partner B declines
        PartnerB->>SIA: Clicks "Decline"
        SIA->>Mujarrad: PUT match { status: declined }
    end
```

---

## 7. Relationship Status Progression

```mermaid
sequenceDiagram
    actor PartyA as Party A
    actor PartyB as Party B
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    Note over PartyA,PartyB: Current status: "introduced"

    PartyA->>SIA: Opens /relationships/:id
    SIA->>Mujarrad: GET relationship detail + timeline
    Mujarrad-->>SIA: Relationship data

    Note over PartyA: Wants to advance to "engaged"
    PartyA->>SIA: Clicks "Propose status: Engaged"
    SIA->>Mujarrad: POST relationship event { type: status_change_proposed, to: engaged }
    SIA->>Mujarrad: Notify Party B: "Party A proposes advancing to Engaged"

    PartyB->>SIA: Sees notification → opens relationship

    alt Party B confirms
        PartyB->>SIA: Clicks "Confirm — Engaged"
        SIA->>Mujarrad: PUT relationship { status: engaged }
        SIA->>Mujarrad: POST relationship event { type: status_change, from: introduced, to: engaged }
        SIA->>Mujarrad: Notify both: "Relationship advanced to Engaged"

        Note over SIA: "Start Integration Journey" button now visible
    else Party B declines
        PartyB->>SIA: Clicks "Not yet"
        SIA->>Mujarrad: POST relationship event { type: status_change_declined }
        SIA->>Mujarrad: Notify Party A: "Party B is not ready to advance"
    end
```

---

## 8. Document Upload & Signature Flow

```mermaid
sequenceDiagram
    actor Admin as SIA Admin
    actor SignerA as Signer A
    actor SignerB as Signer B
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    Note over Admin: Upload document to a relationship/journey
    Admin->>SIA: Opens relationship/journey → Upload Document
    Admin->>SIA: Selects file (NDA, MOU, term sheet)
    SIA->>Mujarrad: POST create document node { file, relationship_id, journey_tier_id }
    Mujarrad-->>SIA: { documentId }

    Note over Admin: Request signatures
    Admin->>SIA: Clicks "Request Signatures"
    Admin->>SIA: Selects signers: Signer A + Signer B
    Admin->>SIA: Marks as stage gate: Yes
    SIA->>Mujarrad: POST create signature_request { document_id, signers: [A, B], is_stage_gate: true }
    SIA->>Mujarrad: Notify Signer A: "Signature requested on [document]"
    SIA->>Mujarrad: Notify Signer B: "Signature requested on [document]"

    Note over SignerA: Signs document
    SignerA->>SIA: Sees "Action Required: Sign NDA" on /home
    SignerA->>SIA: Clicks → opens document preview
    SignerA->>SIA: Reviews document
    SignerA->>SIA: Draws signature on canvas
    SignerA->>SIA: Clicks "Submit Signature"
    SIA->>SIA: Capture: signature image + timestamp + IP + document hash
    SIA->>Mujarrad: POST create signature { request_id, signer: A, signature_data, ip, hash, timestamp }
    SIA->>Mujarrad: POST relationship event { type: signature_completed, signer: A }

    Note over SignerB: Signs document
    SignerB->>SIA: Same flow as Signer A
    SIA->>Mujarrad: POST create signature { request_id, signer: B, ... }

    Note over SIA: All signers complete
    SIA->>Mujarrad: PUT signature_request { status: completed }
    SIA->>Mujarrad: POST relationship event { type: document_fully_signed }

    alt Is stage gate
        SIA->>Mujarrad: PUT journey tier { status: completed }
        SIA->>Mujarrad: PUT journey { current_tier: next_tier }
        SIA->>Mujarrad: Notify both parties: "Tier completed. Journey advanced"
    end
```

---

## 9. Start Integration Journey

```mermaid
sequenceDiagram
    actor PartyA as Party A
    actor PartyB as Party B
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    Note over PartyA,PartyB: Relationship status = "engaged"

    PartyA->>SIA: Opens /relationships/:id
    PartyA->>SIA: Clicks "Start Integration Journey"
    SIA->>Mujarrad: POST create journey_proposal { relationship_id, proposed_by: A }
    SIA->>Mujarrad: Notify Party B: "Party A wants to start an Integration Journey"

    PartyB->>SIA: Sees notification → opens relationship
    PartyB->>SIA: Clicks "Confirm — Start Journey"

    SIA->>Mujarrad: POST create integration_journey { relationship_id, current_tier: 1, status: active }
    SIA->>Mujarrad: POST create journey_tier { journey_id, tier: 1, status: in_progress }
    SIA->>Mujarrad: POST relationship event { type: journey_started }
    SIA->>Mujarrad: Notify both: "Integration Journey started — Tier 1: Service Level"

    Note over SIA: Tier 1 — Service Level
    PartyA->>SIA: Opens /integrations/:id
    SIA->>PartyA: Shows: Tier 1 form (define first action/service)
    PartyA->>SIA: Fills: action description, deliverables, timeline
    SIA->>Mujarrad: PUT journey_tier { tier_data: { ... } }

    Note over SIA: Both parties sign off
    SIA->>Mujarrad: POST signature_request for Tier 1 sign-off document
    Note over PartyA,PartyB: Signature flow (see Scenario 8)

    Note over SIA: After both sign → Tier 1 complete
    SIA->>Mujarrad: PUT journey_tier 1 { status: completed }
    SIA->>Mujarrad: POST create journey_tier { tier: 2, status: in_progress }
    SIA->>Mujarrad: PUT journey { current_tier: 2 }
    SIA->>Mujarrad: Notify both + SIA team: "Tier 1 complete. Advancing to Tier 2: Business Level"

    Note over SIA: Tier 2 — Business Level
    SIA->>PartyA: Shows: MOU upload, project scope, milestones
    Note over SIA: SIA team notified to facilitate
```

---

## 10. Portfolio Management

```mermaid
sequenceDiagram
    actor User
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    User->>SIA: Opens /portfolio
    SIA->>Mujarrad: GET portfolio assets for org
    Mujarrad-->>SIA: Asset list

    alt Add new asset
        User->>SIA: Clicks "+ Add Asset"
        SIA->>User: Form: name, type, status, sector, valuation, description
        User->>SIA: Fills and submits
        SIA->>Mujarrad: POST create portfolio_asset node { org_id, ... }
        Mujarrad-->>SIA: { assetId }
        SIA->>User: Asset added to portfolio dashboard
    end

    alt Share portfolio
        User->>SIA: Clicks "Share Portfolio"
        User->>SIA: Selects which assets to include
        SIA->>Mujarrad: POST create share_token { assets, permissions: read_only }
        Mujarrad-->>SIA: { shareUrl }
        SIA->>User: Shareable link generated
    end
```

---

## 11. Financial Model Publish & Investor Interest

```mermaid
sequenceDiagram
    actor Startup
    actor Investor
    participant SIA as SIA Portal
    participant Mujarrad as Mujarrad Backend

    Note over Startup: Publishes financial model
    Startup->>SIA: Opens /financial-model
    SIA->>Startup: Guided form: model type, revenue, funding ask, use of funds, runway, team, traction
    Startup->>SIA: Fills all fields → Submit
    SIA->>Mujarrad: POST create financial_model node { org_id, ... }
    Mujarrad-->>SIA: { modelId }
    SIA->>Startup: "Model published. Visible only to matched investors"

    Note over Investor: Has mutual match with Startup
    Investor->>SIA: Opens /matches or /relationships
    SIA->>Mujarrad: GET check if mutual match exists with Startup
    Mujarrad-->>SIA: Yes — mutual match

    SIA->>Mujarrad: GET Startup's financial model
    Mujarrad-->>SIA: Financial summary card data
    SIA->>Investor: Shows standardised financial summary card

    Investor->>SIA: Clicks "Express Interest"
    SIA->>Mujarrad: POST create investor_interest { model_id, investor_org_id }
    SIA->>Mujarrad: Notify Startup: "[Investor] is interested in your financial model"

    alt No existing relationship
        SIA->>Mujarrad: POST create relationship { investor, startup, status: introduced }
        SIA->>Mujarrad: Notify both: "Relationship initiated via financial model interest"
    end

    Note over Startup: Updates model later
    Startup->>SIA: Edits financial model → Save
    SIA->>Mujarrad: PUT financial_model (new version)
    SIA->>Mujarrad: GET all investors who expressed interest
    SIA->>Mujarrad: Notify each investor: "Financial model updated by [Startup]"
```

---

## 12. Admin Operations Overview

```mermaid
sequenceDiagram
    actor Admin as SIA Admin
    participant SIA as SIA Portal (Admin Panel)
    participant Mujarrad as Mujarrad Backend

    Admin->>SIA: Opens /admin

    Note over Admin: Dashboard overview
    SIA->>Mujarrad: GET counts: partners, matches, relationships, journeys, models
    Mujarrad-->>SIA: Analytics data
    SIA->>Admin: Shows: 45 partners | 12 matches | 8 relationships | 3 journeys | 6 models

    Note over Admin: Verification queue
    Admin->>SIA: Opens verification tab
    SIA->>Mujarrad: GET unverified partners
    SIA->>Admin: Shows queue (see Scenario 4)

    Note over Admin: Create manual match
    Admin->>SIA: Opens matching tab (see Scenario 5)

    Note over Admin: Relationship oversight
    Admin->>SIA: Opens relationships tab
    SIA->>Mujarrad: GET all relationships with status + tier
    SIA->>Admin: Table: all relationships, sortable by status/tier/activity

    Note over Admin: Send announcement
    Admin->>SIA: Opens announcements tab
    Admin->>SIA: Composes message, selects audience (all / by type / specific)
    SIA->>Mujarrad: POST create notifications for selected audience
    SIA->>Admin: "Announcement sent to 45 partners"
```
