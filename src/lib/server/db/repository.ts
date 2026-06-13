import type { BugStatus, EvidenceMedia, Issue, ReportData } from '$lib/types.js';
import { normalizeTestingSession, parseReportData, reportDataSchema } from '$lib/types.js';
import { getBundledSeedProjects } from '$lib/server/storage/seed.js';
import { getSql } from './client.js';
import { runMigrations } from './migrate.js';

let seeded = false;

type ProjectRow = {
	slug: string;
	title: string;
	type: string;
	platform: string;
	version_tested: string;
	device: string;
	tester: string;
	tester_version: string;
	test_date: string;
	test_scope: string;
	version: string;
	source_file: string;
};

type TestingSessionRow = {
	test_date: string;
	minecraft_edition: string;
	game_version_tested: string;
	device_type: string;
	tester_count: number;
	tester_version: string;
	tester_education_level: string;
	test_scope: string | null;
	environment: string | null;
};

type SeverityRow = {
	severity: string;
	description: string;
};

type CleanLevelRow = {
	level_name: string;
	sort_order: number;
};

type IssueRow = {
	id: string;
	area: string;
	title: string;
	severity: string;
	category: string;
	finding: string[];
	expected_result: string[];
	status: string;
	notes: string | null;
	evidence: string | null;
	reason: string | null;
	suggested_text_or_behavior: string[];
	source_page: number | null;
};

type EvidenceRow = {
	issue_id: string;
	type: string;
	src: string;
	caption: string | null;
	sort_order: number;
};

async function seedFromBundledData(): Promise<void> {
	if (seeded) return;
	seeded = true;

	const sql = getSql();
	const countRows = (await sql`SELECT COUNT(*)::int AS count FROM projects`) as { count: number }[];
	const count = countRows[0]?.count ?? 0;
	if (count > 0) return;

	const seeds = getBundledSeedProjects();
	for (const { slug, json } of seeds) {
		const data = parseReportData(JSON.parse(json));
		await saveReport(slug, data);
	}
}

export async function ensureReady(): Promise<void> {
	await runMigrations();
	await seedFromBundledData();
}

export async function listProjectSlugs(): Promise<string[]> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`SELECT slug FROM projects ORDER BY slug`) as { slug: string }[];
	return rows.map((row) => row.slug);
}

export async function reportExists(slug: string): Promise<boolean> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`SELECT 1 FROM projects WHERE slug = ${slug} LIMIT 1`) as unknown[];
	return rows.length > 0;
}

function buildTestingSession(
	project: ProjectRow,
	sessionRow: TestingSessionRow | undefined
): ReportData['testing_session'] {
	if (sessionRow) {
		return normalizeTestingSession({
			test_date: sessionRow.test_date,
			minecraft_edition: sessionRow.minecraft_edition as ReportData['testing_session']['minecraft_edition'],
			game_version_tested: sessionRow.game_version_tested,
			device_type: sessionRow.device_type as ReportData['testing_session']['device_type'],
			tester_count: sessionRow.tester_count,
			tester_version: sessionRow.tester_version,
			tester_education_level:
				sessionRow.tester_education_level as ReportData['testing_session']['tester_education_level'],
			test_scope: sessionRow.test_scope,
			environment: sessionRow.environment as ReportData['testing_session']['environment']
		});
	}

	return normalizeTestingSession(undefined, {
		platform: project.platform,
		version_tested: project.version_tested,
		device: project.device,
		tester: project.tester,
		tester_version: project.tester_version,
		test_date: project.test_date,
		test_scope: project.test_scope
	});
}

export async function getReport(slug: string): Promise<ReportData> {
	await ensureReady();
	const sql = getSql();

	const projectRows = (await sql`
		SELECT slug, title, type, platform, version_tested, device, tester,
			tester_version, test_date, test_scope, version, source_file
		FROM projects
		WHERE slug = ${slug}
	`) as ProjectRow[];

	if (projectRows.length === 0) {
		throw new Error(`Project "${slug}" not found`);
	}

	const project = projectRows[0] as ProjectRow;

	const sessionRows = (await sql`
		SELECT test_date, minecraft_edition, game_version_tested, device_type,
			tester_count, tester_version, tester_education_level, test_scope, environment
		FROM project_testing_sessions
		WHERE project_slug = ${slug}
	`) as TestingSessionRow[];

	const severityRows = (await sql`
		SELECT severity, description
		FROM project_severity_guide
		WHERE project_slug = ${slug}
	`) as SeverityRow[];

	const cleanLevelRows = (await sql`
		SELECT level_name, sort_order
		FROM project_clean_levels
		WHERE project_slug = ${slug}
		ORDER BY sort_order, level_name
	`) as CleanLevelRow[];

	const issueRows = (await sql`
		SELECT id, area, title, severity, category, finding, expected_result,
			status, notes, evidence, reason, suggested_text_or_behavior, source_page
		FROM issues
		WHERE project_slug = ${slug}
		ORDER BY id
	`) as IssueRow[];

	const evidenceRows = (await sql`
		SELECT issue_id, type, src, caption, sort_order
		FROM evidence_media
		WHERE project_slug = ${slug}
		ORDER BY issue_id, sort_order, id
	`) as EvidenceRow[];

	const severity_guide: Record<string, string> = {};
	for (const row of severityRows) {
		severity_guide[row.severity] = row.description;
	}

	const levels_with_no_issues_recorded = cleanLevelRows.map((row) => row.level_name);

	const evidenceByIssue = new Map<string, EvidenceMedia[]>();
	for (const row of evidenceRows) {
		const media: EvidenceMedia = {
			type: row.type as EvidenceMedia['type'],
			src: row.src,
			...(row.caption ? { caption: row.caption } : {})
		};
		const list = evidenceByIssue.get(row.issue_id) ?? [];
		list.push(media);
		evidenceByIssue.set(row.issue_id, list);
	}

	const issues: Issue[] = issueRows.map((row) => {
		const issue: Issue = {
			id: row.id,
			area: row.area,
			title: row.title,
			severity: row.severity as Issue['severity'],
			category: row.category,
			finding: row.finding ?? [],
			expected_result: row.expected_result ?? [],
			status: row.status as Issue['status'],
			evidence_media: evidenceByIssue.get(row.id) ?? []
		};

		if (row.notes) issue.notes = row.notes;
		if (row.evidence) issue.evidence = row.evidence;
		if (row.reason) issue.reason = row.reason;
		if (row.suggested_text_or_behavior?.length) {
			issue.suggested_text_or_behavior = row.suggested_text_or_behavior;
		}
		if (row.source_page != null) issue.source_page = row.source_page;

		return issue;
	});

	const testing_session = buildTestingSession(project, sessionRows[0]);

	const data: ReportData = {
		report: {
			title: project.title,
			type: project.type as ReportData['report']['type'],
			version: project.version,
			source_file: project.source_file
		},
		testing_session,
		severity_guide,
		levels_with_no_issues_recorded,
		issues
	};

	return reportDataSchema.parse(data);
}

export async function updateIssueStatus(
	slug: string,
	issueId: string,
	status: BugStatus
): Promise<void> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		UPDATE issues
		SET status = ${status}
		WHERE project_slug = ${slug} AND id = ${issueId}
		RETURNING id
	`) as { id: string }[];

	if (rows.length === 0) {
		throw new Error(`Issue "${issueId}" not found`);
	}
}

export async function saveReport(slug: string, data: ReportData): Promise<void> {
	await ensureReady();
	const sql = getSql();
	const normalized = reportDataSchema.parse(data);
	const { report, testing_session } = normalized;

	const legacyPlatform = testing_session.minecraft_edition;
	const legacyVersionTested = testing_session.game_version_tested;
	const legacyDevice = testing_session.device_type;
	const legacyTester = String(testing_session.tester_count);
	const legacyTestScope = testing_session.test_scope ?? '';

	await sql.transaction((txn) => {
		const queries = [
			txn`
				INSERT INTO projects (
					slug, title, type, platform, version_tested, device, tester,
					tester_version, test_date, test_scope, version, source_file, updated_at
				) VALUES (
					${slug}, ${report.title}, ${report.type}, ${legacyPlatform},
					${legacyVersionTested}, ${legacyDevice}, ${legacyTester},
					${testing_session.tester_version}, ${testing_session.test_date},
					${legacyTestScope}, ${report.version}, ${report.source_file}, NOW()
				)
				ON CONFLICT (slug) DO UPDATE SET
					title = EXCLUDED.title,
					type = EXCLUDED.type,
					platform = EXCLUDED.platform,
					version_tested = EXCLUDED.version_tested,
					device = EXCLUDED.device,
					tester = EXCLUDED.tester,
					tester_version = EXCLUDED.tester_version,
					test_date = EXCLUDED.test_date,
					test_scope = EXCLUDED.test_scope,
					version = EXCLUDED.version,
					source_file = EXCLUDED.source_file,
					updated_at = NOW()
			`,
			txn`
				INSERT INTO project_testing_sessions (
					project_slug, test_date, minecraft_edition, game_version_tested,
					device_type, tester_count, tester_version, tester_education_level,
					test_scope, environment
				) VALUES (
					${slug}, ${testing_session.test_date}, ${testing_session.minecraft_edition},
					${testing_session.game_version_tested}, ${testing_session.device_type},
					${testing_session.tester_count}, ${testing_session.tester_version},
					${testing_session.tester_education_level}, ${testing_session.test_scope ?? null},
					${testing_session.environment ?? null}
				)
				ON CONFLICT (project_slug) DO UPDATE SET
					test_date = EXCLUDED.test_date,
					minecraft_edition = EXCLUDED.minecraft_edition,
					game_version_tested = EXCLUDED.game_version_tested,
					device_type = EXCLUDED.device_type,
					tester_count = EXCLUDED.tester_count,
					tester_version = EXCLUDED.tester_version,
					tester_education_level = EXCLUDED.tester_education_level,
					test_scope = EXCLUDED.test_scope,
					environment = EXCLUDED.environment
			`,
			txn`DELETE FROM project_severity_guide WHERE project_slug = ${slug}`,
			txn`DELETE FROM project_clean_levels WHERE project_slug = ${slug}`,
			txn`DELETE FROM issues WHERE project_slug = ${slug}`
		];

		for (const [severity, description] of Object.entries(normalized.severity_guide)) {
			queries.push(
				txn`
					INSERT INTO project_severity_guide (project_slug, severity, description)
					VALUES (${slug}, ${severity}, ${description})
				`
			);
		}

		for (let i = 0; i < normalized.levels_with_no_issues_recorded.length; i++) {
			const level_name = normalized.levels_with_no_issues_recorded[i];
			queries.push(
				txn`
					INSERT INTO project_clean_levels (project_slug, level_name, sort_order)
					VALUES (${slug}, ${level_name}, ${i})
				`
			);
		}

		for (const issue of normalized.issues) {
			queries.push(
				txn`
					INSERT INTO issues (
						project_slug, id, area, title, severity, category, finding,
						expected_result, status, notes, evidence, reason,
						suggested_text_or_behavior, source_page
					) VALUES (
						${slug}, ${issue.id}, ${issue.area}, ${issue.title}, ${issue.severity},
						${issue.category}, ${issue.finding}, ${issue.expected_result},
						${issue.status ?? 'open'}, ${issue.notes ?? null}, ${issue.evidence ?? null},
						${issue.reason ?? null}, ${issue.suggested_text_or_behavior ?? []},
						${issue.source_page ?? null}
					)
				`
			);

			const media = issue.evidence_media ?? [];
			for (let i = 0; i < media.length; i++) {
				const item = media[i];
				queries.push(
					txn`
						INSERT INTO evidence_media (project_slug, issue_id, type, src, caption, sort_order)
						VALUES (
							${slug}, ${issue.id}, ${item.type}, ${item.src},
							${item.caption ?? null}, ${i}
						)
					`
				);
			}
		}

		return queries;
	});
}
