# Test Setup — Extra Context (paste into agent form)

Use with:
- **Test Type:** Frontend (URLs)
- **Website URL:** `https://bugreport.mivubi.com/`
- **Extra context:** Copy everything below the `---` line into the optional instructions field.

---

## Product

**Gauntlet QA Bug Report Dashboard** — internal SvelteKit web app for managing Minecraft Education QA bug reports. Users import or create reports, triage issues, attach evidence, filter/search bugs, export JSON/PDF, and mark reports resolved. **No login** — the app is open once you reach the URL.

Terminology: **report** (not project), **issue/bug**, **group** (collection of reports).

## Pages to prioritize

| Priority | Route | What to test |
|----------|-------|--------------|
| P0 | `/` | Home loads; report/group cards visible; search; workflow filter; open a report |
| P0 | `/report/[slug]` | Bug grid, filters, search, sort, add bug, edit issue status, metadata, export |
| P1 | Open Report dialog (TabBar `+` or home "New report") | Create blank report; import JSON |
| P1 | Bug detail sheet | Full issue edit, evidence, Mark as Fixed |
| P1 | Metadata edit dialog | Report + testing session fields; report workflow (open/resolved/postponed) |
| P2 | `/group/[slug]` | Group stats; sibling reports; add report to group |
| P2 | `/report/[slug]/print` | Print view respects filters (auto print dialog — verify layout, don't require saving PDF) |
| P3 | Tab bar | Multi-tab open/close/refresh persistence |
| P3 | Drag-reorder on home | Group and report ordering |

**Start with seeded data:** Production likely has at least one report (e.g. gauntlet-minigames). Open it from home before creating new data.

## Critical user flows (generate E2E tests for these)

1. **Smoke:** Home → click report card → issues render with severity badges.
2. **Triage:** Filter view=Active, severity=Critical → change one bug status via card dropdown → refresh → status persists.
3. **Add bug:** Add Bug dialog → fill required fields → submit → new `BUG-###` appears in grid.
4. **Search & URL sync:** Type in search (or press `/` to focus) → URL gains `q=` param → refresh → same results.
5. **Report workflow:** Metadata → set Resolved → **must** enter developer note (1+ chars) → save → badge updates on home.
6. **Export:** Apply filter → Export JSON → downloaded file contains only filtered issues + `report_slug`, `exported_at`.
7. **Create report:** Open Report dialog → new name → submit → lands on empty `/report/[slug]` with default metadata.
8. **Import:** Open Report dialog → Import tab → upload valid JSON → report created with issues (use a small fixture if generating one).

## Filter & URL reference

Report page query params (shareable — test persistence after refresh):

- `q` — search text
- `severity` — Critical | High | Medium | Low | all
- `area` — area name or all
- `status` — open | in_progress | fixed | wont_fix | all
- `sort` — id-asc | id-desc | severity | level | status
- `view` — active (default) | resolved | all

**Active view** = open + in_progress only. **Resolved view** = fixed + wont_fix.

## Validation rules to verify

- Resolved/Postponed **report workflow** requires developer note; empty note must block save.
- Developer note max 4000 characters.
- New report name required; duplicate titles get slug suffix (`-2`, `-3`).
- Evidence upload: images/videos only, max 10 MB.
- Add Bug: required fields — area, title, severity, category, finding, expected_result.

## Issue status transitions

`open` → `in_progress` → `fixed` or `wont_fix`. Fixed/wont_fix bugs leave Active view.

## Features to skip or deprioritize

- **Authentication** — none exists; do not test login/logout/roles.
- **Backend/API test type** — no public REST API; UI uses SvelteKit form actions only.
- **Real-time collaboration** — not supported.
- **Jira/Linear/Slack integrations** — not present.
- **Destructive DB tests** — avoid mass-deleting production seed reports; prefer creating uniquely named test reports and cleaning up if possible.
- **Print-to-PDF file assertion** — print dialog is browser-native; verify print page content loads, not OS print output.
- **Legacy URL redirects** — low priority: `/p/`, `/project/`, `/g/` redirect to `/report/`, `/group/`.

## Known quirks & regression hotspots

1. **Cold-start / DB** — first request after deploy may run migrations; page should still load (watch for 500s on `/`).
2. **Filter URL drift** — filters must stay in sync with URL query params (regression-prone).
3. **Tab localStorage** — open tabs stored in `bug-report-open-tabs`; test refresh restores tabs.
4. **Import leniency** — accepts partial `testing_session`, legacy field names (`platform`, `device`), and honors `report_slug` in JSON.
5. **Export is filter-scoped** — exported JSON may contain fewer issues than the full report.
6. **Evidence URLs** — `/evidence/[report]/[filename]` redirects to Cloudflare R2; test only if upload flow is in scope.

## Test data guidance

- Use existing reports on home for read/triage tests.
- For create/import tests, use unique names like `e2e-test-[timestamp]` to avoid slug collisions.
- Minimal valid import JSON needs at least `issues[]` with one issue; include `report.title` for clarity.
- Issue areas often look like `Level 1`, `Level 2`, plus `Global UI` and `Multiplayer`.

## Suggested test matrix

| Area | Cases |
|------|-------|
| Home | Load, search reports, workflow filter, open report, create button |
| Report dashboard | Filters, sort, view toggle, breakdown chart click-to-filter |
| Issue CRUD | Add, inline status change, detail sheet edit, delete |
| Metadata | Edit testing session; workflow open→resolved with note |
| Export/import | JSON download; optional round-trip import |
| Tabs | Open 2 reports, refresh, close tab |
| Group | View group page, switch sibling report |
| Negative | Resolve without note (blocked), empty report name (blocked) |

## Out of scope for this test plan

Test case generation inside the app, audit logs, email notifications, offline mode, mobile-specific native behavior (responsive layout is fine).

## Reference doc

Full PRD with schemas and sample test templates: `docs/PRD.md` in the repo.
