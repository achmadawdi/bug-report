import path from 'node:path';
import {
	type BugStatus,
	type EvidenceMedia,
	type Issue,
	type ReportData,
	type ReportMeta,
	type ReportSummary as ReportIssueSummary,
	type ReportView,
	type Severity,
	type TestingSession,
	type ReportWorkflowStatus,
	reportDataSchema
} from '$lib/types.js';
import { SEVERITIES, STATUSES } from '$lib/constants.js';
import type { IdConflictStrategy, SlugConflictStrategy } from '$lib/import-report.js';
import { resolveDuplicateIssueIds } from '$lib/import-report.js';
import { generateNextBugId } from '$lib/issues.js';
import {
	ensureDbReady,
	canUseR2Storage,
	getReport as getReportData,
	getCachedReportSummaries,
	reportExists as checkReportExists,
	saveReport,
	updateIssueStatus as updateIssueStatusDb,
	saveEvidenceFile as saveEvidenceToR2,
	deleteEvidenceBySrc,
	listProjectGroups as listProjectGroupsDb,
	projectGroupExists,
	createProjectGroup as createProjectGroupDb,
	getProjectGroup as getProjectGroupDb,
	deleteProjectGroup as deleteProjectGroupDb,
	listEvidenceSrcForReport,
	deleteReport as deleteReportDb,
	listProjectGroupStats,
	getReportGroupSlug,
	setReportGroupSlug as setReportGroupSlugDb,
	appendReportSortOrder,
	reorderProjectGroups,
	reorderReportsInGroup,
	reorderStandaloneReports,
	getReportWorkflow,
	getReportWorkflowStatus,
	updateReportWorkflowStatus
} from '$lib/server/storage/index.js';
import type { ReportSummaryRow } from '$lib/server/storage/index.js';

export type ImportReportOptions = {
	name?: string;
	slug?: string;
	slugConflict: SlugConflictStrategy;
	idConflict: IdConflictStrategy;
	groupSlug?: string | null;
};

export type ReportSummary = {
	slug: string;
	title: string;
	issueCount: number;
	platform: string;
	version: string;
	gameVersion: string;
	openCount: number;
	criticalCount: number;
	fixedCount: number;
	resolvedCount: number;
	groupSlug: string | null;
	groupTitle: string | null;
	testDate: string;
	workflowStatus: ReportWorkflowStatus;
};

export type ProjectGroupSummary = {
	slug: string;
	title: string;
	reportCount: number;
	issueCount: number;
	openCount: number;
	criticalCount: number;
	resolvedCount: number;
	reportSlugs: string[];
};

export type ProjectGroupDetail = ProjectGroupSummary & {
	reports: ReportSummary[];
};

const DEFAULT_SEVERITY_GUIDE: Record<string, string> = {
	Critical:
		'Blocks progression, causes softlock, breaks level completion, or prevents the game from continuing properly.',
	High: 'Major gameplay issue that strongly affects player experience, level logic, combat, or multiplayer stability.',
	Medium:
		'Noticeable issue, but the game can still continue. Usually related to clarity, balance, or player guidance.',
	Low: 'Minor visual, text, formatting, or polish issue.'
};

function deriveSummary(issues: Issue[]): ReportIssueSummary {
	const by_severity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<
		Severity,
		number
	>;
	const by_status = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
		BugStatus,
		number
	>;
	const by_area: Record<string, number> = {};

	for (const issue of issues) {
		by_severity[issue.severity] += 1;
		by_status[issue.status] += 1;
		by_area[issue.area] = (by_area[issue.area] ?? 0) + 1;
	}

	return {
		total_issues: issues.length,
		by_severity,
		by_area,
		by_status
	};
}

function normalizeIssue(issue: Issue): Issue {
	return {
		...issue,
		status: issue.status ?? 'open',
		finding: issue.finding ?? [],
		expected_result: issue.expected_result ?? [],
		evidence_media: issue.evidence_media ?? []
	};
}

function toReportView(data: ReportData): ReportView {
	const issues = data.issues.map(normalizeIssue);
	const { summary: _summary, ...rest } = data;

	return {
		...rest,
		issues,
		summary: deriveSummary(issues)
	};
}

export function isValidSlug(slug: string): boolean {
	return Boolean(slug && !slug.includes('..') && !slug.includes('/') && !slug.includes('\\'));
}

export function validateSlug(slug: string): void {
	if (!isValidSlug(slug)) {
		throw new Error('Invalid report slug');
	}
}

const writeQueues = new Map<string, Promise<unknown>>();

function enqueueReportWrite<T>(report: string, operation: () => Promise<T>): Promise<T> {
	const previous = writeQueues.get(report) ?? Promise.resolve();
	const next = previous
		.catch(() => undefined)
		.then(operation)
		.finally(() => {
			if (writeQueues.get(report) === next) {
				writeQueues.delete(report);
			}
		});
	writeQueues.set(report, next);
	return next;
}

export function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'report';
}

async function writeReportData(report: string, data: ReportData): Promise<void> {
	validateSlug(report);

	const normalized: ReportData = {
		...data,
		issues: data.issues.map(normalizeIssue),
		summary: deriveSummary(data.issues.map(normalizeIssue))
	};

	await saveReport(report, normalized);
}

function createEmptyReport(title: string): ReportData {
	const report: ReportMeta = {
		title,
		type: 'QA Testing Report',
		version: '',
		source_file: null
	};

	const testing_session: TestingSession = {
		test_date: new Date().toISOString().slice(0, 10),
		minecraft_edition: 'Education',
		game_version_tested: '',
		device_type: 'Windows',
		tester_count: 1,
		tester_level: 'Mixed',
		test_scope: null,
		environment: null
	};

	return {
		report,
		testing_session,
		severity_guide: { ...DEFAULT_SEVERITY_GUIDE },
		levels_with_no_issues_recorded: [],
		issues: []
	};
}

export async function ensureReportsReady(): Promise<void> {
	await ensureDbReady();
}

function normalizeWorkflowStatus(status: string): ReportWorkflowStatus {
	return status === 'open' || status === 'resolved' || status === 'postponed' ? status : 'open';
}

function summaryFromRow(row: ReportSummaryRow): ReportSummary {
	return {
		slug: row.slug,
		title: row.title,
		issueCount: row.issue_count,
		platform: row.platform,
		version: row.version,
		gameVersion: row.game_version_tested,
		openCount: row.open_count,
		criticalCount: row.critical_count,
		fixedCount: row.fixed_count,
		resolvedCount: row.resolved_count,
		groupSlug: row.group_slug,
		groupTitle: row.group_title,
		testDate: row.test_date,
		workflowStatus: normalizeWorkflowStatus(row.workflow_status)
	};
}

function rollupReports(reports: ReportSummary[]) {
	return reports.reduce(
		(acc, report) => ({
			issueCount: acc.issueCount + report.issueCount,
			openCount: acc.openCount + report.openCount,
			criticalCount: acc.criticalCount + report.criticalCount,
			resolvedCount: acc.resolvedCount + report.resolvedCount
		}),
		{ issueCount: 0, openCount: 0, criticalCount: 0, resolvedCount: 0 }
	);
}

export function buildProjectGroupDetail(
	group: ProjectGroupSummary,
	reports: ReportSummary[]
): ProjectGroupDetail {
	return {
		slug: group.slug,
		title: group.title,
		reportCount: reports.length,
		reportSlugs: reports.map((report) => report.slug),
		...rollupReports(reports),
		reports
	};
}

export function buildProjectGroupDetails(
	groupSummaries: ProjectGroupSummary[],
	allReports: ReportSummary[]
): ProjectGroupDetail[] {
	return groupSummaries.map((group) =>
		buildProjectGroupDetail(
			group,
			allReports.filter((report) => report.groupSlug === group.slug)
		)
	);
}

export function filterStandaloneReports(reports: ReportSummary[]): ReportSummary[] {
	return reports.filter((report) => report.groupSlug === null);
}

export async function listReports(): Promise<ReportSummary[]> {
	await ensureDbReady();
	const rows = await getCachedReportSummaries();
	return rows.map(summaryFromRow);
}

export async function listStandaloneReports(): Promise<ReportSummary[]> {
	return filterStandaloneReports(await listReports());
}

export async function listGroups(): Promise<ProjectGroupSummary[]> {
	await ensureDbReady();

	const [stats, rows] = await Promise.all([listProjectGroupStats(), getCachedReportSummaries()]);

	const slugsByGroup = new Map<string, string[]>();
	for (const row of rows) {
		if (!row.group_slug) continue;
		const slugs = slugsByGroup.get(row.group_slug) ?? [];
		slugs.push(row.slug);
		slugsByGroup.set(row.group_slug, slugs);
	}

	return stats.map((row) => ({
		slug: row.slug,
		title: row.title,
		reportCount: row.report_count,
		issueCount: row.issue_count,
		openCount: row.open_count,
		criticalCount: row.critical_count,
		resolvedCount: row.resolved_count,
		reportSlugs: slugsByGroup.get(row.slug) ?? []
	}));
}

export async function listGroupsWithReports(): Promise<ProjectGroupDetail[]> {
	const [groupSummaries, allReports] = await Promise.all([listGroups(), listReports()]);
	return buildProjectGroupDetails(groupSummaries, allReports);
}

export async function reorderGroups(orderedSlugs: string[]): Promise<void> {
	await ensureDbReady();
	await reorderProjectGroups(orderedSlugs);
}

export async function reorderGroupReports(groupSlug: string, orderedSlugs: string[]): Promise<void> {
	validateSlug(groupSlug);
	await ensureDbReady();
	await reorderReportsInGroup(groupSlug, orderedSlugs);
}

export async function reorderStandaloneReportOrder(orderedSlugs: string[]): Promise<void> {
	await ensureDbReady();
	await reorderStandaloneReports(orderedSlugs);
}

export async function getGroupWithReports(groupSlug: string): Promise<ProjectGroupDetail | null> {
	validateSlug(groupSlug);
	await ensureDbReady();

	const group = await getProjectGroupDb(groupSlug);
	if (!group) return null;

	const rows = await getCachedReportSummaries();
	const reports = rows.filter((row) => row.group_slug === groupSlug).map(summaryFromRow);

	return buildProjectGroupDetail(
		{
			slug: group.slug,
			title: group.title,
			reportCount: reports.length,
			issueCount: 0,
			openCount: 0,
			criticalCount: 0,
			resolvedCount: 0,
			reportSlugs: reports.map((report) => report.slug)
		},
		reports
	);
}

export async function deleteGroup(groupSlug: string): Promise<void> {
	validateSlug(groupSlug);
	await ensureDbReady();
	await deleteProjectGroupDb(groupSlug);
}

export async function deleteReport(slug: string): Promise<void> {
	validateSlug(slug);
	await ensureDbReady();

	const evidenceSrcs = await listEvidenceSrcForReport(slug);

	if (canUseR2Storage()) {
		await Promise.all(
			evidenceSrcs.map((src) =>
				deleteEvidenceBySrc(src, slug).catch(() => undefined)
			)
		);
	}

	await deleteReportDb(slug);
	writeQueues.delete(slug);
}

export async function createProjectGroup(name: string): Promise<ProjectGroupSummary> {
	await ensureDbReady();

	const title = name.trim();
	if (!title) {
		throw new Error('Group name is required.');
	}

	let slug = slugify(title);

	if (await projectGroupExists(slug)) {
		let suffix = 2;
		while (await projectGroupExists(`${slug}-${suffix}`)) {
			suffix += 1;
		}
		slug = `${slug}-${suffix}`;
	}

	await createProjectGroupDb(slug, title);

	return {
		slug,
		title,
		reportCount: 0,
		issueCount: 0,
		openCount: 0,
		criticalCount: 0,
		resolvedCount: 0,
		reportSlugs: []
	};
}

export async function assignReportToGroup(
	reportSlug: string,
	groupSlug: string | null
): Promise<void> {
	validateSlug(reportSlug);
	if (groupSlug) validateSlug(groupSlug);

	if (!(await checkReportExists(reportSlug))) {
		throw new Error(`Report "${reportSlug}" not found`);
	}

	await setReportGroupSlugDb(reportSlug, groupSlug);
}

export async function listAllGroups(): Promise<ProjectGroupSummary[]> {
	return listGroups();
}

export async function getReportGroupContext(
	reportSlug: string,
	options?: { skipExistsCheck?: boolean }
): Promise<{
	group: ProjectGroupSummary | null;
	siblingReports: ReportSummary[];
} | null> {
	if (!options?.skipExistsCheck && !(await reportExists(reportSlug))) return null;

	const rows = await getCachedReportSummaries();
	const reportRow = rows.find((row) => row.slug === reportSlug);
	if (!reportRow?.group_slug) {
		return { group: null, siblingReports: [] };
	}

	const siblingReports = rows
		.filter((row) => row.group_slug === reportRow.group_slug)
		.map(summaryFromRow);

	const group: ProjectGroupSummary = {
		slug: reportRow.group_slug,
		title: reportRow.group_title ?? reportRow.group_slug,
		reportCount: siblingReports.length,
		reportSlugs: siblingReports.map((report) => report.slug),
		...rollupReports(siblingReports)
	};

	return { group, siblingReports };
}

export async function reportExists(slug: string): Promise<boolean> {
	if (!isValidSlug(slug)) return false;
	return checkReportExists(slug);
}

export async function createReport(name: string, groupSlug?: string | null): Promise<ReportSummary> {
	await ensureDbReady();

	const title = name.trim();
	if (!title) {
		throw new Error('Report name is required.');
	}

	let slug = slugify(title);

	if (await reportExists(slug)) {
		let suffix = 2;
		while (await reportExists(`${slug}-${suffix}`)) {
			suffix += 1;
		}
		slug = `${slug}-${suffix}`;
	}

	const data = createEmptyReport(title);
	await writeReportData(slug, data);

	if (groupSlug) {
		await setReportGroupSlugDb(slug, groupSlug);
	} else {
		await appendReportSortOrder(slug);
	}

	const summary = await readReportSummary(slug);
	if (!summary) {
		throw new Error('Failed to create report.');
	}

	return summary;
}

function toReportSummary(
	slug: string,
	report: ReportView,
	groupSlug: string | null = null,
	groupTitle: string | null = null,
	workflowStatus: ReportWorkflowStatus = 'open'
): ReportSummary {
	return {
		slug,
		title: report.report.title,
		issueCount: report.issues.length,
		platform: report.testing_session.minecraft_edition,
		version: report.report.version,
		gameVersion: report.testing_session.game_version_tested,
		openCount: report.summary.by_status.open + report.summary.by_status.in_progress,
		criticalCount: report.summary.by_severity.Critical,
		fixedCount: report.summary.by_status.fixed,
		resolvedCount: report.summary.by_status.fixed + report.summary.by_status.wont_fix,
		groupSlug,
		groupTitle,
		testDate: report.testing_session.test_date,
		workflowStatus
	};
}

async function readReportSummary(slug: string): Promise<ReportSummary | null> {
	if (!isValidSlug(slug)) return null;

	const rows = await getCachedReportSummaries();
	const row = rows.find((entry) => entry.slug === slug);
	return row ? summaryFromRow(row) : null;
}

export async function getWorkflowStatus(report: string): Promise<ReportWorkflowStatus> {
	validateSlug(report);
	await ensureDbReady();
	return getReportWorkflowStatus(report);
}

export async function getWorkflowInfo(
	report: string
): Promise<{ status: ReportWorkflowStatus; note: string | null }> {
	validateSlug(report);
	await ensureDbReady();
	return getReportWorkflow(report);
}

export async function setWorkflowStatus(
	report: string,
	status: ReportWorkflowStatus,
	note: string | null = null
): Promise<{ status: ReportWorkflowStatus; note: string | null }> {
	validateSlug(report);
	await ensureDbReady();
	return updateReportWorkflowStatus(report, status, note);
}

export async function importReport(
	data: ReportData,
	options: ImportReportOptions
): Promise<ReportSummary> {
	await ensureDbReady();

	const title = (options.name ?? data.report.title).trim();
	if (!title) {
		throw new Error('Report name is required.');
	}

	const duplicateIds = new Set(
		data.issues
			.map((issue) => issue.id)
			.filter((id, index, ids) => ids.indexOf(id) !== index)
	);

	if (duplicateIds.size > 0 && options.idConflict === 'cancel') {
		throw new Error(`Duplicate issue IDs found: ${[...duplicateIds].join(', ')}`);
	}

	const issues = resolveDuplicateIssueIds(data.issues.map(normalizeIssue), options.idConflict);

	let slug = isValidSlug(options.slug ?? '') ? options.slug!.trim() : slugify(title);
	const slugExists = await reportExists(slug);

	if (slugExists) {
		if (options.slugConflict === 'cancel') {
			throw new Error(`Report "${slug}" already exists.`);
		}

		if (options.slugConflict === 'suffix') {
			let suffix = 2;
			while (await reportExists(`${slug}-${suffix}`)) {
				suffix += 1;
			}
			slug = `${slug}-${suffix}`;
		}
	}

	const nextData: ReportData = {
		...data,
		report: {
			...data.report,
			title
		},
		issues
	};

	await writeReportData(slug, nextData);

	if (options.groupSlug) {
		await setReportGroupSlugDb(slug, options.groupSlug);
	}

	const report = toReportView(nextData);
	const summary = await readReportSummary(slug);
	return summary ?? toReportSummary(slug, report);
}

export async function readReport(reportSlug: string): Promise<ReportView> {
	validateSlug(reportSlug);
	await ensureDbReady();

	const parsed = await getReportData(reportSlug);
	return toReportView(parsed);
}

export async function updateIssueStatus(
	report: string,
	id: string,
	status: BugStatus
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		validateSlug(report);
		await updateIssueStatusDb(report, id, status);
		return readReport(report);
	});
}

export async function updateIssue(
	report: string,
	id: string,
	updates: Partial<Issue>
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);
		const index = current.issues.findIndex((issue) => issue.id === id);

		if (index === -1) {
			throw new Error(`Issue ${id} not found`);
		}

		const nextIssues = [...current.issues];
		const existing = nextIssues[index];
		nextIssues[index] = normalizeIssue({
			...existing,
			...updates,
			id,
			evidence_media: updates.evidence_media ?? existing.evidence_media
		});

		const nextData: ReportData = {
			report: current.report,
			testing_session: current.testing_session,
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: nextIssues
		};

		await writeReportData(report, nextData);
		return toReportView(nextData);
	});
}

export async function updateReport(
	report: string,
	updates: {
		report?: Partial<ReportMeta>;
		testing_session?: Partial<TestingSession>;
	}
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);

		const nextData: ReportData = {
			report: {
				...current.report,
				...updates.report
			},
			testing_session: {
				...current.testing_session,
				...updates.testing_session
			},
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: current.issues
		};

		await writeReportData(report, reportDataSchema.parse(nextData));
		return toReportView(nextData);
	});
}

export async function addIssue(
	report: string,
	issue: Omit<Issue, 'id'> & { id?: string }
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);
		const nextId = issue.id ?? generateNextBugId(current.issues);

		const nextIssue = normalizeIssue({
			...issue,
			id: nextId,
			status: issue.status ?? 'open'
		});

		const nextData: ReportData = {
			report: current.report,
			testing_session: current.testing_session,
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: [...current.issues, nextIssue]
		};

		await writeReportData(report, nextData);
		return toReportView(nextData);
	});
}

export async function addEvidenceMedia(
	report: string,
	id: string,
	media: EvidenceMedia
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);
		const issue = current.issues.find((item) => item.id === id);

		if (!issue) {
			throw new Error(`Issue ${id} not found`);
		}

		const nextData: ReportData = {
			report: current.report,
			testing_session: current.testing_session,
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: current.issues.map((item) =>
				item.id === id
					? normalizeIssue({
							...item,
							evidence_media: [...(item.evidence_media ?? []), media]
						})
					: item
			)
		};

		await writeReportData(report, nextData);
		return toReportView(nextData);
	});
}

export async function removeEvidenceMedia(
	report: string,
	id: string,
	src: string
): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);
		const issue = current.issues.find((item) => item.id === id);

		if (!issue) {
			throw new Error(`Issue ${id} not found`);
		}

		await deleteEvidenceBySrc(src, report);

		const nextData: ReportData = {
			report: current.report,
			testing_session: current.testing_session,
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: current.issues.map((item) =>
				item.id === id
					? normalizeIssue({
							...item,
							evidence_media: (item.evidence_media ?? []).filter((media) => media.src !== src)
						})
					: item
			)
		};

		await writeReportData(report, nextData);
		return toReportView(nextData);
	});
}

export async function deleteIssue(report: string, id: string): Promise<ReportView> {
	return enqueueReportWrite(report, async () => {
		const current = await readReport(report);
		const issue = current.issues.find((item) => item.id === id);

		if (!issue) {
			throw new Error(`Issue ${id} not found`);
		}

		if (canUseR2Storage()) {
			await Promise.all(
				(issue.evidence_media ?? []).map((media) =>
					deleteEvidenceBySrc(media.src, report).catch(() => undefined)
				)
			);
		}

		const nextData: ReportData = {
			report: current.report,
			testing_session: current.testing_session,
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: current.issues.filter((item) => item.id !== id)
		};

		await writeReportData(report, nextData);
		return toReportView(nextData);
	});
}

export async function saveEvidenceFile(report: string, id: string, file: File): Promise<string> {
	validateSlug(report);

	const extension = path.extname(file.name) || '.bin';
	const filename = `${id}-${Date.now()}${extension}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	return saveEvidenceToR2(report, filename, buffer, file.type || undefined);
}
