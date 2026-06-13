CREATE TABLE IF NOT EXISTS projects (
	slug TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	type TEXT NOT NULL DEFAULT 'QA Testing Report',
	platform TEXT NOT NULL DEFAULT '',
	version_tested TEXT NOT NULL DEFAULT '',
	device TEXT NOT NULL DEFAULT '',
	tester TEXT NOT NULL DEFAULT '',
	tester_version TEXT NOT NULL DEFAULT '',
	test_date TEXT NOT NULL DEFAULT '',
	test_scope TEXT NOT NULL DEFAULT '',
	version TEXT NOT NULL DEFAULT '',
	source_file TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_severity_guide (
	project_slug TEXT NOT NULL REFERENCES projects (slug) ON DELETE CASCADE,
	severity TEXT NOT NULL,
	description TEXT NOT NULL,
	PRIMARY KEY (project_slug, severity)
);

CREATE TABLE IF NOT EXISTS project_clean_levels (
	project_slug TEXT NOT NULL REFERENCES projects (slug) ON DELETE CASCADE,
	level_name TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (project_slug, level_name)
);

CREATE TABLE IF NOT EXISTS issues (
	project_slug TEXT NOT NULL REFERENCES projects (slug) ON DELETE CASCADE,
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
	PRIMARY KEY (project_slug, id)
);

CREATE INDEX IF NOT EXISTS issues_project_slug_idx ON issues (project_slug);

CREATE TABLE IF NOT EXISTS evidence_media (
	id SERIAL PRIMARY KEY,
	project_slug TEXT NOT NULL,
	issue_id TEXT NOT NULL,
	type TEXT NOT NULL,
	src TEXT NOT NULL,
	caption TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (project_slug, issue_id) REFERENCES issues (project_slug, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS evidence_media_issue_idx ON evidence_media (project_slug, issue_id);
