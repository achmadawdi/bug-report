import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile
} from 'node:fs/promises';
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
	reportDataSchema
} from '$lib/types.js';
import { SEVERITIES, STATUSES } from '$lib/constants.js';
import { generateNextBugId } from '$lib/issues.js';
import { isLocalEvidencePath } from '$lib/evidence.js';

const PROJECTS_DIR = path.resolve('data/projects');
const LEGACY_REPORT_PATH = path.resolve('data/report.json');
const LEGACY_EVIDENCE_DIR = path.resolve('static/evidence');
const EVIDENCE_ROOT = path.resolve('static/evidence');
const LEGACY_MIGRATION_SLUG = 'gauntlet-minigames';

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

function getProjectPaths(project: string) {
	validateSlug(project);
	return {
		projectDir: path.join(PROJECTS_DIR, project),
		reportPath: path.join(PROJECTS_DIR, project, 'report.json'),
		evidenceDir: path.join(EVIDENCE_ROOT, project)
	};
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await readFile(filePath);
		return true;
	} catch {
		return false;
	}
}

function rewriteEvidencePaths(data: ReportData, project: string): ReportData {
	return {
		...data,
		issues: data.issues.map((issue) => ({
			...issue,
			evidence_media: (issue.evidence_media ?? []).map((media) => {
				if (!isLocalEvidencePath(media.src)) return media;

				const filename = path.basename(media.src);
				const prefixed = `/evidence/${project}/${filename}`;
				if (media.src === prefixed) return media;

				return { ...media, src: prefixed };
			})
		}))
	};
}

async function migrateLegacyEvidence(project: string): Promise<void> {
	const { evidenceDir } = getProjectPaths(project);

	try {
		const entries = await readdir(LEGACY_EVIDENCE_DIR, { withFileTypes: true });
		const files = entries.filter((entry) => entry.isFile());

		if (files.length === 0) return;

		await mkdir(evidenceDir, { recursive: true });

		for (const file of files) {
			const source = path.join(LEGACY_EVIDENCE_DIR, file.name);
			const destination = path.join(evidenceDir, file.name);
			try {
				await copyFile(source, destination);
				await unlink(source);
			} catch {
				// ignore individual file migration failures
			}
		}
	} catch {
		// legacy evidence directory may not exist
	}
}

async function migrateLegacyReport(): Promise<void> {
	if (!(await fileExists(LEGACY_REPORT_PATH))) return;

	const { reportPath } = getProjectPaths(LEGACY_MIGRATION_SLUG);
	if (await fileExists(reportPath)) return;

	const raw = await readFile(LEGACY_REPORT_PATH, 'utf-8');
	const parsed = reportDataSchema.parse(JSON.parse(raw));
	const migrated = rewriteEvidencePaths(parsed, LEGACY_MIGRATION_SLUG);

	await writeReportData(LEGACY_MIGRATION_SLUG, migrated);
	await migrateLegacyEvidence(LEGACY_MIGRATION_SLUG);

	try {
		await unlink(LEGACY_REPORT_PATH);
	} catch {
		// ignore if legacy file cannot be removed
	}
}

function createEmptyReport(title: string): ReportData {
	const report: ReportMeta = {
		title,
		type: 'QA Testing Report',
		platform: '',
		version_tested: '',
		device: '',
		tester: '',
		tester_version: '',
		test_scope: '',
		version: '',
		source_file: ''
	};

	return {
		report,
		severity_guide: { ...DEFAULT_SEVERITY_GUIDE },
		levels_with_no_issues_recorded: [],
		issues: []
	};
}

async function writeReportData(project: string, data: ReportData): Promise<void> {
	const { projectDir, reportPath } = getProjectPaths(project);
	await mkdir(projectDir, { recursive: true });

	const normalized: ReportData = {
		...data,
		issues: data.issues.map(normalizeIssue),
		summary: deriveSummary(data.issues.map(normalizeIssue))
	};

	const tempPath = `${reportPath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
	await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
	await rename(tempPath, reportPath);
}

export async function ensureProjectsReady(): Promise<void> {
	await mkdir(PROJECTS_DIR, { recursive: true });
	await migrateLegacyReport();
}

export async function listProjects(): Promise<ProjectSummary[]> {
	await ensureProjectsReady();

	let entries: string[];
	try {
		entries = await readdir(PROJECTS_DIR);
	} catch {
		return [];
	}

	const projects: ProjectSummary[] = [];

	for (const slug of entries) {
		try {
			validateSlug(slug);
		} catch {
			continue;
		}

		const { reportPath } = getProjectPaths(slug);
		if (!(await fileExists(reportPath))) continue;

		try {
			const report = await readReport(slug);
			projects.push({
				slug,
				title: report.report.title,
				issueCount: report.issues.length,
				platform: report.report.platform,
				version: report.report.version,
				openCount: report.summary.by_status.open,
				criticalCount: report.summary.by_severity.Critical,
				fixedCount: report.summary.by_status.fixed
			});
		} catch {
			// skip invalid project folders
		}
	}

	return projects.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

export async function projectExists(project: string): Promise<boolean> {
	if (!isValidSlug(project)) return false;
	const reportPath = path.join(PROJECTS_DIR, project, 'report.json');
	return fileExists(reportPath);
}

export async function createProject(name: string): Promise<ProjectSummary> {
	await ensureProjectsReady();

	const title = name.trim();
	if (!title) {
		throw new Error('Project name is required.');
	}

	let slug = slugify(title);
	const { reportPath } = getProjectPaths(slug);

	if (await fileExists(reportPath)) {
		let suffix = 2;
		while (await fileExists(path.join(PROJECTS_DIR, `${slug}-${suffix}`, 'report.json'))) {
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

export async function readReport(project: string): Promise<ReportView> {
	await ensureProjectsReady();
	validateSlug(project);

	const { reportPath } = getProjectPaths(project);

	let raw: string;
	try {
		raw = await readFile(reportPath, 'utf-8');
	} catch {
		throw new Error(`Project "${project}" not found`);
	}

	const parsed = reportDataSchema.parse(JSON.parse(raw));
	return toReportView(parsed);
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
	updates: Partial<ReportMeta>
): Promise<ReportView> {
	return enqueueProjectWrite(project, async () => {
		const current = await readReport(project);

		const nextData: ReportData = {
			report: {
				...current.report,
				...updates
			},
			severity_guide: current.severity_guide,
			levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
			issues: current.issues
		};

		await writeReportData(project, nextData);
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

		if (isLocalEvidencePath(src)) {
			const { evidenceDir } = getProjectPaths(project);
			const relative = src.replace(/^\/evidence\//, '');
			const filePath = path.join(EVIDENCE_ROOT, relative);
			const scopedPath = path.join(evidenceDir, path.basename(src));

			for (const candidate of [filePath, scopedPath]) {
				try {
					await unlink(candidate);
				} catch {
					// ignore missing files
				}
			}
		}

		const nextData: ReportData = {
			report: current.report,
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
	const { evidenceDir } = getProjectPaths(project);
	await mkdir(evidenceDir, { recursive: true });

	const extension = path.extname(file.name) || '.bin';
	const filename = `${id}-${Date.now()}${extension}`;
	const filePath = path.join(evidenceDir, filename);
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filePath, buffer);

	return `/evidence/${project}/${filename}`;
}
