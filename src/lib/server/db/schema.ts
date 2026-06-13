export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS project_groups (
	slug TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
	slug TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	group_slug TEXT REFERENCES project_groups (slug) ON DELETE SET NULL,
	workflow_status TEXT NOT NULL DEFAULT 'open'
		CHECK (workflow_status IN ('open', 'resolved', 'postponed')),
	workflow_note TEXT,
	type TEXT NOT NULL DEFAULT 'QA Testing Report'
		CHECK (type IN ('QA Testing Report', 'Regression Report', 'Smoke Test Report', 'Bug Report')),
	platform TEXT NOT NULL DEFAULT '',
	version_tested TEXT NOT NULL DEFAULT '',
	device TEXT NOT NULL DEFAULT '',
	tester TEXT NOT NULL DEFAULT '',
	tester_version TEXT NOT NULL DEFAULT '',
	test_date TEXT NOT NULL DEFAULT '',
	test_scope TEXT NOT NULL DEFAULT '',
	version TEXT NOT NULL DEFAULT '',
	source_file TEXT NOT NULL DEFAULT '',
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_testing_sessions (
	report_slug TEXT PRIMARY KEY REFERENCES reports (slug) ON DELETE CASCADE,
	test_date TEXT NOT NULL,
	minecraft_edition TEXT NOT NULL,
	game_version_tested TEXT NOT NULL,
	device_type TEXT NOT NULL,
	tester_count INTEGER NOT NULL,
	tester_version TEXT NOT NULL DEFAULT '',
	tester_level TEXT NOT NULL,
	test_scope TEXT,
	environment TEXT,
	CONSTRAINT report_testing_sessions_test_date_format_check
		CHECK (test_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT report_testing_sessions_minecraft_edition_check
		CHECK (minecraft_edition IN ('Education', 'Bedrock', 'Java', 'Legacy')),
	CONSTRAINT report_testing_sessions_device_type_check
		CHECK (device_type IN ('Windows', 'Mac', 'Android', 'iOS', 'iPad', 'Chromebook', 'Other')),
	CONSTRAINT report_testing_sessions_tester_count_check
		CHECK (tester_count >= 1),
	CONSTRAINT report_testing_sessions_tester_level_check
		CHECK (tester_level IN (
			'Internal',
			'Middle School',
			'High School',
			'University',
			'Adult / Professional',
			'Mixed'
		)),
	CONSTRAINT report_testing_sessions_environment_check
		CHECK (environment IS NULL OR environment IN ('Development', 'Staging', 'Production'))
);

CREATE TABLE IF NOT EXISTS report_severity_guide (
	report_slug TEXT NOT NULL REFERENCES reports (slug) ON DELETE CASCADE,
	severity TEXT NOT NULL,
	description TEXT NOT NULL,
	PRIMARY KEY (report_slug, severity)
);

CREATE TABLE IF NOT EXISTS report_clean_levels (
	report_slug TEXT NOT NULL REFERENCES reports (slug) ON DELETE CASCADE,
	level_name TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (report_slug, level_name)
);

CREATE TABLE IF NOT EXISTS issues (
	report_slug TEXT NOT NULL REFERENCES reports (slug) ON DELETE CASCADE,
	id TEXT NOT NULL,
	area TEXT NOT NULL,
	title TEXT NOT NULL,
	severity TEXT NOT NULL,
	category TEXT NOT NULL,
	finding TEXT[] NOT NULL DEFAULT '{}',
	expected_result TEXT[] NOT NULL DEFAULT '{}',
	status TEXT NOT NULL DEFAULT 'open',
	notes TEXT,
	evidence TEXT,
	reason TEXT,
	suggested_text_or_behavior TEXT[] NOT NULL DEFAULT '{}',
	source_page INTEGER,
	PRIMARY KEY (report_slug, id)
);

CREATE INDEX IF NOT EXISTS issues_report_slug_idx ON issues (report_slug);

CREATE TABLE IF NOT EXISTS evidence_media (
	id SERIAL PRIMARY KEY,
	report_slug TEXT NOT NULL,
	issue_id TEXT NOT NULL,
	type TEXT NOT NULL,
	src TEXT NOT NULL,
	caption TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (report_slug, issue_id) REFERENCES issues (report_slug, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS evidence_media_issue_idx ON evidence_media (report_slug, issue_id);
`.trim();

export function parseSchemaStatements(schema: string): string[] {
	return schema
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && !s.startsWith('--'));
}
