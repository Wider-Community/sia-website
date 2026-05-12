# SIA External-Data Audit

**Date:** 2026-05-12
**Branch:** `feat/reference-data-api-refresh`
**Scope:** Everything in `D:\sia` — portal app, website, openspec, documentation.

**Goal:** Identify every dataset in SIA that is "standard" (maintained by an external authority) and should ideally be sourced from an API or file upload instead of being hardcoded or hand-curated.

**Method:** Codebase scan for hardcoded enums / option arrays, static data files, and dataset-shaped features not yet stored. Grouped by source type and product priority.

---

## Out of scope (already handled)

These already live in the reference-data system and either have an API binding or are intentionally curated:

- `countries` — REST Countries API
- `currencies` — jsDelivr currency-api
- 17 curated business enums in `app/src/portal/engine/seed.ts`: sectors, organization-types, organization-statuses, deal-stages, partnership-types, timeline-options, engagement-stages, engagement-categories, match-statuses, match-categories, task-statuses, priority-levels, kyc-statuses, sanctions-check-statuses, approval-decisions, renderer-types, notification-trigger-types.

---

## High-priority candidates — real product impact

### 1. Phone / dial codes (HIGH)

- **Where today:** Phone fields exist in forms; mock data shows values like `+966xxxxxxxxx` and `+60xxxxxxxxx`, but no validation or formatting.
- **Standard:** ITU-T E.164.
- **Recommended source:** Reuse the existing **REST Countries** call — `idd.root` + `idd.suffixes` per country already gives dial codes. Zero new API.
- **Alternative:** **libphonenumber** metadata (Google, open-source) if you also want formatting / validation rules per region.
- **Why high:** Compliance-adjacent (KYC needs valid phone), touches every contact form.

### 2. Country subdivisions / regions (HIGH)

- **Where today:** Location pickers are country-only; no Saudi regions or Malaysia states.
- **Standard:** ISO 3166-2.
- **Recommended source:** **Wikidata SPARQL** — fits the existing `arEnrichmentSource` infrastructure and returns bilingual EN/AR labels.
- **Alternative:** community-maintained `iso-3166` JSON on GitHub.
- **Why high:** Both target markets (KSA, Malaysia) care strongly about subdivisions — Riyadh / Eastern Province / Selangor / Penang are core to deal context.

---

## Medium-priority candidates — depends on roadmap

### 3. FX rates (MEDIUM, depends on product)

- **Where today:** Not in code. Only useful if deals carry monetary amounts and you want aggregate reporting in a single currency.
- **Recommended source:** `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json` — same CDN already used for currency names. Bulletproof CORS.
- **Schema note:** Requires a small extension on `ReferenceEntry` to carry a numeric `data` field (rates aren't strings). Roughly 30 lines.

### 4. Time zones (MEDIUM)

- **Where today:** `app/src/portal/engine/notification-preferences.ts` lines 37–38 already has `quietHoursStart` / `quietHoursEnd` fields — implies timezone support is coming.
- **Standard:** IANA tzdb.
- **Recommended source:** static JSON via `date-fns-tz` or browser ICU. Not really a refreshable API — better as a one-shot import or build-time bundle.

### 5. Legal entity types per country (MEDIUM)

- **Where today:** `organization-types` covers generic shapes (`investor`, `company`, `government`, `ngo`, `fund`, `accelerator`).
- **Why standard:** Saudi (شركة ذات مسؤولية محدودة, شركة مساهمة, مؤسسة فردية…) vs Malaysia (Sdn Bhd, Berhad, Enterprise…) follow distinct registrar taxonomies.
- **Recommended source:** No clean free API. Curate as **two datasets** — `legal-entity-types-sa` and `legal-entity-types-my` — referenced conditionally per country in flows.

### 6. Industry/sector taxonomy (MEDIUM)

- **Where today:** 12 curated sectors in `seed.ts:297`.
- **Authoritative alternatives:** GICS (MSCI, paid), NAICS (US Census, free CSV), ISIC Rev. 4 (UN Statistics Division, free CSV).
- **Recommendation:** Keep curated unless a stakeholder asks for the full taxonomy. The 12-item list is the right granularity for deal matching.

---

## Compliance / KYC / AML candidates — only if those features ship

### 7. Sanctions lists (HIGH *if* KYC is in scope)

- **OFAC SDN:** `https://www.treasury.gov/ofac/downloads/sdn.json`
- **EU Consolidated:** `https://webgate.ec.europa.eu/fsd/fsf/public/files/jsonFullSanctionsList`
- **UN, HMT:** similar free downloads.
- **Important:** these are 50k+ records. They do **not** belong in the reference-data system — they need a dedicated screening service with its own storage and a name-matching index.

### 8. PEP (Politically Exposed Persons) registry (HIGH *if* KYC is in scope)

- **Source:** OpenSanctions PEP datasets (free for non-commercial), or paid providers (Refinitiv, Dow Jones).
- **Same caveat as sanctions** — dedicated service, not reference-data.

### 9. Tax ID / VAT number formats per country (MEDIUM)

- **Where today:** Not used.
- **Source:** Static regex JSON like `vatcheck-regex` (community-maintained). Small, infrequent updates → a quarterly **file upload** would actually beat an API here.

### 10. LEI / MIC codes / SWIFT-BIC / IBAN formats (LOW)

- Not used in current code. Listed for completeness; defer unless financial-compliance features arrive.

---

## Geographic / locale extras

### 11. Languages / locales (LOW)

- **Where today:** EN + AR only, hardcoded in `app/src/i18n/`.
- **Standard:** ISO 639-1 / 639-3.
- **Recommendation:** Static JSON checked into the repo until you ship multi-language UI. Fetching is overkill.

### 12. Cities / postcodes (LOW)

- **Where today:** Not used.
- **Source:** GeoNames API — 6M+ place names. If ever needed, scope to per-country datasets (Saudi cities, Malaysia cities) rather than a global blob.

---

## Document / template uploads (file-based, not API)

### 13. Contract / NDA / MoU templates (MEDIUM)

- **Where today:** `app/src/portal/engine/renderers/FileUploadRenderer.tsx` already supports uploads to R2. No template library exists.
- **Path forward:** A dedicated `document-templates` entity (separate from reference-data), where admins upload curated PDF/DOCX files. Each deal flow can pull from this library.

### 14. Term-sheet templates — SAFE, preferred stock, etc. (LOW)

- **Source:** Y Combinator SAFE templates (public PDF) or SIA-authored versions.
- **Pattern:** same as #13 — admin file upload.

### 15. Due-diligence checklists / questionnaires (LOW)

- **Where today:** Not implemented.
- **Source:** Manual curation, or import from publicly available DD frameworks.

### 16. Email / notification templates (LOW)

- **Where today:** In-code (react-email).
- **Pattern:** Move to admin-editable uploads only when non-engineers need to edit copy. Today it's fine.

---

## i18n bundles (LOW)

- `i18n/{en,ar}.json` is checked into the repo — about 300 keys, bilingual coverage is solid.
- Adding new locales = uploading more JSON files manually. No API needed.

---

## Hardcoded today but app-specific (NOT external candidates)

These look "enum-shaped" but have no external authority, so moving them to an API doesn't help. List for hygiene only:

| Item | Location | Action |
|---|---|---|
| MIME types (4 doc types) | `schemas.ts:39-44` | Leave hardcoded; expand only when needed |
| Notification channels (`in_app`, `email`, `push`, `sms`, `webhook`, `slack`) | `notification-preferences.ts:74-81` | Leave; app-defined |
| Notification priorities (`low/medium/high/critical`) | `notification-preferences.ts:83-88` | Already overlaps with `priority-levels` in reference-data |
| User roles (`admin`, `client`) | `schemas.ts:73` | Leave; too narrow |
| Signing request statuses | `schemas.ts:89` | App-specific workflow |
| Signer statuses | `schemas.ts:114` | App-specific workflow |
| Activity event actions | `schemas.ts:60` | CRUD audit; app-specific |
| Alert types (`overdue`, `at_risk`, `info`) | `schemas.ts:179` | App-specific |

Could be migrated to reference-data for *consistency* (one place to manage enums) — that's a separate decision from "should it have an API."

---

## Checked but found nothing

These were searched for and have zero usage in the current codebase. Listed so the next audit doesn't waste time re-checking:

- Stock exchange codes (MIC, ISO 10383)
- HS codes (trade)
- ESG taxonomies (SASB, GRI, EU SFDR)
- Universities / degrees / credentials
- Holiday calendars per country
- Patent / trademark classifications
- ISO standards lookups
- Country flags (handled via emoji or REST Countries on demand)

---

## Summary table

| Priority | Item | Source type | Effort |
|---|---|---|---|
| HIGH | Dial codes | Reuse REST Countries call | trivial |
| HIGH | Country subdivisions | Wikidata SPARQL (existing infra) | low |
| MEDIUM | FX rates | jsDelivr currency-api | low + small schema change |
| MEDIUM | Time zones | Static import | low |
| MEDIUM | Legal entity types (SA + MY) | Curated, split by country | low |
| MEDIUM | Document/contract templates | Admin file upload (R2) | medium — new entity |
| MEDIUM (if KYC) | Sanctions & PEP lists | Dedicated service | high — separate system |
| MEDIUM (if KYC) | VAT/Tax-ID regex per country | Quarterly file upload | trivial |
| LOW | Sectors via full taxonomy | NAICS/ISIC CSV import | medium |
| LOW | Languages, MIME types, signing statuses | Leave as-is | — |
| LOW | Stock exchanges, LEI, MIC, SWIFT, IBAN | Not used; defer | — |

---

## Recommended next steps

1. **Quick win:** add dial codes by extending the existing `countries` dataset mapping (REST Countries already returns `idd.root` + `idd.suffixes`). No new API, no new dataset.
2. **High-value add:** new `subdivisions-sa` and `subdivisions-my` datasets backed by Wikidata SPARQL with bilingual labels.
3. **Schema decision:** if FX rates are wanted, add an optional `data: Record<string, unknown>` field to `ReferenceEntry` so numeric/structured payloads work. Surface it as a fourth slot in the mapping UI.
4. **Document templates:** if deal-room features are coming up, scope a new `document-templates` entity now — don't try to fit files into reference-data.
5. **Sanctions/PEP:** defer until the KYC flow is actually being built. These need their own service, not reference-data.

---

**Net new external-data datasets realistically needed today:** 2 (dial codes + subdivisions). Everything else is either curated by design, premature, or already handled.
