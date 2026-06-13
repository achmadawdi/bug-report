# Agent guide — Gauntlet QA Bug Report Dashboard

SvelteKit 5 app for QA bug reports. Data lives in **Neon PostgreSQL**; evidence files in **Cloudflare R2**.

## Layout

| Area | Path |
|------|------|
| Routes | `src/routes/` — `/report/[report]`, `/reports`, `/group/[group]` |
| UI | `src/lib/components/` |
| Types / import | `src/lib/types.ts`, `src/lib/import-report.ts` |
| Server store | `src/lib/server/store.ts` |
| DB schema | `src/lib/server/db/schema.ts` |
| Migrations | `src/lib/server/db/migrate.ts`, `migration-ledger.ts`, `schema-verify.ts` |
| Repository SQL | `src/lib/server/db/repository.ts` |

Terminology in code and DB is **report** (not project). Legacy `project` names exist only inside backward-compatible migration SQL.

## Commands

```sh
bun run dev
bun run check
bun run db:migrate      # apply migrations once (CLI or first app boot)
bun run db:verify       # run migrations twice; confirms ledger idempotency
```

## Database migrations (read before changing schema)

### Root cause: production `project_slug` outage (2026-06-13)

Production (`master`) returned **500** with:

```text
NeonDbError: column "project_slug" does not exist
```

**What happened**

1. **Shared Neon database** — Vercel preview deployments (feature branch) and production used the same `DATABASE_URL`. Preview ran the project→report rename migrations first, so columns became `report_slug` and tables became `reports`.
2. **Non-idempotent startup migrations** — `runMigrations()` runs on every cold serverless boot via `ensureReady()`. Older `master` code still executed legacy SQL that referenced `project_slug` / `projects` / `project_testing_sessions`.
3. **Table-existence guards were insufficient** — `runIfTableExists('project_testing_sessions')` was true, but the column had already been renamed to `report_slug`, so `INSERT … (project_slug)` failed.
4. **Ordering bug** — Some `ALTER TABLE projects …` blocks ran when only `reports` existed, because guards checked column metadata on a table name that no longer existed.

Preview worked; production broke until migrations were made state-aware and the ledger was added.

### Prevention measures (implemented)

1. **`schema_migrations` ledger** (`migration-ledger.ts`) — Each migration step has a stable id and runs **at most once** per database.
2. **Bootstrap for existing DBs** — If `reports` + `issues.report_slug` already exist but the ledger is empty, all known migration ids are stamped without replaying legacy SQL.
3. **State-aware SQL** — Legacy/backfill/rename blocks inspect `to_regclass()` and `information_schema.columns` for both old (`projects`, `project_slug`) and new (`reports`, `report_slug`) names.
4. **Post-migration verification** (`schema-verify.ts`) — Fails fast if expected report-centric tables/columns/FKs are missing.
5. **`bun run db:verify`** — Runs migrations twice in one process to catch non-idempotent steps during development.

### Rules when adding migrations

1. **Append a new id** to `MIGRATION_IDS` in `migration-ledger.ts` and wrap the step in `runMigrationStep()` in `migrate.ts`. Never rename or reorder existing ids.
2. **Write idempotent SQL** — Assume the database may be in any prior state (fresh, legacy `projects`, or fully renamed `reports`). Guard with `IF EXISTS` / `to_regclass()` / column checks.
3. **Never reference `project_slug` in new code** — Application SQL in `repository.ts` uses `report_slug` only.
4. **Do not run destructive replay** — No blind `INSERT … SELECT` without checking target table **and** column names.
5. **Run locally before deploy** — `bun run db:migrate` then `bun run db:verify` against a copy of production schema when possible.
6. **Separate preview and production databases** — Use different Neon branches or databases for Vercel Preview vs Production. Do not share one `DATABASE_URL` across environments.

### Vercel / Neon checklist

- [ ] Production and Preview use **different** `DATABASE_URL` values in Vercel env settings.
- [ ] `bun run db:migrate` succeeds against the target database before merging schema changes.
- [ ] `bun run db:verify` passes in CI or locally after migration edits.
- [ ] After merge, confirm production logs no longer show migration errors on `GET /`.

## Import / export

- Full report JSON and export payloads are parsed in `import-report.ts`.
- Import accepts nullable `testing_session` fields and free-text `environment` (stored in `test_scope` when not a known enum).
- `report_slug` in export JSON is honored on import (do not derive slug only from title).

## UI conventions

- Use existing shadcn-svelte components under `src/lib/components/ui/`.
- Match patterns in `MetadataGrid.svelte`, `ReportCard.svelte`, `OpenReportDialog.svelte`.
- Prefer compact layouts; resolved reports use muted styling.

## What not to do

- Do not commit `.env` or credentials.
- Do not add migrations that only work on a single known schema state.
- Do not rename DB tables/columns in application code without a ledger migration and verification update.
- Do not create drive-by refactors when fixing a focused bug.
