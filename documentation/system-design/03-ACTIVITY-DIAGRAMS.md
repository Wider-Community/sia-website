# Activity Diagrams

End-to-end user journeys showing every decision point and system action.

---

## 1. Complete User Journey — First Visit to First Integration

```mermaid
flowchart TD
    START([User visits siaportal.com]) --> LANDING[Sees marketing landing page]
    LANDING --> CTA[Clicks 'Get Started']
    CTA --> LOGIN[/login — Google OAuth/]

    LOGIN --> AUTH{Auth successful?}
    AUTH -->|No| LOGIN
    AUTH -->|Yes| NEW_USER{New user?}

    NEW_USER -->|Yes| ONBOARD[/onboarding/]
    NEW_USER -->|No| HAS_ORG{Has organization?}

    HAS_ORG -->|Yes| HOME[/home — Partner Home/]
    HAS_ORG -->|No| ONBOARD

    ONBOARD --> TYPE[Step 1: Select entity type]
    TYPE --> CREATE_ORG[Step 2: Create organization]
    CREATE_ORG --> PROFILE[Step 3: Fill profile details]
    PROFILE --> DOCS[Step 4: Upload documents]
    DOCS --> COMPLETE[Step 5: Profile created]
    COMPLETE --> HOME

    HOME --> ACTIONS{What does user do?}

    ACTIONS -->|Complete profile| EDIT_PROFILE[Edit profile / upload more docs]
    EDIT_PROFILE --> HOME

    ACTIONS -->|Invite team| INVITE[/settings — Invite member/]
    INVITE --> HOME

    ACTIONS -->|View matches| MATCHES[/matches/]
    MATCHES --> MATCH_ACTION{Accept or decline?}
    MATCH_ACTION -->|Accept| WAIT_MUTUAL{Other party accepted?}
    MATCH_ACTION -->|Decline| MATCHES
    WAIT_MUTUAL -->|Not yet| MATCHES
    WAIT_MUTUAL -->|Yes — Mutual| REL_CREATED[Relationship created]
    REL_CREATED --> REL_DETAIL[/relationships/:id/]

    ACTIONS -->|View relationships| REL_LIST[/relationships/]
    REL_LIST --> REL_DETAIL

    REL_DETAIL --> REL_ACTIONS{What next?}
    REL_ACTIONS -->|Log meeting| LOG_MEETING[Add meeting entry]
    LOG_MEETING --> REL_DETAIL
    REL_ACTIONS -->|Share document| UPLOAD_DOC[Upload document]
    UPLOAD_DOC --> REL_DETAIL
    REL_ACTIONS -->|Advance status| PROPOSE_STATUS[Propose status change]
    PROPOSE_STATUS --> WAIT_CONFIRM{Other party confirms?}
    WAIT_CONFIRM -->|Yes| STATUS_ADVANCED[Status advanced]
    WAIT_CONFIRM -->|No| REL_DETAIL
    STATUS_ADVANCED --> REL_DETAIL

    REL_ACTIONS -->|Start integration| START_JOURNEY{Status = engaged?}
    START_JOURNEY -->|No| MUST_ENGAGE[Must reach 'engaged' first]
    MUST_ENGAGE --> REL_DETAIL
    START_JOURNEY -->|Yes| PROPOSE_JOURNEY[Propose integration journey]
    PROPOSE_JOURNEY --> WAIT_JOURNEY{Other party confirms?}
    WAIT_JOURNEY -->|No| REL_DETAIL
    WAIT_JOURNEY -->|Yes| JOURNEY[/integrations/:id/]

    JOURNEY --> TIER1[Tier 1: Define service action]
    TIER1 --> SIGN_T1[Both parties sign off]
    SIGN_T1 --> TIER1_DONE[Tier 1 complete]
    TIER1_DONE --> TIER2[Tier 2: MOU + project scope]
    TIER2 --> SIGN_T2[Both parties sign MOU]
    SIGN_T2 --> TIER2_DONE[Tier 2 complete]
    TIER2_DONE --> INTEGRATION_ACTIVE([Partnership formalized])

    ACTIONS -->|Manage portfolio| PORTFOLIO[/portfolio/]
    ACTIONS -->|Publish financial model| FIN_MODEL[/financial-model/]
```

---

## 2. Authentication & Access Control

```mermaid
flowchart TD
    REQUEST([User requests any /protected page]) --> CHECK{JWT in localStorage?}

    CHECK -->|No| REDIRECT[Redirect to /login]
    REDIRECT --> SAVE_PATH[Save intended path in localStorage]
    SAVE_PATH --> GOOGLE[Show Google Sign In button]
    GOOGLE --> OAUTH[Google OAuth popup]
    OAUTH --> TOKEN{ID token received?}
    TOKEN -->|No — cancelled| GOOGLE
    TOKEN -->|Yes| MUJARRAD[POST /api/auth/oauth/google]
    MUJARRAD --> VALID{Token valid?}
    VALID -->|No| ERROR[Show error message]
    ERROR --> GOOGLE
    VALID -->|Yes| STORE[Store JWT + user in Zustand + localStorage]
    STORE --> NEW{isNewUser?}
    NEW -->|Yes| ONBOARD[Redirect to /onboarding]
    NEW -->|No| SAVED{Has saved path?}
    SAVED -->|Yes| RESTORE[Redirect to saved path]
    SAVED -->|No| HOME[Redirect to /home]

    CHECK -->|Yes| EXPIRED{JWT expired?}
    EXPIRED -->|No| ALLOW[Allow access to page]
    EXPIRED -->|Yes| CLEAR[Clear JWT]
    CLEAR --> REDIRECT
```

---

## 3. Partner Onboarding — All 4 Paths

```mermaid
flowchart TD
    START([/onboarding]) --> TYPE{Select entity type}

    TYPE -->|GCC Investor| INV_ORG[Org: name, country, sector]
    TYPE -->|Malaysian Company| COM_ORG[Org: name, country, registration #]
    TYPE -->|Government Entity| GOV_ORG[Org: ministry/agency name, country]
    TYPE -->|Startup| STP_ORG[Org: name, country, stage]

    INV_ORG --> INV_PROFILE[Investment capacity, sector focus, stage preference, integration tier interest]
    COM_ORG --> COM_PROFILE[Sector, project count, funding need, infrastructure type]
    GOV_ORG --> GOV_PROFILE[Programs, bilateral interests, mandate type]
    STP_ORG --> STP_PROFILE[Runway, funding ask, team size, traction metrics]

    INV_PROFILE --> DOCS
    COM_PROFILE --> DOCS
    GOV_PROFILE --> DOCS
    STP_PROFILE --> DOCS

    DOCS[Upload documents] --> CALC[Calculate completeness score]
    CALC --> SAVE[Save to Mujarrad: org + profile + docs]
    SAVE --> NOTIFY[Notify SIA admin: new partner pending verification]
    NOTIFY --> HOME([Redirect to /home])

    HOME --> BADGE{Profile verified by admin?}
    BADGE -->|Not yet| PENDING[Badge: Pending Verification]
    BADGE -->|Yes| VERIFIED[Badge: Verified Partner]
```

---

## 4. Matching — Full Lifecycle

```mermaid
flowchart TD
    ADMIN_CREATE([Admin creates match]) --> MATCH_NODE[Match created in Mujarrad]
    MATCH_NODE --> NOTIFY_A[Notify Partner A]
    MATCH_NODE --> NOTIFY_B[Notify Partner B]

    NOTIFY_A --> A_SEES[A sees match card on /home + /matches]
    NOTIFY_B --> B_SEES[B sees match card on /home + /matches]

    A_SEES --> A_DECISION{Partner A decision}
    A_DECISION -->|Accept| A_ACCEPTED[Match status: accepted_a]
    A_DECISION -->|Decline| DECLINED_A[Match status: declined — closed]

    A_ACCEPTED --> B_DECISION{Partner B decision}
    B_SEES --> B_DECISION
    B_DECISION -->|Accept| MUTUAL[Match status: MUTUAL]
    B_DECISION -->|Decline| DECLINED_B[Match status: declined — closed]

    MUTUAL --> CREATE_REL[Create Relationship — status: introduced]
    CREATE_REL --> EVENT[Log event: relationship created from match]
    EVENT --> NOTIFY_BOTH[Notify both: You're connected!]
    NOTIFY_BOTH --> REL_ACTIVE([Relationship visible on both dashboards])
```

---

## 5. Relationship Progression

```mermaid
flowchart TD
    INTRODUCED([Status: Introduced]) --> ENGAGE_PROPOSE{Either party proposes 'Engaged'}
    ENGAGE_PROPOSE -->|Proposed| ENGAGE_CONFIRM{Other party confirms?}
    ENGAGE_CONFIRM -->|Yes| ENGAGED([Status: Engaged])
    ENGAGE_CONFIRM -->|No| INTRODUCED

    ENGAGED --> JOURNEY_OPTION{Start integration journey?}
    JOURNEY_OPTION -->|Yes| JOURNEY([Integration Journey begins])
    JOURNEY_OPTION -->|No| NEGOTIATE_PROPOSE{Propose 'Negotiating'}

    NEGOTIATE_PROPOSE -->|Proposed| NEGOTIATE_CONFIRM{Other party confirms?}
    NEGOTIATE_CONFIRM -->|Yes| NEGOTIATING([Status: Negotiating])
    NEGOTIATE_CONFIRM -->|No| ENGAGED

    NEGOTIATING --> FORMALISE_PROPOSE{Propose 'Formalised'}
    FORMALISE_PROPOSE -->|Proposed| FORMALISE_CONFIRM{Other party confirms?}
    FORMALISE_CONFIRM -->|Yes| FORMALISED([Status: Formalised])
    FORMALISE_CONFIRM -->|No| NEGOTIATING

    FORMALISED --> ACTIVE_PROPOSE{Propose 'Active'}
    ACTIVE_PROPOSE -->|Proposed| ACTIVE_CONFIRM{Other party confirms?}
    ACTIVE_CONFIRM -->|Yes| ACTIVE([Status: Active Partnership])
    ACTIVE_CONFIRM -->|No| FORMALISED

    Note1[Any status can become 'Dormant' after 30 days inactivity]
    INTRODUCED -.->|30d inactive| DORMANT([Status: Dormant])
    ENGAGED -.->|30d inactive| DORMANT
    NEGOTIATING -.->|30d inactive| DORMANT
```

---

## 6. Integration Journey — Tier Progression

```mermaid
flowchart TD
    START([Both parties confirm — Journey starts]) --> T1

    subgraph TIER1 [Tier 1 — Service Level]
        T1[Define first service/action] --> T1_FORM[Fill: action, deliverables, timeline]
        T1_FORM --> T1_SIGN[Both parties sign off digitally]
        T1_SIGN --> T1_DONE{All signed?}
        T1_DONE -->|No| T1_WAIT[Wait for remaining signatures]
        T1_WAIT --> T1_SIGN
        T1_DONE -->|Yes| T1_COMPLETE[Tier 1 COMPLETE]
    end

    T1_COMPLETE --> T2

    subgraph TIER2 [Tier 2 — Business Level]
        T2[Upload / draft MOU] --> T2_SCOPE[Define project scope]
        T2_SCOPE --> T2_LEAD[Assign project lead]
        T2_LEAD --> T2_MILESTONES[Set milestones]
        T2_MILESTONES --> T2_SIA[SIA team notified to facilitate]
        T2_SIA --> T2_SIGN[Both parties + SIA sign MOU]
        T2_SIGN --> T2_DONE{All signed?}
        T2_DONE -->|No| T2_WAIT[Wait for signatures]
        T2_WAIT --> T2_SIGN
        T2_DONE -->|Yes| T2_COMPLETE[Tier 2 COMPLETE]
    end

    T2_COMPLETE --> MVP_END([MVP scope ends here])

    MVP_END -.->|Phase 2| T3

    subgraph TIER3 [Tier 3 — Company Level — Phase 2]
        T3[Co-founder matching] --> T3_EQUITY[Define equity split + roles]
        T3_EQUITY --> T3_INCORP[Country of incorporation]
        T3_INCORP --> T3_TERM[SIA generates term sheet]
        T3_TERM --> T3_LEGAL[Legal review required]
        T3_LEGAL --> T3_SIGN[All parties sign]
        T3_SIGN --> T3_COMPLETE[Tier 3 COMPLETE]
    end

    T3_COMPLETE -.-> T4

    subgraph TIER4 [Tier 4 — Regulatory — Phase 2]
        T4{Existing or new regulation?}
        T4 -->|Existing| T4A[4A: SIA assigns regulations + compliance checklist]
        T4 -->|New frontier| T4B[4B: Escalate to SIA gov relations]
        T4A --> T4_COMPLETE[Tier 4 COMPLETE]
        T4B --> T4_COMPLETE
    end

    T4_COMPLETE -.-> T5

    subgraph TIER5 [Tier 5 — Diplomatic — Phase 2]
        T5[SIA admin approval required] --> T5_APPROVE{Approved?}
        T5_APPROVE -->|Yes| T5_BILATERAL[Create bilateral program entry]
        T5_APPROVE -->|No| T5_REJECT[Escalation declined with reason]
        T5_BILATERAL --> T5_COMPLETE[Tier 5 COMPLETE — Full Integration]
    end
```

---

## 7. Digital Signature — Decision Flow

```mermaid
flowchart TD
    UPLOAD([Document uploaded]) --> WHO{Who needs to sign?}
    WHO -->|Single signer| SINGLE[Create signature request — 1 signer]
    WHO -->|Multiple signers| MULTI[Create signature request — N signers]

    SINGLE --> NOTIFY1[Notify signer]
    MULTI --> NOTIFYN[Notify all signers]

    NOTIFY1 --> SIGNER_ACTION
    NOTIFYN --> SIGNER_ACTION

    SIGNER_ACTION{Signer opens document}
    SIGNER_ACTION --> REVIEW[Review document content]
    REVIEW --> SIGN_METHOD{Signature method}
    SIGN_METHOD -->|Draw| CANVAS[Draw on canvas pad]
    SIGN_METHOD -->|Type| TYPE_SIG[Type name — rendered as signature]
    CANVAS --> SUBMIT[Submit signature]
    TYPE_SIG --> SUBMIT

    SUBMIT --> AUDIT[Store: signature + timestamp + IP + doc hash]
    AUDIT --> ALL_DONE{All required signers done?}
    ALL_DONE -->|No| WAIT[Waiting for remaining signers]
    WAIT --> SIGNER_ACTION
    ALL_DONE -->|Yes| FINALIZE[Document finalized — locked]

    FINALIZE --> GATE{Is this a stage gate?}
    GATE -->|No| DONE([Document signed — stored in vault])
    GATE -->|Yes| ADVANCE[Auto-advance tier/stage]
    ADVANCE --> NOTIFY_ALL[Notify all parties: stage advanced]
    NOTIFY_ALL --> DONE2([Stage advanced + document stored])
```

---

## 8. Financial Model — Visibility & Interest

```mermaid
flowchart TD
    STARTUP([Startup publishes financial model]) --> MODEL_CREATED[Model stored in Mujarrad]

    INVESTOR([Investor browses matches/relationships]) --> CHECK{Has mutual match with startup?}
    CHECK -->|No| HIDDEN[Financial model NOT visible]
    CHECK -->|Yes| VISIBLE[Show financial summary card]

    VISIBLE --> INTEREST{Express interest?}
    INTEREST -->|No| BROWSE[Continue browsing]
    INTEREST -->|Yes| SIGNAL[Create investor interest record]
    SIGNAL --> NOTIFY_STARTUP[Notify startup: Investor interested]

    NOTIFY_STARTUP --> REL_CHECK{Relationship exists?}
    REL_CHECK -->|Yes| ADD_EVENT[Add interest event to relationship timeline]
    REL_CHECK -->|No| CREATE_REL[Create new relationship — status: introduced]
    CREATE_REL --> NOTIFY_BOTH[Notify both: connected via financial model interest]

    Note1[When startup updates model]
    MODEL_CREATED -.->|Startup updates| VERSION[New model version created]
    VERSION --> GET_INTERESTED[Get all investors who expressed interest]
    GET_INTERESTED --> NOTIFY_INVESTORS[Notify each: model updated]
```

---

## 9. Org Member Invitation — Complete Flow

```mermaid
flowchart TD
    OWNER([Owner opens /settings]) --> INVITE[Clicks 'Invite Member']
    INVITE --> EMAIL[Enters invitee email]
    EMAIL --> CREATE[Create invitation: token + email + org_id]
    CREATE --> SEND[Send invitation email]

    SEND --> INVITEE([Invitee receives email])
    INVITEE --> CLICK[Clicks invitation link]
    CLICK --> VALIDATE{Token valid and not expired?}
    VALIDATE -->|No — expired| EXPIRED[Show: invitation expired, ask owner to resend]
    VALIDATE -->|Yes| SHOW_ORG[Show: Join {OrgName}]

    SHOW_ORG --> HAS_ACCOUNT{Already has SIA account?}
    HAS_ACCOUNT -->|No| SIGNUP[Sign in with Google — new account created]
    HAS_ACCOUNT -->|Yes| SIGNIN[Sign in with Google — existing account]

    SIGNUP --> JOIN[Add user to org as member]
    SIGNIN --> JOIN
    JOIN --> MARK[Mark invitation as accepted]
    MARK --> NOTIFY_OWNER[Notify owner: {name} joined your organization]
    NOTIFY_OWNER --> HOME([Invitee redirected to /home — sees org dashboard])
```
