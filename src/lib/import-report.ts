import { z } from 'zod';
import {
	issueSchema,
	reportDataSchema,
	reportMetaSchema,
	type Issue,
	type ReportData
} from '$lib/types.js';

const DEFAULT_SEVERITY_GUIDE: Record<string, string> = {
	Critical:
		'Blocks progression, causes softlock, breaks level completion, or prevents the game from continuing properly.',
	High: 'Major gameplay issue that strongly affects player experience, level logic, combat, or multiplayer stability.',
	Medium:
		'Noticeable issue, but the game can still continue. Usually related to clarity, balance, or player guidance.',
	Low: 'Minor visual, text, formatting, or polish issue.'
};

const exportPayloadSchema = z.object({
	issues: z.array(issueSchema).min(1),
	project: z.string().optional(),
	exported_at: z.string().optional(),
	filters: z.unknown().optional(),
	report: reportMetaSchema.optional(),
	severity_guide: z.record(z.string(), z.string()).optional(),
	levels_with_no_issues_recorded: z.array(z.string()).optional()
});

export type ImportParseSuccess = {
	ok: true;
	kind: 'report' | 'export';
	data: ReportData;
	duplicateIds: string[];
	title: string;
	slug: string;
	issueCount: number;
};

export type ImportParseFailure = {
	ok: false;
	errors: string[];
};

export type ImportParseResult = ImportParseSuccess | ImportParseFailure;

export type SlugConflictStrategy = 'suffix' | 'overwrite' | 'cancel';
export type IdConflictStrategy = 'skip' | 'regenerate' | 'cancel';

export function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'project';
}

export function detectDuplicateIssueIds(issues: Pick<Issue, 'id'>[]): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();

	for (const issue of issues) {
		if (seen.has(issue.id)) {
			duplicates.add(issue.id);
		} else {
			seen.add(issue.id);
		}
	}

	return [...duplicates];
}

export function createReportFromExport(
	issues: Issue[],
	title: string,
	extras?: {
		report?: ReportData['report'];
		severity_guide?: ReportData['severity_guide'];
		levels_with_no_issues_recorded?: ReportData['levels_with_no_issues_recorded'];
	}
): ReportData {
	return {
		report: {
			title,
			type: extras?.report?.type ?? 'QA Testing Report',
			platform: extras?.report?.platform ?? '',
			version_tested: extras?.report?.version_tested ?? '',
			device: extras?.report?.device ?? '',
			tester: extras?.report?.tester ?? '',
			tester_version: extras?.report?.tester_version ?? '',
			test_date: extras?.report?.test_date ?? '',
			test_scope: extras?.report?.test_scope ?? '',
			version: extras?.report?.version ?? '',
			source_file: extras?.report?.source_file ?? ''
		},
		severity_guide: extras?.severity_guide ?? { ...DEFAULT_SEVERITY_GUIDE },
		levels_with_no_issues_recorded: extras?.levels_with_no_issues_recorded ?? [],
		issues
	};
}

export function parseImportJson(text: string, nameOverride?: string): ImportParseResult {
	let json: unknown;

	try {
		json = JSON.parse(text);
	} catch {
		return { ok: false, errors: ['Invalid JSON.'] };
	}

	const reportResult = reportDataSchema.safeParse(json);
	if (reportResult.success) {
		const title = nameOverride?.trim() || reportResult.data.report.title;
		return buildSuccess('report', reportResult.data, title);
	}

	const exportResult = exportPayloadSchema.safeParse(json);
	if (exportResult.success) {
		const title =
			nameOverride?.trim() ||
			exportResult.data.report?.title ||
			exportResult.data.project?.trim() ||
			'Imported QA Report';
		const data = createReportFromExport(exportResult.data.issues, title, {
			report: exportResult.data.report,
			severity_guide: exportResult.data.severity_guide,
			levels_with_no_issues_recorded: exportResult.data.levels_with_no_issues_recorded
		});
		return buildSuccess('export', data, title);
	}

	return {
		ok: false,
		errors: [
			'Unrecognized format. Expected a full report.json file or an export payload with an issues array.'
		]
	};
}

function buildSuccess(kind: 'report' | 'export', data: ReportData, title: string): ImportParseSuccess {
	const normalized: ReportData = {
		...data,
		report: {
			...data.report,
			title
		}
	};

	return {
		ok: true,
		kind,
		data: normalized,
		duplicateIds: detectDuplicateIssueIds(normalized.issues),
		title,
		slug: slugify(title),
		issueCount: normalized.issues.length
	};
}

export function resolveDuplicateIssueIds(
	issues: Issue[],
	strategy: IdConflictStrategy
): Issue[] {
	if (strategy === 'cancel') {
		return issues;
	}

	const seen = new Set<string>();
	const resolved: Issue[] = [];

	for (const issue of issues) {
		if (!seen.has(issue.id)) {
			seen.add(issue.id);
			resolved.push(issue);
			continue;
		}

		if (strategy === 'skip') {
			continue;
		}

		let nextId = generateNextBugId(resolved);
		while (seen.has(nextId)) {
			const match = nextId.match(/^BUG-(\d+)$/);
			const nextNumber = match ? Number(match[1]) + 1 : resolved.length + 1;
			nextId = `BUG-${String(nextNumber).padStart(3, '0')}`;
		}

		seen.add(nextId);
		resolved.push({ ...issue, id: nextId });
	}

	return resolved;
}

function generateNextBugId(issues: Issue[]): string {
	const numbers = issues
		.map((issue) => issue.id.match(/^BUG-(\d+)$/)?.[1])
		.filter((value): value is string => value != null)
		.map((value) => Number(value));

	const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
	return `BUG-${String(next).padStart(3, '0')}`;
}
