# Connection Visibility, Lucid Fixes, Items Model & UX Improvements

**Date:** May 2, 2026
**Source:** Founder feedback session
**Status:** REQUIREMENTS — no code written

---

## 1. Connection Map — Show Relationships Visually

### REQ-MAP-1: Map Shows Org-to-Org Connections
The map page currently shows org pins by location. It must also show **connections** (matches/engagements) as lines between orgs.

**Required:**
- When two matched/engaged orgs both have locations, draw a line/arc between their pins
- Line color by status: pending match (amber dashed), mutual match (green), active engagement (gold solid)
- Hovering a line shows: match reason or engagement title + status

### REQ-MAP-2: Filter Map by Organization
User selects one or more organizations from a dropdown. The map shows:
- Selected org(s) highlighted
- All their connections (matches + engagements) shown as lines
- Connected orgs appear even if not in the filter
- Unconnected orgs are dimmed or hidden

### REQ-MAP-3: Show Common Connections
When 2+ orgs are selected, highlight **shared connections** — orgs that are matched/engaged with ALL selected orgs. This reveals potential multi-party opportunities.

---

## 2. Lucid Quick-Add — Fixes & Enhancements

### REQ-LUCID-1: Fix Pop-Up Menu (Bug)
The Lucid button is not bringing up the correct pop-up menu. Debug and fix the Dialog/trigger mechanism.

### REQ-LUCID-2: Context is Mandatory — No Creation in Vacuum
Currently Lucid allows creating entities without specifying a parent. This is wrong:
- A **note** must belong to an organization OR engagement — show org/engagement selector as required
- A **task** must be linked to an organization (engagement optional) — org selector required
- A **contact** must belong to an organization — org selector required
- An **engagement** must belong to an organization — org selector required
- A **match** requires two orgs — both selectors required

When Lucid is opened FROM an org detail page, the org is pre-filled. When opened globally, the org selector must appear and is required.

### REQ-LUCID-3: Contextual Sub-Types for Notes
When creating a note, show a sub-type selector:
- Organization note (general note about the org)
- Engagement note (note about a specific engagement)
- Task note (note about a specific task)

The sub-type determines which entity the note is linked to via FK.

---

## 3. Organization Items — Asset/Capability Registry

### REQ-ITEMS-1: Items Entity
A new entity: **items** — representing assets, capabilities, products, services, certifications, or any discrete thing an organization has or needs.

```
items {
  id                  UUID
  organizationId      FK → orgs     which org owns this
  title               string        "Cyberjaya Data Center Tier III"
  type                enum          asset | capability | product | service | certification | need | liability
  category            string?       grouping label (e.g., "infrastructure", "financing", "talent")
  description         string?       details
  value               string?       monetary or qualitative value
  status              enum          active | inactive | pending
  tags                string[]      free-form labels
  createdBy           string
}
```

### REQ-ITEMS-2: Items Tab on Organization Detail
Each org's detail page gets an "Items" tab showing all items belonging to that org. Create/edit/delete with inline or form UI.

### REQ-ITEMS-3: Items as Matching Criteria
When creating a match, the admin can select which items from Org A and Org B are relevant to the match. This creates a more specific connection: "Org A's data center infrastructure matches Org B's capital deployment need."

Match entity gets an optional `itemIds` field (array of item IDs from both orgs) that explains WHAT is being matched, not just WHO.

### REQ-ITEMS-4: Items Grouping
Items can be grouped by `category`. The items view should support grouping/filtering by category. Groups of items across orgs can represent match opportunities.

### REQ-ITEMS-5: Add Items via Lucid
Lucid type selector gets a 6th type: "Item" — creates an item linked to an organization.

---

## 4. Matching Enhancements

### REQ-MATCH-ENH-1: Match Creates Mujarrad Attribute
When a match is created, it should create a proper Mujarrad attribute (not just store FKs in nodeDetails). The attribute connects Org A ↔ Org B with:
- verb: "matched_with"
- metadata: { matchId, category, score, status, itemIds }

This makes the connection traversable in the knowledge graph — you can query "what is Org X connected to?" via attribute traversal.

### REQ-MATCH-ENH-2: Accept with Conditions
When accepting a match, the accepting party can add conditions/inquiries:
- "I accept but I need X from you"
- "I have questions about Y"
- These become the first notes on the auto-created engagement
- The engagement starts with these conditions visible to both parties

### REQ-MATCH-ENH-3: Match Detail Shows Matched Items
If itemIds are specified on the match, the detail page shows the specific items from each org that are being matched, not just the org names.

---

## 5. Engagement as Communication Channel

### REQ-ENG-COMM-1: Engagement Timeline is a Conversation
The engagement detail page should feel like a managed conversation:
- Notes are the messages (already built)
- Stage changes are milestones
- Tasks are action items
- Documents are attachments
- The timeline shows all of these interleaved chronologically

### REQ-ENG-COMM-2: Back-and-Forth Stage Movement
Engagements can move backward in stages (negotiating → in_progress) when parties need to revisit terms. The pipeline already supports this via drag. The engagement detail should show stage history with reasons for each change.

---

## 6. Documents vs. Signatures — Navigation Redesign

### REQ-NAV-1: Separate Documents from Signatures
Currently the sidebar shows "Documents" which links to signing requests. These are two different things:
- **Documents** = files/PDFs stored per organization (already in org detail Files tab)
- **Signatures** = signing requests with multi-signer workflow

**Options:**
- A: Rename "Documents" to "Signatures" in the sidebar (it's what it actually is)
- B: Create a separate "Documents" page that aggregates all files across all orgs (a global file browser)
- C: Split into "Documents" (file browser) and "Signatures" (signing requests) as two sidebar items

### REQ-NAV-2: Per-Organization Document Library
Each organization should have its own document library (the Files tab already does this). Consider whether a top-level "Documents" page adds value as an aggregated view across orgs.

---

## 7. Bugs

### BUG-1: Organization ID Shown Instead of Name
In the activity feed/marquee (dashboard or notification center), organization IDs are displayed instead of organization names. The activity events store `organizationId` but the display should resolve it to the org name.

**Where to check:**
- Dashboard activity feed
- Notification center alerts
- Any table/list showing organization references

### BUG-2: All Tables Must Show Org Name, Not ID
Audit every table in the portal. Wherever `organizationId` or `organizationAId`/`organizationBId` appears in a column, it must be resolved to the org name via lookup.

**Pages to check:**
- Task list (org column)
- Engagement list (org column)
- Contact list (org column)
- Match list (org A/B columns)
- Signing request list (if org column exists)
- Dashboard priority queue
- Dashboard recent matches

---

## 8. Summary

| # | Area | Items | Priority |
|---|------|-------|----------|
| 1 | Map connections | 3 requirements | HIGH |
| 2 | Lucid fixes | 3 requirements | CRITICAL (broken) |
| 3 | Organization items | 5 requirements | HIGH |
| 4 | Matching enhancements | 3 requirements | MEDIUM |
| 5 | Engagement communication | 2 requirements | MEDIUM |
| 6 | Nav redesign (docs vs sigs) | 2 requirements | MEDIUM |
| 7 | Bugs | 2 bugs | CRITICAL |
| **Total** | | **20 items** | |

---

## Sprint Plan

### Sprint 1: Bugs + Lucid Fix (Day 1)
- [ ] BUG-1: Fix org ID → name in activity feed
- [ ] BUG-2: Audit all tables for org name resolution
- [ ] REQ-LUCID-1: Fix Lucid pop-up mechanism
- [ ] REQ-LUCID-2: Make org selector required (no creation in vacuum)
- [ ] REQ-LUCID-3: Note sub-types (org/engagement/task)

### Sprint 2: Items Entity + Lucid Item Type (Day 2)
- [ ] REQ-ITEMS-1: Items schema, registry, resource
- [ ] REQ-ITEMS-2: Items tab on org detail
- [ ] REQ-ITEMS-5: Add "Item" to Lucid type selector
- [ ] REQ-ITEMS-4: Items grouping by category

### Sprint 3: Map Connections + Match Enhancements (Day 3)
- [ ] REQ-MAP-1: Draw connection lines on map
- [ ] REQ-MAP-2: Filter map by organization
- [ ] REQ-MAP-3: Common connections highlight
- [ ] REQ-MATCH-ENH-1: Match creates Mujarrad attribute
- [ ] REQ-ITEMS-3: Items as matching criteria

### Sprint 4: Communication + Nav (Day 4)
- [ ] REQ-MATCH-ENH-2: Accept with conditions
- [ ] REQ-MATCH-ENH-3: Match shows matched items
- [ ] REQ-ENG-COMM-1: Engagement timeline as conversation
- [ ] REQ-ENG-COMM-2: Stage history with reasons
- [ ] REQ-NAV-1: Resolve documents vs signatures
- [ ] REQ-NAV-2: Per-org document library

---

## Status

**REQUIREMENTS ONLY — no code written. Awaiting approval.**
