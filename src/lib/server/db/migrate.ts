import { getSql } from './client.js';
import { parseSchemaStatements, SCHEMA_SQL } from './schema.js';

let migrated = false;

const BACKFILL_TESTING_SESSIONS_SQL = `
INSERT INTO project_testing_sessions (
	project_slug,
	test_date,
	minecraft_edition,
	game_version_tested,
	device_type,
	tester_count,
	tester_version,
	tester_education_level,
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
	COALESCE(NULLIF(tester_version, ''), ''),
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
ALTER TABLE project_testing_sessions
	ADD CONSTRAINT project_testing_sessions_test_date_format_check
	CHECK (test_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
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

export async function runMigrations(): Promise<void> {
	if (migrated) return;

	const sql = getSql();

	for (const statement of parseSchemaStatements(SCHEMA_SQL)) {
		await sql.query(statement, []);
	}

	await sql.query(ADD_PROJECTS_TYPE_CHECK_SQL, []);
	await sql.query(DROP_TEST_DATE_CONSTRAINT_SQL, []);
	await sql.query(ADD_TEST_DATE_CONSTRAINT_SQL, []);
	await sql.query(BACKFILL_TESTING_SESSIONS_SQL, []);

	migrated = true;
}
