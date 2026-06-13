import type { Sql } from './migration-ledger.js';

type SchemaCheck = {
	label: string;
	ok: boolean;
};

export async function verifyReportSchema(sql: Sql): Promise<void> {
	const checks = (await sql`
		SELECT
			to_regclass('public.reports') IS NOT NULL AS reports_table,
			to_regclass('public.report_testing_sessions') IS NOT NULL AS testing_sessions_table,
			to_regclass('public.issues') IS NOT NULL AS issues_table,
			EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
					AND table_name = 'issues'
					AND column_name = 'report_slug'
			) AS issues_report_slug_column,
			NOT EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
					AND table_name = 'issues'
					AND column_name = 'project_slug'
			) AS issues_without_project_slug,
			NOT EXISTS (
				SELECT 1
				FROM pg_constraint con
				JOIN pg_class child ON child.oid = con.conrelid
				JOIN pg_class target ON target.oid = con.confrelid
				WHERE child.relname = 'issues'
					AND con.contype = 'f'
					AND target.relname = 'projects'
			) AS issues_not_linked_to_projects
	`) as {
		reports_table: boolean;
		testing_sessions_table: boolean;
		issues_table: boolean;
		issues_report_slug_column: boolean;
		issues_without_project_slug: boolean;
		issues_not_linked_to_projects: boolean;
	}[];

	const row = checks[0];
	const failures: SchemaCheck[] = [
		{ label: 'reports table exists', ok: row?.reports_table ?? false },
		{ label: 'report_testing_sessions table exists', ok: row?.testing_sessions_table ?? false },
		{ label: 'issues table exists', ok: row?.issues_table ?? false },
		{ label: 'issues.report_slug column exists', ok: row?.issues_report_slug_column ?? false },
		{ label: 'issues.project_slug column removed', ok: row?.issues_without_project_slug ?? false },
		{
			label: 'issues foreign key does not reference projects',
			ok: row?.issues_not_linked_to_projects ?? false
		}
	].filter((check) => !check.ok);

	if (failures.length > 0) {
		throw new Error(
			`Database schema verification failed: ${failures.map((check) => check.label).join(', ')}`
		);
	}
}
