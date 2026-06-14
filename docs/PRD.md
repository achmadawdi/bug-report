# Gauntlet QA Bug Report Dashboard — Product Description & PRD

> **Purpose of this document:** Give QA engineers, developers, and automated test generators a complete picture of what the product does, how users move through it, and what behavior to verify. Use it to derive manual test cases, E2E scenarios, and regression suites.

---

## 1. Product summary

| Field | Value |
|-------|-------|
| **Product name** | Gauntlet QA Bug Report Dashboard |
| **Primary users** | Minecraft Education QA testers, developer triage owners, release managers |
| **Problem solved** | QA teams produce structured bug reports (often from PDF walkthroughs or playtests) that need a single place to ingest, triage, attach evidence, export handoffs, and track report-level completion |
| **What it is** | A multi-report, tabbed web dashboard for managing bug reports with rich Minecraft Education testing metadata |
| **What it is not** | A test-case generator, issue tracker integration (Jira/Linear), or authenticated multi-tenant SaaS |
| **Stack** | SvelteKit 5, Neon PostgreSQL, Cloudflare R2, deployed on Vercel |
| **Access model** | No in-app authentication; access is controlled by deployment URL and infrastructure credentials |

---

## 2. Goals & success criteria

### Business goals

1. **Centralize** bug reports from multiple Minecraft Education playtest cycles in one searchable workspace.
2. **Accelerate triage** with filters, severity breakdowns, and per-issue status tracking.
3. **Hand off cleanly** to developers via filtered JSON export or printable PDF.
4. **Close the QA loop** by marking entire reports resolved or postponed with a mandatory developer note.

### Measurable outcomes (for test planning)

| Metric | What to verify |
|--------|----------------|
| Import fidelity | Imported JSON preserves issues, metadata, and `report_slug` when provided |
| Triage speed | Filters, search, and sort update the bug grid without full page reload |
| Evidence traceability | Uploaded files are retrievable via `/evidence/[report]/[filename]` |
| Workflow closure | Resolved/postponed reports require a developer note (1–4000 chars) |
| Shareability | Filter state is reflected in URL query params and survives refresh |

---

## 3. Personas & jobs to be done

### QA Tester

- **Job:** Import a playtest JSON, add bugs found during testing, attach screenshots/videos, export a filtered subset for dev handoff.
- **Pain without tool:** Scattered spreadsheets, lost evidence links, no severity consistency across reports.

### Developer / Triage Owner

- **Job:** Open a report tab, filter to Critical/High active bugs, change issue status inline, read evidence and suggested fixes.
- **Pain without tool:** Incomplete context, no status rollup, unclear which levels were tested clean.

### Release Manager

- **Job:** See all reports in a project group, check workflow status (open vs resolved), confirm report metadata (version, environment, test date).
- **Pain without tool:** No group-level rollup, no report-level resolution signal.

---

## 4. Information architecture

### Routes

| Route | Page purpose | Key interactions |
|-------|--------------|------------------|
| `/` | Home — report launcher | Browse groups/reports, search, workflow filter, drag-reorder, create/import report |
| `/report/[report]` | Report dashboard (data route) | Filters, issue CRUD, metadata edit, export, workflow status |
| `/report/[report]/print` | Print/PDF view | Auto-opens browser print dialog; respects active filters |
| `/group/[group]` | Group detail | View all reports in a group, aggregate stats, add report to group |
| `/reports` | Form-action endpoint only | `createReport`, `importReport` (no visible page) |
| `/evidence/[report]/[filename]` | Evidence proxy | 302 redirect to public R2 URL |

### Legacy redirects

| Old path | New path |
|----------|----------|
| `/p/[report]` | `/report/[report]` |
| `/project/[report]` | `/report/[report]` |
| `/g/[group]` | `/group/[group]` |

### URL query params (shareable filter state)

Applied on `/report/[report]`:

| Param | Values | Default |
|-------|--------|---------|
| `q` | Free-text search | empty |
| `severity` | `Critical`, `High`, `Medium`, `Low`, `all` | `all` |
| `area` | Any area string or `all` | `all` |
| `status` | `open`, `in_progress`, `fixed`, `wont_fix`, `all` | `all` |
| `sort` | `id-asc`, `id-desc`, `severity`, `level`, `status` | `id-asc` |
| `view` | `active`, `resolved`, `all` | `active` |

**Test note:** Navigating to a report with query params should restore the same filtered view after refresh.

---

## 5. Core features

### 5.1 Multi-tab workspace

- Figma-style tab bar persists open reports in `localStorage` (`bug-report-open-tabs`).
- Multiple report dashboards can be mounted simultaneously in `ReportHost`.
- Each tab restores scroll position and selected issue from session state.
- Home tab always available; "+" opens the Open Report dialog.

**Verify:** Open 3 reports → refresh → tabs restore. Close a tab → it disappears from tab bar and storage.

### 5.2 Project groups

- Reports optionally belong to one group (`project_groups` table).
- Groups appear as containers on the home page with nested report cards.
- Drag-reorder works for both groups and reports within groups.
- Group page (`/group/[slug]`) shows rollup stats and sibling report navigation.
- Groups can be created inline when creating or importing a report.

**Verify:** Assign report to new group → appears under group on home. Reassign via metadata edit → moves between groups.

### 5.3 Report creation

**Entry points:** Home "New report" card, TabBar "+", Open Report dialog.

**Flow:**
1. User enters report name (required) and optional group.
2. POST `/reports?/createReport`.
3. Server slugifies title; dedupes with `-2`, `-3`, … on conflict.
4. Creates empty report with defaults (see §7).
5. Redirects to `/report/[slug]`.

**Verify:** Empty name blocked. Duplicate titles get unique slugs. Defaults populate metadata grid.

### 5.4 Report import

**Entry points:** Open Report dialog → Import panel → select JSON file.

**Supported formats:**
- **Full report JSON** — complete `report`, `testing_session`, `severity_guide`, `levels_with_no_issues_recorded`, `issues[]`.
- **Export payload** — minimum `issues[]` (≥1 issue); other fields optional.

**Conflict handling:**

| Conflict type | Options (default first) |
|-------------|-------------------------|
| Slug already exists | Suffix slug · Overwrite · Cancel |
| Duplicate issue IDs | Regenerate IDs · Skip duplicates · Cancel |

**Leniency rules:**
- Partial/nullable `testing_session` accepted; missing fields get sensible defaults.
- Unknown `environment` value folded into `test_scope` text.
- `report_slug` or legacy `project` field honored (slug not derived from title alone).
- Legacy field names (`platform`, `device`, `tester`, etc.) normalized on import.

**Verify:** Import full JSON → all issues appear. Import export-only payload → metadata backfilled. Slug conflict strategies behave as selected.

### 5.5 Report dashboard

The main working surface for a single report.

**Sections:**

| Section | Component | Purpose |
|---------|-----------|---------|
| Header | `ReportHeader` | Report title |
| Metadata | `MetadataGrid` | Report + testing session fields, workflow status, group assignment, export menu |
| Sidebar | `Sidebar` | Severity guide, clean levels, breakdown chart |
| Toolbar | `Toolbar` | Search, filters, sort, view toggle, export, add bug |
| Grid | `BugCard` × N | Issue cards with inline status, evidence thumbnails |
| Detail | `BugDetailSheet` | Full issue edit, evidence management, "Mark as Fixed" |

**Keyboard shortcuts:**
- `/` — focus search
- `Escape` — clear search

### 5.6 Issue management (per-bug workflow)

**Issue statuses:**

| Status | Label | Category |
|--------|-------|----------|
| `open` | Open | Active |
| `in_progress` | In Progress | Active |
| `fixed` | Fixed | Resolved |
| `wont_fix` | Won't Fix | Resolved |

**CRUD operations:**
- **Create:** Add Bug dialog → auto-generates `BUG-###` ID (next available).
- **Read:** Bug card (summary) + detail sheet (full fields).
- **Update:** Inline status dropdown on card; full edit in detail sheet.
- **Delete:** Available from detail sheet.

**Issue fields (all testable for validation/persistence):**

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | e.g. `BUG-001`; auto-generated on create |
| `area` | string | Level names (`Level 1`, …) or `Global UI`, `Multiplayer` |
| `title` | string | Short summary |
| `severity` | enum | Critical, High, Medium, Low |
| `category` | string | Free text |
| `finding` | string[] | What was observed |
| `expected_result` | string[] | What should happen |
| `status` | enum | See table above |
| `notes` | string? | Additional context |
| `evidence` | string? | Text evidence description |
| `reason` | string? | Rationale (esp. for won't fix) |
| `suggested_text_or_behavior` | string[]? | Copy/UI guidance for fix |
| `source_page` | number? | Traceability to source PDF page |
| `evidence_media` | array? | `{ type: image\|video, src, caption? }` |

**Verify:** Create bug → appears in active view. Mark fixed → moves to resolved view. Edit persists after tab switch and refresh.

### 5.7 Report workflow (report-level)

Separate from per-issue status. Tracks whether the entire QA cycle is complete.

| Status | Label | Requires developer note |
|--------|-------|-------------------------|
| `open` | Open | No |
| `resolved` | Resolved | Yes (1–4000 chars) |
| `postponed` | Postponed | Yes (1–4000 chars) |

**Entry point:** Metadata grid workflow controls.

**Home page:** Reports can be filtered by workflow status.

**Verify:** Cannot set resolved/postponed without note. Note persists. Home workflow filter works.

### 5.8 Filtering, search & sort

**View modes:**
- **Active** — `open` + `in_progress` only
- **Resolved** — `fixed` + `wont_fix` only
- **All** — every issue

**Filters:** severity, area, status (in addition to view mode).

**Search:** Matches across all issue text fields (title, finding, expected_result, notes, evidence, etc.).

**Sort options:** ID asc/desc, severity (Critical first), level order (numeric), status.

**Breakdown chart:** Clickable severity/status segments apply corresponding filters.

**Verify:** Combined filters narrow results correctly. Chart clicks set filters. URL params sync.

### 5.9 Evidence management

**Upload:**
- Max file size: 10 MB
- Accepted types: images and videos
- Stored in Cloudflare R2
- Referenced as `/evidence/[report]/[filename]` in issue data

**External URL:** Users can add image/video URLs without upload.

**Viewing:** Thumbnails on cards; lightbox for full preview in detail sheet.

**Verify:** Upload → thumbnail appears → lightbox opens. File accessible via evidence URL. Oversized/wrong-type files rejected.

### 5.10 Export

**JSON export:**
- Exports current **filtered** issue subset (not necessarily all issues).
- Includes report metadata, testing session, severity guide, clean levels.
- Adds `report_slug`, `exported_at`, and `filters` (when filters active).
- Downloaded client-side from dashboard export menu.

**PDF export:**
- Opens `/report/[report]/print` with current filter query params.
- Print-optimized layout; browser print dialog auto-triggered.
- Uses `IssueFieldsDisplay` for read-only rendering.

**Verify:** Export with active filter → JSON contains only matching issues. PDF reflects same filter. Re-import exported JSON succeeds.

### 5.11 Metadata editing

Editable from metadata grid dialog:

**Report fields:**
- Title, type (QA Testing / Regression / Smoke / Bug Report), version, source file

**Testing session fields:**
- Test date (YYYY-MM-DD), Minecraft edition, game version, device type, tester count, tester level, test scope, environment

**Report configuration:**
- Severity guide (per-severity definitions)
- Levels with no issues recorded
- Group assignment

**Verify:** Edits persist to DB. Summary counts recalculate on save.

### 5.12 Theming

- Light/dark mode toggle in tab bar.
- Preference persists across sessions.

---

## 6. User flows (step-by-step)

### Flow A: First-time setup → view seeded report

```
Open app URL
  → DB empty? Seed bundled JSON (gauntlet-minigames) auto-imported
  → Land on home page with at least one report card
  → Click report card
  → Tab opens, navigate to /report/[slug]
  → See metadata, sidebar, bug grid with seeded issues
```

### Flow B: Import playtest results

```
Home or TabBar "+" → Open Report dialog
  → Switch to Import panel
  → Select JSON file → client preview parses file
  → Enter report name + optional group
  → Choose slug/issue conflict strategies if needed
  → Submit → POST /reports?/importReport
  → Redirect to /report/[imported-slug]
  → Verify issues, metadata, severity guide populated
```

### Flow C: Triage active bugs

```
Open report tab
  → Default view: Active (open + in_progress)
  → Optionally filter severity=Critical, sort=severity
  → Click bug card → detail sheet opens
  → Review finding, expected_result, evidence
  → Change status to in_progress or fixed
  → Close sheet → card reflects new status
  → If fixed → bug disappears from Active view
```

### Flow D: Add bug with evidence during testing

```
Open report → Toolbar "Add bug"
  → Fill required fields (area, title, severity, category, finding, expected_result)
  → Optionally attach image/video (pending upload on save)
  → Submit → new BUG-### created
  → Bug appears in grid
  → Upload completes → thumbnail visible on card
```

### Flow E: Developer handoff

```
Open report → filter to Critical + High, view=Active
  → Export menu → Download JSON
  → Share JSON file with dev team
  OR
  → Export menu → Print/PDF → browser saves PDF
  → Dev imports JSON into their own report instance (optional)
```

### Flow F: Close QA cycle

```
Open report → Metadata grid → Workflow
  → Select "Resolved" or "Postponed"
  → Enter developer note (required)
  → Save → workflow badge updates
  → Home page → filter by Resolved → report appears in resolved list
```

### Flow G: Organize reports into a group

```
Create report → Group field → "Create new group: [name]"
  → Report saved under new group
  → Home shows group card with nested report
  → Click group title → /group/[slug] shows all sibling reports
  → Use ReportSwitcher inside a report to jump between group siblings
```

### Flow H: Share filtered view

```
Open report → apply search + severity + area filters
  → Copy URL from browser (includes query params)
  → Share URL with colleague
  → Colleague opens URL → same filtered view appears
```

---

## 7. Data model reference

### Domain enums

```
Severity:     Critical | High | Medium | Low
Issue status: open | in_progress | fixed | wont_fix
Report workflow: open | resolved | postponed
Report type:  QA Testing Report | Regression Report | Smoke Test Report | Bug Report
Edition:      Education | Bedrock | Java | Legacy
Device:       Windows | Mac | Android | iOS | iPad | Chromebook | Other
Tester level: Internal | Middle School | High School | University | Adult / Professional | Mixed
Environment:  Development | Staging | Production | null
Evidence type: image | video
```

### Database tables

| Table | Key columns | Relationship |
|-------|-------------|--------------|
| `project_groups` | slug, title, sort_order | 1 → many reports |
| `reports` | slug, title, group_slug, workflow_status, workflow_note, type, version, source_file, sort_order | 1 → 1 testing session |
| `report_testing_sessions` | report_slug, test_date, minecraft_edition, game_version_tested, device_type, tester_count, tester_level, test_scope, environment | |
| `report_severity_guide` | report_slug, severity, definition | |
| `report_clean_levels` | report_slug, level_name | |
| `issues` | report_slug, id, area, title, severity, category, finding[], expected_result[], status, notes, evidence, reason, suggested_text_or_behavior[], source_page | 1 → many evidence_media |
| `evidence_media` | report_slug, issue_id, type, src, caption, sort_order | |

### Default values (new empty report)

| Field | Default |
|-------|---------|
| Report type | QA Testing Report |
| Test date | Today (YYYY-MM-DD) |
| Edition | Education |
| Device | Windows |
| Tester count | 1 |
| Tester level | Mixed |
| Issues | Empty array |
| Severity guide | Standard Critical/High/Medium/Low definitions |
| Workflow status | open |

### Summary counts (derived, not stored)

Recalculated on read/write:
- `total_issues`
- `by_severity` (Critical, High, Medium, Low)
- `by_area` (per area string)
- `by_status` (open, in_progress, fixed, wont_fix)

---

## 8. Import / export schema

### Full report JSON (canonical)

```json
{
  "report": {
    "title": "string",
    "type": "QA Testing Report",
    "version": "string",
    "source_file": "string | null"
  },
  "testing_session": {
    "test_date": "YYYY-MM-DD",
    "minecraft_edition": "Education",
    "game_version_tested": "string",
    "device_type": "Windows",
    "tester_count": 1,
    "tester_level": "Mixed",
    "test_scope": "string | null",
    "environment": "Development | Staging | Production | null"
  },
  "severity_guide": {
    "Critical": "definition",
    "High": "definition",
    "Medium": "definition",
    "Low": "definition"
  },
  "levels_with_no_issues_recorded": ["Level 2"],
  "issues": [
    {
      "id": "BUG-001",
      "area": "Level 1",
      "title": "string",
      "severity": "High",
      "category": "string",
      "finding": ["observed behavior"],
      "expected_result": ["expected behavior"],
      "status": "open",
      "notes": "optional",
      "evidence": "optional text",
      "evidence_media": [{ "type": "image", "src": "/evidence/...", "caption": "optional" }],
      "reason": "optional",
      "suggested_text_or_behavior": ["optional"],
      "source_page": 12
    }
  ]
}
```

### Export additions

```json
{
  "report_slug": "my-report",
  "exported_at": "ISO-8601 timestamp",
  "filters": { "search": "", "severity": "Critical", "view": "active" }
}
```

---

## 9. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Persistence | All UI edits saved via SvelteKit form actions to Neon PostgreSQL |
| Evidence storage | Files in Cloudflare R2; served via redirect (bucket must have public read) |
| Migrations | Idempotent schema migrations with ledger; safe for serverless cold starts |
| Performance | Tab switching should not reload full page; filters update client-side grid |
| Environments | Production and Preview must use **separate** `DATABASE_URL` values |
| Browser support | Modern browsers with localStorage, file upload, and print support |

---

## 10. Out of scope (current version)

- User authentication, roles, or permissions
- Test case / test plan generation
- Real-time multi-user collaboration
- External integrations (Jira, Linear, Slack, email)
- Audit log or change history
- Public REST API for third-party clients
- Offline mode

---

## 11. Test generation guide

Use this section to derive test cases systematically.

### 11.1 Test dimensions

| Dimension | Variants to cover |
|-----------|-------------------|
| Report lifecycle | Create empty · Import full JSON · Import export-only · Seed on empty DB |
| Group membership | No group · Existing group · New inline group · Reassign |
| Issue workflow | Each status transition · Create with/without evidence · Delete |
| Report workflow | open → resolved (with note) · open → postponed (with note) · missing note blocked |
| Filters | Each severity · Each status · Each view mode · Combined · URL persistence |
| Import conflicts | Slug suffix · Slug overwrite · ID regenerate · ID skip |
| Evidence | Image upload · Video upload · External URL · Oversized file · Lightbox |
| Export | JSON full · JSON filtered · PDF filtered · Re-import round-trip |
| Tabs | Open multiple · Close · Refresh persistence · Scroll/selection restore |
| Edge cases | Empty report (no issues) · All issues resolved · Duplicate slug on create · Legacy JSON fields |

### 11.2 Critical path smoke tests

1. App loads home with at least one report (seeded or existing).
2. Open report tab → issues render with correct severity badges.
3. Change one issue status → persists after refresh.
4. Add bug → auto ID assigned → appears in grid.
5. Export JSON → valid JSON with expected fields.
6. Import previously exported JSON → issues restored.

### 11.3 Regression hotspots

| Area | Risk | Why |
|------|------|-----|
| DB migrations | High | Serverless cold-start migrations caused production outage; schema must stay idempotent |
| Import normalization | Medium | Legacy field names, nullable sessions, environment → test_scope folding |
| Filter URL sync | Medium | Shareable URLs are a core feature; param drift breaks collaboration |
| Evidence proxy | Medium | R2 redirect + filename validation + MIME checks |
| Tab state | Low–Medium | localStorage + session restore across navigations |
| Workflow note validation | Medium | Required for resolved/postponed; boundary at 4000 chars |

### 11.4 Sample test case templates

**TC-IMPORT-01: Import full report JSON**
- **Precondition:** Valid full report JSON file with 5 issues.
- **Steps:** Open Report dialog → Import → select file → submit with default conflict options.
- **Expected:** Redirect to new report; 5 issues visible; metadata matches source; severity guide rendered in sidebar.

**TC-TRIAGE-03: Filter active Critical bugs**
- **Precondition:** Report with mixed severities and statuses.
- **Steps:** Set view=Active, severity=Critical.
- **Expected:** Only open/in_progress Critical issues shown; URL contains `view=active&severity=Critical`; count matches breakdown chart.

**TC-WORKFLOW-02: Resolve report without note blocked**
- **Precondition:** Report with workflow=open.
- **Steps:** Set workflow to Resolved; leave developer note empty; save.
- **Expected:** Validation error; workflow remains open.

**TC-EVIDENCE-01: Upload image on new bug**
- **Precondition:** Report open; R2 configured.
- **Steps:** Add bug with PNG attachment < 10 MB.
- **Expected:** Bug created; thumbnail on card; `/evidence/[report]/[filename]` returns redirect to R2.

**TC-EXPORT-02: Filtered JSON round-trip**
- **Precondition:** Report with 10 issues; filter to 3.
- **Steps:** Export JSON → Import as new report.
- **Expected:** New report has exactly 3 issues matching filtered subset.

**TC-TABS-01: Tab persistence across refresh**
- **Precondition:** None.
- **Steps:** Open 2 reports in tabs → refresh browser.
- **Expected:** Both tabs restored; active tab unchanged.

---

## 12. Environment & deployment checklist

Required environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_ACCESS_KEY_ID` | R2 API key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_BASE_URL` | Public `r2.dev` base URL |

Pre-deploy verification:
- [ ] `bun run db:migrate` succeeds
- [ ] `bun run db:verify` passes (idempotent migrations)
- [ ] Preview and Production use different `DATABASE_URL`
- [ ] R2 bucket has public read for evidence

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Report** | A single bug report document (formerly called "project" in legacy data) |
| **Issue / Bug** | One defect entry within a report |
| **Group** | A collection of related reports (e.g. all Gauntlet minigame playtests) |
| **Clean level** | A game level that was tested but had no issues recorded |
| **Severity guide** | Per-report definitions explaining what each severity level means |
| **Active view** | Filter showing only open and in_progress issues |
| **Report workflow** | Report-level status (open/resolved/postponed), distinct from issue status |
| **Export payload** | JSON with at minimum an `issues[]` array, suitable for re-import |

---

## 14. Related files (for implementers & test authors)

| Area | Path |
|------|------|
| Domain types & validation | `src/lib/types.ts` |
| Import/export parsing | `src/lib/import-report.ts` |
| DB schema | `src/lib/server/db/schema.ts` |
| Business logic | `src/lib/server/store.ts` |
| SQL queries | `src/lib/server/db/repository.ts` |
| Routes | `src/routes/` |
| Dashboard UI | `src/lib/components/dashboard/` |
| Tab shell | `src/lib/components/tabs/` |
| Seed data example | `data/projects/gauntlet-minigames/report.json` |
| Developer agent guide | `AGENTS.md` |
