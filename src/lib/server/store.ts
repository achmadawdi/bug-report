import path from 'node:path';
import {
	type BugStatus,
	type EvidenceMedia,
	type Issue,
	type ReportData,
	type ReportMeta,
	type ReportSummary,
	type ReportView,
	type Severity,
	type TestingSession,
	reportDataSchema
} from '$lib/types.js';
import { SEVERITIES, STATUSES } from '$lib/constants.js';
import type { IdConflictStrategy, SlugConflictStrategy } from '$lib/import-report.js';
import { resolveDuplicateIssueIds } from '$lib/import-report.js';
import { generateNextBugId } from '$lib/issues.js';
import {
	ensureDbReady,
	getReport as getReportData,
	listProjectSlugs,
	reportExists,
	saveReport,
	updateIssueStatus as updateIssueStatusDb,
	saveEvidenceFile as saveEvidenceToR2,
	deleteEvidenceBySrc
} from '$lib/server/storage/index.js';

export type ImportProjectOptions = {
	name?: string;
	slugConflict: SlugConflictStrategy;
	idConflict: IdConflictStrategy;
};

export type ProjectSummary = {
	slug: string;
	title: string;
	issueCount: number;
	platform: string;
	version: string;
	openCount: number;
	criticalCount: number;
	fixedCount: number;
};

const DEFAULT_SEVERITY_GUIDE: Record<string, string> = {
	Critical:
		'Blocks progression, causes softlock, breaks level completion, or prevents the game from continuing properly.',
	High: 'Major gameplay issue that strongly affects player experience, level logic, combat, or multiplayer stability.',
	Medium:
		'Noticeable issue, but the game can still continue. Usually related to clarity, balance, or player guidance.',
	Low: 'Minor visual, text, formatting, or polish issue.'
};

function deriveSummary(issues: Issue[]): ReportSummary {
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
		throw new Error('Invalid project slug');
	}
}

const writeQueues = new Map<string, Promise<unknown>>();

function enqueueProjectWrite<T>(project: string, operation: () => Promise<T>): Promise<T> {
	const previous = writeQueues.get(project) ?? Promise.resolve();
	const next = previous
		.catch(() => undefined)
		.then(operation)
		.finally(() => {
			if (writeQueues.get(project) === next) {
				writeQueues.delete(project);
			}
		});
	writeQueues.set(project, next);
	return next;
}

export function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'project';
}

async function writeReportData(project: string, data: ReportData): Promise<void> {
	validateSlug(project);

	const normalized: ReportData = {
		...data,
		issues: data.issues.map(normalizeIssue),
		summary: deriveSummary(data.issues.map(normalizeIssue))
	};

	await saveReport(project, normalized);
}

function createEmptyReport(title: string): ReportData {
	const report: ReportMeta = {
		title,
		type: 'QA Testing Report',
		version: '',
		source_file: ''
	};

	const testing_session: TestingSession = {
		test_date: new Date().toISOString().slice(0, 10),
		minecraft_edition: 'Education',
		game_version_tested: '',
		device_type: 'Windows',
		tester_count: 1,
		tester_version: '',
		tester_education_level: 'Mixed',
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

export async function ensureProjectsReady(): Promise<void> {
	await ensureDbReady();
}

export async function listProjects(): Promise<ProjectSummary[]> {
	await ensureDbReady();

	const projects: ProjectSummary[] = [];

	for (const slug of await listProjectSlugs()) {
		if (!isValidSlug(slug)) continue;

		try {
			const report = await readReport(slug);
			projects.push({
				slug,
				title: report.report.title,
				issueCount: report.issues.length,
				platform: report.testing_session.minecraft_edition,
				version: report.report.version,
				openCount: report.summary.by_status.open,
				criticalCount: report.summary.by_severity.Critical,
				fixedCount: report.summary.by_status.fixed
			});
		} catch {
			// skip invalid projects
		}
	}

	return projects.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

export async function projectExists(project: string): Promise<boolean> {
	if (!isValidSlug(project)) return false;
	return reportExists(project);
}

export async function createProject(name: string): Promise<ProjectSummary> {
	await ensureDbReady();

	const title = name.trim();
	if (!title) {
		throw new Error('Project name is required.');
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

	return {
		slug,
		title,
		issueCount: 0,
		platform: '',
		version: '',
		openCount: 0,
		criticalCount: 0,
		fixedCount: 0
	};
}

function toProjectSummary(slug: string, report: ReportView): ProjectSummary {
	return {
		slug,
		title: report.report.title,
		issueCount: report.issues.length,
		platform: report.testing_session.minecraft_edition,
		version: report.report.version,
		openCount: report.summary.by_status.open,
		criticalCount: report.summary.by_severity.Critical,
		fixedCount: report.summary.by_status.fixed
	};
}

export async function importProject(
	data: ReportData,
	options: ImportProjectOptions
): Promise<ProjectSummary> {
	await ensureDbReady();

	const title = (options.name ?? data.report.title).trim();
	if (!title) {
		throw new Error('Project name is required.');
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

	let slug = slugify(title);
	const slugExists = await reportExists(slug);

	if (slugExists) {
		if (options.slugConflict === 'cancel') {
			throw new Error(`Project "${slug}" already exists.`);
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
	const report = toReportView(nextData);
	return toProjectSummary(slug, report);
}

export async function readReport(project: string): Promise<ReportView> {
	validateSlug(project);
	await ensureDbReady();

	const parsed = await getReportData(project);
	return toReportView(parsed);
}

export async function updateIssueStatus(
	project: string,
	id: string,
	status: BugStatus
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		validateSlug(project);
		await updateIssueStatusDb(project, id, status);
		return readReport(project);
	});
}

export async function updateIssue(
	project: string,
	id: string,
	updates: Partial<Issue>
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);
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

		await writeReportData(project, nextData);
		return toReportView(nextData);
	});
}

export async function updateReport(
	project: string,
	updates: {
		report?: Partial<ReportMeta>;
		testing_session?: Partial<TestingSession>;
	}
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);

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

		await writeReportData(project, reportDataSchema.parse(nextData));
		return toReportView(nextData);
	});
}

export async function addIssue(
	project: string,
	issue: Omit<Issue, 'id'> & { id?: string }
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);
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

		await writeReportData(project, nextData);
		return toReportView(nextData);
	});
}

export async function addEvidenceMedia(
	project: string,
	id: string,
	media: EvidenceMedia
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);
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

		await writeReportData(project, nextData);
		return toReportView(nextData);
	});
}

export async function removeEvidenceMedia(
	project: string,
	id: string,
	src: string
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);
		const issue = current.issues.find((item) => item.id === id);

		if (!issue) {
			throw new Error(`Issue ${id} not found`);
		}

		await deleteEvidenceBySrc(src, project);

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

		await writeReportData(project, nextData);
		return toReportView(nextData);
	});
}

export async function saveEvidenceFile(project: string, id: string, file: File): Promise<string> {
	validateSlug(project);

	const extension = path.extname(file.name) || '.bin';
	const filename = `${id}-${Date.now()}${extension}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	return saveEvidenceToR2(project, filename, buffer, file.type || undefined);
}
