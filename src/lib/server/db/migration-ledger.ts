import type { getSql } from './client.js';

export type Sql = ReturnType<typeof getSql>;

const CREATE_SCHEMA_MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
	id TEXT PRIMARY KEY,
	applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`.trim();

/** Ordered migration ids. Append new ids at the end; never rename or reorder. */
export const MIGRATION_IDS = [
	'2026-06-13_create_project_groups',
	'2026-06-13_add_report_group_slug',
	'2026-06-13_add_workflow_status',
	'2026-06-13_add_workflow_status_check',
	'2026-06-13_add_report_type_check',
	'2026-06-13_legacy_testing_sessions',
	'2026-06-13_rename_projects_to_reports',
	'2026-06-13_backfill_testing_sessions',
	'2026-06-13_apply_schema_sql',
	'2026-06-13_repair_issues_foreign_key',
	'2026-06-13_add_workflow_note',
	'2026-06-13_add_sort_order'
] as const;

export type MigrationId = (typeof MIGRATION_IDS)[number];

export async function ensureMigrationLedger(sql: Sql): Promise<void> {
	await sql.query(CREATE_SCHEMA_MIGRATIONS_SQL, []);
}

export async function isMigrationApplied(sql: Sql, id: MigrationId): Promise<boolean> {
	const rows = (await sql`
		SELECT 1
		FROM schema_migrations
		WHERE id = ${id}
		LIMIT 1
	`) as { '?column?': number }[];

	return rows.length > 0;
}

export async function markMigrationApplied(sql: Sql, id: MigrationId): Promise<void> {
	await sql`
		INSERT INTO schema_migrations (id)
		VALUES (${id})
		ON CONFLICT (id) DO NOTHING
	`;
}

/**
 * Existing databases created before the ledger was introduced already have the
 * report-centric schema. Stamp all known migrations so startup does not replay
 * legacy SQL against a partially- or fully-renamed schema.
 */
export async function bootstrapLedgerForExistingDatabase(sql: Sql): Promise<boolean> {
	const counts = (await sql`
		SELECT COUNT(*)::int AS count
		FROM schema_migrations
	`) as { count: number }[];

	if ((counts[0]?.count ?? 0) > 0) {
		return false;
	}

	const readiness = (await sql`
		SELECT (
			to_regclass('public.reports') IS NOT NULL
			AND EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
					AND table_name = 'issues'
					AND column_name = 'report_slug'
			)
		) AS ready
	`) as { ready: boolean }[];

	if (!readiness[0]?.ready) {
		return false;
	}

	for (const id of MIGRATION_IDS) {
		await markMigrationApplied(sql, id);
	}

	return true;
}

export async function runMigrationStep(
	sql: Sql,
	id: MigrationId,
	run: () => Promise<void>
): Promise<void> {
	if (await isMigrationApplied(sql, id)) {
		return;
	}

	await run();
	await markMigrationApplied(sql, id);
}
