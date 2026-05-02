# Design: Portal Intelligence UI — Market Entity Support

## Context

The lead generation pipeline (`data/lead-gen/`) produces enriched company data (team size, services, industries, tech stack, ratings, sources). This data is imported into Mujarrad as `market_entity` organizations. The portal UI currently only understands the original four organization types (partner, investor, vendor, client) and has no concept of intelligence metadata or inter-entity relationships.

This change extends the portal UI to display imported market intelligence data alongside manually created organizations, without altering the underlying data layer (entity-control-layer, MujarradClient, or entity-registry relationships).

## Goals

- Support `market_entity` as a first-class organization type across the portal
- Surface intelligence fields (team size, founded year, hourly rate, ratings, tech stack) on organization detail pages
- Display inter-organization relationships with confidence scores
- Distinguish imported vs. hand-created organizations in the list view

## Non-Goals

- Modifying `mujarrad-client.ts` or its transport logic
- Changing `entity-control-layer.ts` operations or validation
- Altering PortalApp resource definitions or routing
- Changing `entity-registry.ts` relationship definitions
- Building the import pipeline itself (that's a separate change)

---

## Changes

### Change 1: Extend Organization Type Enum

**What**: Add `"market_entity"` to the type enum so the system accepts imported organizations.

**Files touched**:

| File | Change |
|------|--------|
| `app/src/portal/schemas.ts` | Already done — enum includes `"market_entity"` |
| `app/src/portal/pages/organizations/OrganizationFormPage.tsx` | Add `"market_entity"` to the `<Select>` options |
| `app/src/portal/pages/organizations/OrganizationListPage.tsx` | Add `"market_entity"` to the type filter dropdown |

**Schema** (already in place):
```typescript
type: z.enum(["partner", "investor", "vendor", "client", "market_entity"])
```

**UI label**: "Market Entity" with a distinct badge color (e.g., `variant: "outline"` with a teal/cyan accent).

---

### Change 2: Intelligence Fields on Detail Page — Overview Tab

**What**: Conditionally render market intelligence fields in the Overview tab of `OrganizationDetailPage`. Fields only appear when populated — existing organizations without this data look unchanged.

**File**: `app/src/portal/pages/organizations/OrganizationDetailPage.tsx`

**Fields to display**:

| Field | Display | Type |
|-------|---------|------|
| `team_size` | "Team Size" with badge | `string` (e.g., "50-249") |
| `founded_year` | "Founded" | `string` (e.g., "2015") |
| `hourly_rate` | "Hourly Rate" | `string` (e.g., "$50-$99") |
| `google_rating` | Star rating + count | `number` + `google_reviews_count` |
| `linkedin_url` | Clickable LinkedIn icon/link | `string` (URL) |
| `services` | Tag chips | `string[]` |
| `industries_served` | Tag chips | `string[]` |
| `tech_stack` | Tag chips | `string[]` |
| `data_sources` | Source badges (see Change 4) | `string[]` |

**Layout**: A "Market Intelligence" card section below the existing overview info. Wrapped in a conditional:

```tsx
{org?.team_size || org?.founded_year || org?.services?.length ? (
  <Card>
    <CardHeader><CardTitle>Market Intelligence</CardTitle></CardHeader>
    <CardContent>
      {/* field grid */}
    </CardContent>
  </Card>
) : null}
```

**Design rules**:
- 2-column grid on desktop, 1-column on mobile
- Empty/null fields are not rendered (no "N/A" placeholders)
- Array fields (services, industries, tech_stack) render as `<Badge variant="secondary">` chips
- Google rating renders as a star icon + numeric value + review count in parentheses

---

### Change 3: Relationships Tab

**What**: Add a "Relationships" tab to `OrganizationDetailPage` that shows inter-organization relationships imported from market intelligence analysis.

**File**: `app/src/portal/pages/organizations/OrganizationDetailPage.tsx`

**Data fetching**:
```tsx
import { useCustom } from "@refinedev/core";

// Fetch Mujarrad attributes for this organization node
const { data: attributesData } = useCustom({
  url: `${apiUrl}/nodes/${id}/attributes`,
  method: "get",
  queryOptions: { enabled: !!id },
});
```

**Filtering**: Exclude internal structural verbs used by the entity-control-layer:
```typescript
const INTERNAL_VERBS = ["belongs_to", "relates_to", "contains", "assigned_to"];
const relationships = attributes.filter(
  (attr) => !INTERNAL_VERBS.includes(attr.name)
);
```

**Display — table columns**:

| Column | Content |
|--------|---------|
| Relationship Type | Badge with verb (e.g., "competes_with", "partners_with", "supplies_to") |
| Linked Organization | Clickable name linking to that org's detail page |
| Confidence | Visual progress bar (0-100%) + percentage text |
| Signals | Array of small badges showing evidence sources (e.g., "shared_clients", "same_sector", "co_location") |

**Empty state**: When no relationships exist (or all are internal verbs), show `<EmptyState icon={Users} title="No relationships" description="Relationships will appear here when market intelligence identifies connections between organizations." />`

**Confidence bar component**:
```tsx
<div className="flex items-center gap-2">
  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
    <div
      className="h-full rounded-full bg-primary"
      style={{ width: `${confidence}%` }}
    />
  </div>
  <span className="text-xs text-muted-foreground">{confidence}%</span>
</div>
```

---

### Change 4: Source Badge Column on List Page

**What**: Add a "Source" column to `OrganizationListPage` that shows where each organization came from.

**File**: `app/src/portal/pages/organizations/OrganizationListPage.tsx`

**Logic**:
```typescript
// If org has data_sources array → show source badges
// If org has no data_sources → show "Manual" badge
const sources = row.original.data_sources;
```

**Badge mapping**:

| Source value | Label | Style |
|-------------|-------|-------|
| `"google_maps"` | Google Maps | green outline |
| `"clutch"` | Clutch | orange outline |
| `"firecrawl"` | Website | blue outline |
| `"leadmagic"` | LeadMagic | purple outline |
| `"failory"` | Failory | gray outline |
| `"seedtable"` | Seedtable | gray outline |
| (no sources) | Manual | default/muted |

**Column definition**:
```typescript
{
  id: "source",
  header: "Source",
  accessorFn: (row) => row.data_sources,
  cell: ({ row }) => {
    const sources = row.original.data_sources;
    if (!sources?.length) {
      return <Badge variant="outline">Manual</Badge>;
    }
    return (
      <div className="flex gap-1 flex-wrap">
        {sources.map((s) => (
          <Badge key={s} variant="outline" className={sourceColorMap[s]}>
            {sourceLabelMap[s] ?? s}
          </Badge>
        ))}
      </div>
    );
  },
}
```

---

## Data Contract

The organization `nodeDetails` in Mujarrad may include these additional fields for `market_entity` type:

```typescript
interface MarketEntityFields {
  // Intelligence
  team_size?: string;           // "10-49", "50-249", etc.
  founded_year?: string;        // "2015"
  hourly_rate?: string;         // "$50-$99"
  google_rating?: number;       // 4.7
  google_reviews_count?: number;// 69
  linkedin_url?: string;        // "https://linkedin.com/company/..."

  // Arrays
  services?: string[];          // ["Custom Software", "Mobile Apps"]
  industries_served?: string[]; // ["FinTech", "Healthcare"]
  tech_stack?: string[];        // ["React", "Python", "AWS"]
  data_sources?: string[];      // ["google_maps", "clutch", "leadmagic"]

  // Relationships (stored as Mujarrad attributes, not in nodeDetails)
  // verb: "competes_with" | "partners_with" | "supplies_to" | "acquired_by" | ...
  // metadata: { confidence: number, signals: string[] }
}
```

---

## Testing Steps

### Change 1 — Type Enum
1. Navigate to Organizations > Create
2. Verify "Market Entity" appears in the Type dropdown
3. Create an organization with type "Market Entity"
4. Navigate to Organizations list
5. Filter by type "Market Entity" — only that org shows

### Change 2 — Intelligence Fields
1. Open a `market_entity` org that has intelligence data populated
2. Verify "Market Intelligence" card appears with populated fields
3. Verify empty fields are not shown
4. Open a regular `partner` org — verify NO intelligence card appears
5. Open a `market_entity` with zero intelligence fields — verify no card

### Change 3 — Relationships Tab
1. Open a `market_entity` org that has relationship attributes
2. Click "Relationships" tab
3. Verify table shows relationship type, linked org name (clickable), confidence bar, signal badges
4. Verify internal verbs (belongs_to, contains, etc.) are NOT shown
5. Open an org with no relationships — verify empty state message
6. Click a linked org name — verify navigation to that org's detail page

### Change 4 — Source Badges
1. Open Organizations list
2. Verify "Source" column is visible
3. Manually-created orgs show "Manual" badge
4. Imported orgs show colored source badges (Google Maps, Clutch, etc.)
5. Orgs with multiple sources show multiple badges

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Intelligence fields bloat the detail page | Conditional rendering — section only appears when data exists |
| Relationship attributes mixed with structural attributes | Explicit INTERNAL_VERBS exclusion list; tested in step 3 |
| Source badge colors clash with existing badge styles | Use `variant="outline"` + Tailwind text color classes only |
| Large number of relationships slow rendering | Paginate or cap at 50 visible rows with "Show all" toggle |
| Old organizations gain a "Source" column showing empty | Empty = "Manual" badge — clean fallback |

---

## Scope Summary

| # | Change | Files Modified | Lines (est.) |
|---|--------|---------------|--------------|
| 1 | Type enum in form + filter | `OrganizationFormPage.tsx`, `OrganizationListPage.tsx` | ~6 |
| 2 | Intelligence fields card | `OrganizationDetailPage.tsx` | ~80 |
| 3 | Relationships tab | `OrganizationDetailPage.tsx` | ~120 |
| 4 | Source badge column | `OrganizationListPage.tsx` | ~40 |
| **Total** | | **3 files** | **~246 lines** |
