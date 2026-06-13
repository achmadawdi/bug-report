import { getSql } from './client.js';
import { parseSchemaStatements, SCHEMA_SQL } from './schema.js';

let migrated = false;
let migrationPromise: Promise<void> | null = null;

const BACKFILL_TESTING_SESSIONS_SQL = `
INSERT INTO project_testing_sessions (
	project_slug,
	test_date,
	minecraft_edition,
	game_version_tested,
	device_type,
	tester_count,
	tester_version,
	tester_level,
	test_scope,
	environment
)
SELECT
	slug,
	CASE
		WHEN test_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN test_date
		ELSE '1970-01-01'
	END,
	CASE
		WHEN platform ILIKE '%education%' THEN 'Education'
		WHEN platform ILIKE '%bedrock%' THEN 'Bedrock'
		WHEN platform ILIKE '%java%' THEN 'Java'
		WHEN platform ILIKE '%legacy%' THEN 'Legacy'
		ELSE 'Education'
	END,
	COALESCE(NULLIF(version_tested, ''), ''),
	CASE
		WHEN device ILIKE '%windows%' THEN 'Windows'
		WHEN device ILIKE '%mac%' THEN 'Mac'
		WHEN device ILIKE '%android%' THEN 'Android'
		WHEN device ILIKE '%ios%' THEN 'iOS'
		WHEN device ILIKE '%ipad%' THEN 'iPad'
		WHEN device ILIKE '%chromebook%' THEN 'Chromebook'
		ELSE 'Other'
	END,
	GREATEST(
		1,
		COALESCE(NULLIF(regexp_replace(tester, '[^0-9]', '', 'g'), '')::int, 1)
	),
	'',
	'Mixed',
	NULLIF(test_scope, ''),
	NULL
FROM projects
ON CONFLICT (project_slug) DO NOTHING
`.trim();

const DROP_TEST_DATE_CONSTRAINT_SQL = `
ALTER TABLE project_testing_sessions
	DROP CONSTRAINT IF EXISTS project_testing_sessions_test_date_format_check
`.trim();

const ADD_TEST_DATE_CONSTRAINT_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'project_testing_sessions_test_date_format_check'
	) THEN
		ALTER TABLE project_testing_sessions
			ADD CONSTRAINT project_testing_sessions_test_date_format_check
			CHECK (test_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
	END IF;
END $$
`.trim();

const RENAME_TESTER_LEVEL_COLUMN_SQL = `
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'project_testing_sessions'
			AND column_name = 'tester_education_level'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'project_testing_sessions'
			AND column_name = 'tester_level'
	) THEN
		ALTER TABLE project_testing_sessions
			RENAME COLUMN tester_education_level TO tester_level;
	END IF;
END $$
`.trim();

const MIGRATE_PRIMARY_TO_INTERNAL_SQL = `
UPDATE project_testing_sessions
SET tester_level = 'Internal'
WHERE tester_level = 'Primary'
`.trim();

const DROP_LEGACY_TESTER_CONSTRAINTS_SQL = `
DO $$
DECLARE
	r RECORD;
BEGIN
	FOR r IN
		SELECT conname
		FROM pg_constraint
		WHERE conrelid = 'project_testing_sessions'::regclass
			AND contype = 'c'
			AND conname LIKE '%tester%'
			AND conname <> 'project_testing_sessions_tester_level_check'
	LOOP
		EXECUTE format(
			'ALTER TABLE project_testing_sessions DROP CONSTRAINT IF EXISTS %I',
			r.conname
		);
	END LOOP;
END $$
`.trim();

const DROP_TESTER_EDUCATION_LEVEL_CONSTRAINT_SQL = `
ALTER TABLE project_testing_sessions
	DROP CONSTRAINT IF EXISTS project_testing_sessions_tester_education_level_check
`.trim();

const DROP_TESTER_LEVEL_CONSTRAINT_SQL = `
ALTER TABLE project_testing_sessions
	DROP CONSTRAINT IF EXISTS project_testing_sessions_tester_level_check
`.trim();

const ADD_TESTER_LEVEL_CONSTRAINT_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'project_testing_sessions_tester_level_check'
	) THEN
		ALTER TABLE project_testing_sessions
			ADD CONSTRAINT project_testing_sessions_tester_level_check
			CHECK (tester_level IN (
				'Internal',
				'Middle School',
				'High School',
				'University',
				'Adult / Professional',
				'Mixed'
			));
	END IF;
END $$
`.trim();

const CREATE_PROJECT_GROUPS_SQL = `
CREATE TABLE IF NOT EXISTS project_groups (
	slug TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`.trim();

const ADD_PROJECTS_GROUP_SLUG_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'projects'
			AND column_name = 'group_slug'
	) THEN
		ALTER TABLE projects
			ADD COLUMN group_slug TEXT REFERENCES project_groups (slug) ON DELETE SET NULL;
	END IF;
END $$
`.trim();

const ADD_PROJECTS_TYPE_CHECK_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'projects_type_check'
	) THEN
		ALTER TABLE projects
			ADD CONSTRAINT projects_type_check
			CHECK (type IN (
				'QA Testing Report',
				'Regression Report',
				'Smoke Test Report',
				'Bug Report'
			));
	END IF;
END $$
`.trim();

const ADD_PROJECTS_WORKFLOW_STATUS_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'projects'
			AND column_name = 'workflow_status'
	) THEN
		ALTER TABLE projects
			ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'open';
	END IF;
END $$
`.trim();

const ADD_PROJECTS_WORKFLOW_STATUS_CHECK_SQL = `
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'projects_workflow_status_check'
	) THEN
		ALTER TABLE projects
			ADD CONSTRAINT projects_workflow_status_check
			CHECK (workflow_status IN ('open', 'resolved', 'postponed'));
	END IF;
END $$
`.trim();

const RENAME_PROJECTS_TO_REPORTS_SQL = `
DO $$
BEGIN
	IF to_regclass('public.projects') IS NOT NULL AND to_regclass('public.reports') IS NULL THEN
		ALTER TABLE projects RENAME TO reports;
	END IF;

	IF to_regclass('public.project_testing_sessions') IS NOT NULL
		AND to_regclass('public.report_testing_sessions') IS NULL THEN
		ALTER TABLE project_testing_sessions RENAME TO report_testing_sessions;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'report_testing_sessions'
			AND column_name = 'project_slug'
	) THEN
		ALTER TABLE report_testing_sessions RENAME COLUMN project_slug TO report_slug;
	END IF;

	IF to_regclass('public.project_severity_guide') IS NOT NULL
		AND to_regclass('public.report_severity_guide') IS NULL THEN
		ALTER TABLE project_severity_guide RENAME TO report_severity_guide;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'report_severity_guide'
			AND column_name = 'project_slug'
	) THEN
		ALTER TABLE report_severity_guide RENAME COLUMN project_slug TO report_slug;
	END IF;

	IF to_regclass('public.project_clean_levels') IS NOT NULL
		AND to_regclass('public.report_clean_levels') IS NULL THEN
		ALTER TABLE project_clean_levels RENAME TO report_clean_levels;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'report_clean_levels'
			AND column_name = 'project_slug'
	) THEN
		ALTER TABLE report_clean_levels RENAME COLUMN project_slug TO report_slug;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'issues'
			AND column_name = 'project_slug'
	) THEN
		ALTER TABLE issues RENAME COLUMN project_slug TO report_slug;
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'evidence_media'
			AND column_name = 'project_slug'
	) THEN
		ALTER TABLE evidence_media RENAME COLUMN project_slug TO report_slug;
	END IF;

	IF to_regclass('public.issues_project_slug_idx') IS NOT NULL
		AND to_regclass('public.issues_report_slug_idx') IS NULL THEN
		ALTER INDEX issues_project_slug_idx RENAME TO issues_report_slug_idx;
	END IF;
END $$
`.trim();

const REPAIR_ISSUES_FOREIGN_KEY_SQL = `
DO $$
DECLARE
	fk_target TEXT;
	fk_name TEXT;
BEGIN
	IF to_regclass('public.projects') IS NOT NULL AND to_regclass('public.reports') IS NOT NULL THEN
		INSERT INTO reports (
			slug, title, type, platform, version_tested, device, tester,
			tester_version, test_date, test_scope, version, source_file, updated_at
		)
		SELECT
			slug, title, type, platform, version_tested, device, tester,
			tester_version, test_date, test_scope, version, source_file, COALESCE(updated_at, NOW())
		FROM projects
		ON CONFLICT (slug) DO NOTHING;
	END IF;

	IF to_regclass('public.issues') IS NOT NULL AND to_regclass('public.reports') IS NOT NULL THEN
		INSERT INTO reports (
			slug, title, type, platform, version_tested, device, tester,
			tester_version, test_date, test_scope, version, source_file, updated_at
		)
		SELECT DISTINCT
			i.report_slug,
			initcap(replace(i.report_slug, '-', ' ')),
			'QA Testing Report',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			NOW()
		FROM issues i
		LEFT JOIN reports r ON r.slug = i.report_slug
		WHERE r.slug IS NULL;
	END IF;

	SELECT target.relname, con.conname
	INTO fk_target, fk_name
	FROM pg_constraint con
	JOIN pg_class child ON child.oid = con.conrelid
	JOIN pg_class target ON target.oid = con.confrelid
	WHERE child.relname = 'issues'
		AND con.contype = 'f'
		AND EXISTS (
			SELECT 1
			FROM pg_attribute attr
			WHERE attr.attrelid = con.conrelid
				AND attr.attnum = ANY (con.conkey)
				AND attr.attname = 'report_slug'
		)
	LIMIT 1;

	IF fk_target = 'projects' THEN
		EXECUTE format('ALTER TABLE issues DROP CONSTRAINT %I', fk_name);
		fk_target := NULL;
	END IF;

	IF fk_target IS NULL AND NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'issues_report_slug_fkey'
	) THEN
		ALTER TABLE issues
			ADD CONSTRAINT issues_report_slug_fkey
			FOREIGN KEY (report_slug) REFERENCES reports (slug) ON DELETE CASCADE;
	END IF;
END $$
`.trim();

const LEGACY_TESTING_SESSION_MIGRATIONS = [
	RENAME_TESTER_LEVEL_COLUMN_SQL,
	DROP_LEGACY_TESTER_CONSTRAINTS_SQL,
	DROP_TESTER_EDUCATION_LEVEL_CONSTRAINT_SQL,
	DROP_TESTER_LEVEL_CONSTRAINT_SQL,
	MIGRATE_PRIMARY_TO_INTERNAL_SQL,
	BACKFILL_TESTING_SESSIONS_SQL,
	DROP_TEST_DATE_CONSTRAINT_SQL,
	ADD_TEST_DATE_CONSTRAINT_SQL,
	ADD_TESTER_LEVEL_CONSTRAINT_SQL
] as const;

async function runIfTableExists(
	sql: ReturnType<typeof getSql>,
	tableName: string,
	statement: string
): Promise<void> {
	const rows = (await sql`
		SELECT to_regclass(${`public.${tableName}`}) IS NOT NULL AS table_exists
	`) as { table_exists: boolean }[];

	if (rows[0]?.table_exists) {
		await sql.query(statement, []);
	}
}

async function executeMigrations(): Promise<void> {
	const sql = getSql();

	await sql.query(CREATE_PROJECT_GROUPS_SQL, []);
	await sql.query(ADD_PROJECTS_GROUP_SLUG_SQL, []);
	await sql.query(ADD_PROJECTS_WORKFLOW_STATUS_SQL, []);
	await sql.query(ADD_PROJECTS_WORKFLOW_STATUS_CHECK_SQL, []);
	await sql.query(ADD_PROJECTS_TYPE_CHECK_SQL, []);

	for (const statement of LEGACY_TESTING_SESSION_MIGRATIONS) {
		await runIfTableExists(sql, 'project_testing_sessions', statement);
	}

	// Rename legacy project tables/columns before applying schema indexes on report_slug.
	await sql.query(RENAME_PROJECTS_TO_REPORTS_SQL, []);

	for (const statement of parseSchemaStatements(SCHEMA_SQL)) {
		await sql.query(statement, []);
	}

	await sql.query(REPAIR_ISSUES_FOREIGN_KEY_SQL, []);
}

export async function runMigrations(): Promise<void> {
	if (migrated) return;

	if (!migrationPromise) {
		migrationPromise = executeMigrations()
			.then(() => {
				migrated = true;
			})
			.catch((error) => {
				migrationPromise = null;
				throw error;
			});
	}

	return migrationPromise;
}
