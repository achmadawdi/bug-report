import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
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

const DATA_DIR = path.resolve('data');
const REPORT_PATH = path.join(DATA_DIR, 'report.json');
const EVIDENCE_DIR = path.resolve('static/evidence');

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

export async function readReport(): Promise<ReportView> {
	await mkdir(DATA_DIR, { recursive: true });

	let raw: string;
	try {
		raw = await readFile(REPORT_PATH, 'utf-8');
	} catch {
		const seedPath = path.resolve('../gauntlet_qa_bug_report_simple.json');
		raw = await readFile(seedPath, 'utf-8');
		const parsed = reportDataSchema.parse(JSON.parse(raw));
		const seeded = {
			...parsed,
			issues: parsed.issues.map((issue) => ({ ...issue, status: 'open' as const }))
		};
		await writeReportData(seeded);
		return toReportView(seeded);
	}

	const parsed = reportDataSchema.parse(JSON.parse(raw));
	return toReportView(parsed);
}

async function writeReportData(data: ReportData): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });

	const normalized: ReportData = {
		...data,
		issues: data.issues.map(normalizeIssue),
		summary: deriveSummary(data.issues.map(normalizeIssue))
	};

	const tempPath = `${REPORT_PATH}.tmp`;
	await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
	await rename(tempPath, REPORT_PATH);
}

export async function updateIssue(id: string, updates: Partial<Issue>): Promise<ReportView> {
	const current = await readReport();
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

	await writeReportData(nextData);
	return toReportView(nextData);
}

export async function updateReport(updates: Partial<ReportMeta>): Promise<ReportView> {
	const current = await readReport();

	const nextData: ReportData = {
		report: {
			...current.report,
			...updates
		},
		severity_guide: current.severity_guide,
		levels_with_no_issues_recorded: current.levels_with_no_issues_recorded,
		issues: current.issues
	};

	await writeReportData(nextData);
	return toReportView(nextData);
}

export async function addIssue(issue: Omit<Issue, 'id'> & { id?: string }): Promise<ReportView> {
	const current = await readReport();
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

	await writeReportData(nextData);
	return toReportView(nextData);
}

export async function addEvidenceMedia(
	id: string,
	media: EvidenceMedia
): Promise<ReportView> {
	const current = await readReport();
	const issue = current.issues.find((item) => item.id === id);

	if (!issue) {
		throw new Error(`Issue ${id} not found`);
	}

	return updateIssue(id, {
		evidence_media: [...(issue.evidence_media ?? []), media]
	});
}

export async function removeEvidenceMedia(
	id: string,
	src: string
): Promise<ReportView> {
	const current = await readReport();
	const issue = current.issues.find((item) => item.id === id);

	if (!issue) {
		throw new Error(`Issue ${id} not found`);
	}

	if (isLocalEvidencePath(src)) {
		const filePath = path.join(EVIDENCE_DIR, path.basename(src));
		try {
			await unlink(filePath);
		} catch {
			// ignore missing files
		}
	}

	return updateIssue(id, {
		evidence_media: (issue.evidence_media ?? []).filter((item) => item.src !== src)
	});
}

export async function saveEvidenceFile(id: string, file: File): Promise<string> {
	await mkdir(EVIDENCE_DIR, { recursive: true });

	const extension = path.extname(file.name) || '.bin';
	const filename = `${id}-${Date.now()}${extension}`;
	const filePath = path.join(EVIDENCE_DIR, filename);
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filePath, buffer);

	return `/evidence/${filename}`;
}
