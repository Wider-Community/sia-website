# System Design — SIA Portal

## Documents

| # | Document | Description |
|---|----------|-------------|
| 01 | [Domain Model](01-DOMAIN-MODEL.md) | Entity relationship diagram, all data entities and their relationships, Mujarrad graph mapping |
| 02 | [Sequence Diagrams](02-SEQUENCE-DIAGRAMS.md) | 12 scenarios showing exact system interactions: auth, onboarding, matching, relationships, signatures, journeys, portfolio, financial models, admin ops |
| 03 | [Activity Diagrams](03-ACTIVITY-DIAGRAMS.md) | 9 end-to-end user flows with every decision point: complete user journey, auth flow, onboarding paths, matching lifecycle, relationship progression, integration tiers, signature flow, financial model visibility, org invitations |

## How to View

All diagrams use **Mermaid** syntax. They render automatically on:
- GitHub (in markdown preview)
- VS Code (with Mermaid extension)
- [mermaid.live](https://mermaid.live) (paste diagram code)

## Scenario Coverage

| Scenario | Sequence | Activity |
|----------|----------|----------|
| Google login (new + existing user) | #1 | #2 |
| Partner onboarding (4 user types) | #2 | #3 |
| Invite team member to org | #3 | #9 |
| Admin verifies partner | #4 | — |
| Admin creates match | #5 | #4 |
| Two-way match acceptance | #6 | #4 |
| Relationship status progression | #7 | #5 |
| Document upload + signature | #8 | #7 |
| Start integration journey | #9 | #6 |
| Tier 1 → Tier 2 progression | #9 | #6 |
| Portfolio management | #10 | — |
| Financial model + investor interest | #11 | #8 |
| Admin operations overview | #12 | — |
| Complete user journey (end-to-end) | — | #1 |
