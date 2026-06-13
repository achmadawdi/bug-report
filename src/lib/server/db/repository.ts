import type { BugStatus, EvidenceMedia, Issue, ReportData, ReportWorkflowStatus } from '$lib/types.js';
import { normalizeTestingSession, parseReportData, reportDataSchema } from '$lib/types.js';
import { getBundledSeedReports } from '$lib/server/storage/seed.js';
import { getSql } from './client.js';
import { runMigrations } from './migrate.js';

let seeded = false;

type ReportRow = {
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
	group_slug: string | null;
	workflow_status: string;
};

type TestingSessionRow = {
	test_date: string;
	minecraft_edition: string;
	game_version_tested: string;
	device_type: string;
	tester_count: number;
	tester_level: string;
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
	const countRows = (await sql`SELECT COUNT(*)::int AS count FROM reports`) as { count: number }[];
	const count = countRows[0]?.count ?? 0;
	if (count > 0) return;

	const seeds = getBundledSeedReports();
	for (const { slug, json } of seeds) {
		const data = parseReportData(JSON.parse(json));
		await saveReport(slug, data);
	}
}

export async function ensureReady(): Promise<void> {
	await runMigrations();
	await seedFromBundledData();
}

export async function listReportSlugs(): Promise<string[]> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`SELECT slug FROM reports ORDER BY sort_order, title`) as { slug: string }[];
	return rows.map((row) => row.slug);
}

export async function reportExists(slug: string): Promise<boolean> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`SELECT 1 FROM reports WHERE slug = ${slug} LIMIT 1`) as unknown[];
	return rows.length > 0;
}

function buildTestingSession(
	report: ReportRow,
	sessionRow: TestingSessionRow | undefined
): ReportData['testing_session'] {
	if (sessionRow) {
		return normalizeTestingSession({
			test_date: sessionRow.test_date,
			minecraft_edition: sessionRow.minecraft_edition as ReportData['testing_session']['minecraft_edition'],
			game_version_tested: sessionRow.game_version_tested,
			device_type: sessionRow.device_type as ReportData['testing_session']['device_type'],
			tester_count: sessionRow.tester_count,
			tester_level: sessionRow.tester_level as ReportData['testing_session']['tester_level'],
			test_scope: sessionRow.test_scope,
			environment: sessionRow.environment as ReportData['testing_session']['environment']
		});
	}

	return normalizeTestingSession(undefined, {
		platform: report.platform,
		version_tested: report.version_tested,
		device: report.device,
		tester: report.tester,
		test_date: report.test_date,
		test_scope: report.test_scope
	});
}

export async function getReport(slug: string): Promise<ReportData> {
	await ensureReady();
	const sql = getSql();

	const reportRows = (await sql`
		SELECT slug, title, type, platform, version_tested, device, tester,
			tester_version, test_date, test_scope, version, source_file, group_slug
		FROM reports
		WHERE slug = ${slug}
	`) as ReportRow[];

	if (reportRows.length === 0) {
		throw new Error(`Report "${slug}" not found`);
	}

	const reportRow = reportRows[0] as ReportRow;

	const sessionRows = (await sql`
		SELECT test_date, minecraft_edition, game_version_tested, device_type,
			tester_count, tester_level, test_scope, environment
		FROM report_testing_sessions
		WHERE report_slug = ${slug}
	`) as TestingSessionRow[];

	const severityRows = (await sql`
		SELECT severity, description
		FROM report_severity_guide
		WHERE report_slug = ${slug}
	`) as SeverityRow[];

	const cleanLevelRows = (await sql`
		SELECT level_name, sort_order
		FROM report_clean_levels
		WHERE report_slug = ${slug}
		ORDER BY sort_order, level_name
	`) as CleanLevelRow[];

	const issueRows = (await sql`
		SELECT id, area, title, severity, category, finding, expected_result,
			status, notes, evidence, reason, suggested_text_or_behavior, source_page
		FROM issues
		WHERE report_slug = ${slug}
		ORDER BY id
	`) as IssueRow[];

	const evidenceRows = (await sql`
		SELECT issue_id, type, src, caption, sort_order
		FROM evidence_media
		WHERE report_slug = ${slug}
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

	const testing_session = buildTestingSession(reportRow, sessionRows[0]);

	const sourceFile = reportRow.source_file.trim() === '' ? null : reportRow.source_file;

	const data: ReportData = {
		report: {
			title: reportRow.title,
			type: reportRow.type as ReportData['report']['type'],
			version: reportRow.version,
			source_file: sourceFile
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
		WHERE report_slug = ${slug} AND id = ${issueId}
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
	const legacySourceFile = report.source_file ?? '';

	await sql.transaction((txn) => {
		const queries = [
			txn`
				INSERT INTO reports (
					slug, title, type, platform, version_tested, device, tester,
					tester_version, test_date, test_scope, version, source_file, updated_at
				) VALUES (
					${slug}, ${report.title}, ${report.type}, ${legacyPlatform},
					${legacyVersionTested}, ${legacyDevice}, ${legacyTester},
					${''}, ${testing_session.test_date},
					${legacyTestScope}, ${report.version}, ${legacySourceFile}, NOW()
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
				INSERT INTO report_testing_sessions (
					report_slug, test_date, minecraft_edition, game_version_tested,
					device_type, tester_count, tester_version, tester_level,
					test_scope, environment
				) VALUES (
					${slug}, ${testing_session.test_date}, ${testing_session.minecraft_edition},
					${testing_session.game_version_tested}, ${testing_session.device_type},
					${testing_session.tester_count}, ${''}, ${testing_session.tester_level},
					${testing_session.test_scope ?? null}, ${testing_session.environment ?? null}
				)
				ON CONFLICT (report_slug) DO UPDATE SET
					test_date = EXCLUDED.test_date,
					minecraft_edition = EXCLUDED.minecraft_edition,
					game_version_tested = EXCLUDED.game_version_tested,
					device_type = EXCLUDED.device_type,
					tester_count = EXCLUDED.tester_count,
					tester_version = EXCLUDED.tester_version,
					tester_level = EXCLUDED.tester_level,
					test_scope = EXCLUDED.test_scope,
					environment = EXCLUDED.environment
			`,
			txn`DELETE FROM report_severity_guide WHERE report_slug = ${slug}`,
			txn`DELETE FROM report_clean_levels WHERE report_slug = ${slug}`,
			txn`DELETE FROM issues WHERE report_slug = ${slug}`
		];

		for (const [severity, description] of Object.entries(normalized.severity_guide)) {
			queries.push(
				txn`
					INSERT INTO report_severity_guide (report_slug, severity, description)
					VALUES (${slug}, ${severity}, ${description})
				`
			);
		}

		for (let i = 0; i < normalized.levels_with_no_issues_recorded.length; i++) {
			const level_name = normalized.levels_with_no_issues_recorded[i];
			queries.push(
				txn`
					INSERT INTO report_clean_levels (report_slug, level_name, sort_order)
					VALUES (${slug}, ${level_name}, ${i})
				`
			);
		}

		for (const issue of normalized.issues) {
			queries.push(
				txn`
					INSERT INTO issues (
						report_slug, id, area, title, severity, category, finding,
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
						INSERT INTO evidence_media (report_slug, issue_id, type, src, caption, sort_order)
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

export type ProjectGroupRow = {
	slug: string;
	title: string;
};

export type ProjectGroupStatsRow = {
	slug: string;
	title: string;
	report_count: number;
	issue_count: number;
	open_count: number;
	critical_count: number;
	resolved_count: number;
};

export async function listProjectGroups(): Promise<ProjectGroupRow[]> {
	await ensureReady();
	const sql = getSql();
	return (await sql`
		SELECT slug, title
		FROM project_groups
		ORDER BY sort_order, title
	`) as ProjectGroupRow[];
}

export async function projectGroupExists(slug: string): Promise<boolean> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT 1 FROM project_groups WHERE slug = ${slug} LIMIT 1
	`) as unknown[];
	return rows.length > 0;
}

export async function createProjectGroup(slug: string, title: string): Promise<ProjectGroupRow> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		INSERT INTO project_groups (slug, title, sort_order)
		VALUES (
			${slug},
			${title},
			COALESCE((SELECT MAX(sort_order) + 1 FROM project_groups), 0)
		)
		RETURNING slug, title
	`) as ProjectGroupRow[];
	return rows[0];
}

export async function getProjectGroup(slug: string): Promise<ProjectGroupRow | null> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT slug, title FROM project_groups WHERE slug = ${slug}
	`) as ProjectGroupRow[];
	return rows[0] ?? null;
}

export async function listProjectGroupStats(): Promise<ProjectGroupStatsRow[]> {
	await ensureReady();
	const sql = getSql();
	return (await sql`
		SELECT
			g.slug,
			g.title,
			COUNT(DISTINCT r.slug)::int AS report_count,
			COUNT(i.id)::int AS issue_count,
			COUNT(i.id) FILTER (WHERE i.status = 'open' OR i.status = 'in_progress')::int AS open_count,
			COUNT(i.id) FILTER (WHERE i.severity = 'Critical')::int AS critical_count,
			COUNT(i.id) FILTER (WHERE i.status = 'fixed' OR i.status = 'wont_fix')::int AS resolved_count
		FROM project_groups g
		LEFT JOIN reports r ON r.group_slug = g.slug
		LEFT JOIN issues i ON i.report_slug = r.slug
		GROUP BY g.slug, g.title
		ORDER BY g.sort_order, g.title
	`) as ProjectGroupStatsRow[];
}

export async function getReportGroupSlug(reportSlug: string): Promise<string | null> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT group_slug FROM reports WHERE slug = ${reportSlug}
	`) as { group_slug: string | null }[];
	return rows[0]?.group_slug ?? null;
}

export async function listReportsInGroup(groupSlug: string): Promise<string[]> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT slug FROM reports WHERE group_slug = ${groupSlug} ORDER BY sort_order, title
	`) as { slug: string }[];
	return rows.map((row) => row.slug);
}

export async function setReportGroupSlug(
	reportSlug: string,
	groupSlug: string | null
): Promise<void> {
	await ensureReady();
	const sql = getSql();

	if (groupSlug) {
		const groupRows = (await sql`
			SELECT 1 FROM project_groups WHERE slug = ${groupSlug} LIMIT 1
		`) as unknown[];
		if (groupRows.length === 0) {
			throw new Error(`Group "${groupSlug}" not found`);
		}
	}

	const rows = (await sql`
		UPDATE reports
		SET group_slug = ${groupSlug}, updated_at = NOW()
		WHERE slug = ${reportSlug}
		RETURNING slug
	`) as { slug: string }[];

	if (rows.length === 0) {
		throw new Error(`Report "${reportSlug}" not found`);
	}

	await appendReportSortOrder(reportSlug);
}

async function getMaxReportSortOrder(groupSlug: string | null): Promise<number> {
	await ensureReady();
	const sql = getSql();
	const rows = groupSlug
		? ((await sql`
				SELECT COALESCE(MAX(sort_order), -1)::int AS max_order
				FROM reports
				WHERE group_slug = ${groupSlug}
			`) as { max_order: number }[])
		: ((await sql`
				SELECT COALESCE(MAX(sort_order), -1)::int AS max_order
				FROM reports
				WHERE group_slug IS NULL
			`) as { max_order: number }[]);
	return rows[0]?.max_order ?? -1;
}

export async function appendReportSortOrder(reportSlug: string): Promise<void> {
	await ensureReady();
	const sql = getSql();
	const groupSlug = await getReportGroupSlug(reportSlug);
	const nextOrder = (await getMaxReportSortOrder(groupSlug)) + 1;
	await sql`
		UPDATE reports
		SET sort_order = ${nextOrder}, updated_at = NOW()
		WHERE slug = ${reportSlug}
	`;
}

export async function reorderProjectGroups(orderedSlugs: string[]): Promise<void> {
	if (orderedSlugs.length === 0) return;

	await ensureReady();
	const sql = getSql();
	const uniqueSlugs = [...new Set(orderedSlugs)];
	const rows = (await sql`
		SELECT slug
		FROM project_groups
		WHERE slug = ANY(${uniqueSlugs})
	`) as { slug: string }[];

	if (rows.length !== uniqueSlugs.length) {
		throw new Error('One or more groups were not found.');
	}

	await sql.transaction((txn) =>
		uniqueSlugs.map((slug, index) =>
			txn`UPDATE project_groups SET sort_order = ${index} WHERE slug = ${slug}`
		)
	);
}

export async function reorderReportsInGroup(
	groupSlug: string,
	orderedSlugs: string[]
): Promise<void> {
	if (orderedSlugs.length === 0) return;

	await ensureReady();
	const sql = getSql();

	const groupRows = (await sql`
		SELECT 1 FROM project_groups WHERE slug = ${groupSlug} LIMIT 1
	`) as unknown[];
	if (groupRows.length === 0) {
		throw new Error(`Group "${groupSlug}" not found`);
	}

	const uniqueSlugs = [...new Set(orderedSlugs)];
	const rows = (await sql`
		SELECT slug
		FROM reports
		WHERE group_slug = ${groupSlug}
			AND slug = ANY(${uniqueSlugs})
	`) as { slug: string }[];

	if (rows.length !== uniqueSlugs.length) {
		throw new Error('One or more reports were not found in this group.');
	}

	await sql.transaction((txn) =>
		uniqueSlugs.map((slug, index) =>
			txn`UPDATE reports SET sort_order = ${index}, updated_at = NOW() WHERE slug = ${slug}`
		)
	);
}

export async function reorderStandaloneReports(orderedSlugs: string[]): Promise<void> {
	if (orderedSlugs.length === 0) return;

	await ensureReady();
	const sql = getSql();
	const uniqueSlugs = [...new Set(orderedSlugs)];
	const rows = (await sql`
		SELECT slug
		FROM reports
		WHERE group_slug IS NULL
			AND slug = ANY(${uniqueSlugs})
	`) as { slug: string }[];

	if (rows.length !== uniqueSlugs.length) {
		throw new Error('One or more standalone reports were not found.');
	}

	await sql.transaction((txn) =>
		uniqueSlugs.map((slug, index) =>
			txn`UPDATE reports SET sort_order = ${index}, updated_at = NOW() WHERE slug = ${slug}`
		)
	);
}

export async function listStandaloneReportSlugs(): Promise<string[]> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT slug FROM reports WHERE group_slug IS NULL ORDER BY sort_order, title
	`) as { slug: string }[];
	return rows.map((row) => row.slug);
}

export async function getReportWorkflowStatus(slug: string): Promise<ReportWorkflowStatus> {
	const workflow = await getReportWorkflow(slug);
	return workflow.status;
}

export type ReportWorkflow = {
	status: ReportWorkflowStatus;
	note: string | null;
};

export async function getReportWorkflow(slug: string): Promise<ReportWorkflow> {
	await ensureReady();
	const sql = getSql();
	const rows = (await sql`
		SELECT workflow_status, workflow_note
		FROM reports
		WHERE slug = ${slug}
	`) as { workflow_status: string; workflow_note: string | null }[];

	if (rows.length === 0) {
		throw new Error(`Report "${slug}" not found`);
	}

	const status = rows[0].workflow_status;
	const normalizedStatus =
		status === 'open' || status === 'resolved' || status === 'postponed' ? status : 'open';

	return {
		status: normalizedStatus,
		note: rows[0].workflow_note?.trim() || null
	};
}

export async function updateReportWorkflowStatus(
	slug: string,
	status: ReportWorkflowStatus,
	note: string | null = null
): Promise<ReportWorkflow> {
	await ensureReady();
	const sql = getSql();
	const workflowNote = status === 'open' ? null : note?.trim() || null;
	const rows = (await sql`
		UPDATE reports
		SET
			workflow_status = ${status},
			workflow_note = ${workflowNote},
			updated_at = NOW()
		WHERE slug = ${slug}
		RETURNING workflow_status, workflow_note
	`) as { workflow_status: ReportWorkflowStatus; workflow_note: string | null }[];

	if (rows.length === 0) {
		throw new Error(`Report "${slug}" not found`);
	}

	return {
		status: rows[0].workflow_status,
		note: rows[0].workflow_note?.trim() || null
	};
}
