import { z } from 'zod';
import {
	issueSchema,
	normalizeReportData,
	normalizeTestingSession,
	reportDataInputSchema,
	reportMetaSchema,
	reportExportMetadataSchema,
	deviceTypeSchema,
	environmentSchema,
	minecraftEditionSchema,
	testerLevelSchema,
	type Issue,
	type ReportData,
	type LenientReportDataInput
} from '$lib/types.js';

const DEFAULT_SEVERITY_GUIDE: Record<string, string> = {
	Critical:
		'Blocks progression, causes softlock, breaks level completion, or prevents the game from continuing properly.',
	High: 'Major gameplay issue that strongly affects player experience, level logic, combat, or multiplayer stability.',
	Medium:
		'Noticeable issue, but the game can still continue. Usually related to clarity, balance, or player guidance.',
	Low: 'Minor visual, text, formatting, or polish issue.'
};

const legacyReportMetaSchema = reportMetaSchema.extend({
	platform: z.string().optional(),
	version_tested: z.string().optional(),
	device: z.string().optional(),
	tester: z.string().optional(),
	tester_version: z.string().optional(),
	test_date: z.string().optional(),
	test_scope: z.string().optional()
});

function stripNullObjectFields(value: unknown): unknown {
	if (!value || typeof value !== 'object') return value;
	const cleaned: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
		if (field !== null) cleaned[key] = field;
	}
	return cleaned;
}

const importTestingSessionSchema = z.preprocess(
	stripNullObjectFields,
	z
		.object({
			test_date: z.string().optional(),
			minecraft_edition: z.union([minecraftEditionSchema, z.string()]).optional(),
			game_version_tested: z.string().optional(),
			device_type: z.union([deviceTypeSchema, z.string()]).optional(),
			tester_count: z.number().optional(),
			tester_level: z.union([testerLevelSchema, z.string()]).optional(),
			test_scope: z.string().nullable().optional(),
			environment: z.union([environmentSchema, z.string()]).optional(),
			tester_education_level: z.string().optional()
		})
		.partial()
		.optional()
);

const importReportDataInputSchema = reportDataInputSchema
	.omit({ testing_session: true })
	.extend({ testing_session: importTestingSessionSchema });

const exportPayloadSchema = z
	.object({
		issues: z.array(issueSchema).min(1),
		report: legacyReportMetaSchema.optional(),
		severity_guide: z.record(z.string(), z.string()).optional(),
		levels_with_no_issues_recorded: z.array(z.string()).optional()
	})
	.extend({ testing_session: importTestingSessionSchema })
	.merge(reportExportMetadataSchema);

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

	return slug || 'report';
}

function isValidImportSlug(slug: string): boolean {
	return Boolean(slug && !slug.includes('..') && !slug.includes('/') && !slug.includes('\\'));
}

function resolveSlugHint(...candidates: (string | undefined)[]): string | undefined {
	for (const candidate of candidates) {
		const value = candidate?.trim();
		if (value && isValidImportSlug(value)) return value;
	}
	return undefined;
}

function extractSlugHint(json: unknown): string | undefined {
	if (!json || typeof json !== 'object') return undefined;
	const record = json as Record<string, unknown>;
	return resolveSlugHint(
		typeof record.report_slug === 'string' ? record.report_slug : undefined,
		typeof record.project === 'string' ? record.project : undefined
	);
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

function formatImportErrors(error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
		return `${path}: ${issue.message}`;
	});
}

function summarizeImportFailure(reportError: z.ZodError, exportError: z.ZodError): string[] {
	const details = [...formatImportErrors(reportError), ...formatImportErrors(exportError)];
	const unique = [...new Set(details)];

	if (unique.length === 0) {
		return [
			'Unrecognized format. Expected a full report.json file or an export payload with an issues array.'
		];
	}

	return [
		'Could not import this JSON. The file looks like a report export, but some fields are invalid or use null values where the app expects enums or text.',
		...unique.slice(0, 6)
	];
}

export function createReportFromExport(
	issues: Issue[],
	title: string,
	extras?: {
		report?: z.infer<typeof legacyReportMetaSchema>;
		testing_session?: LenientReportDataInput['testing_session'];
		severity_guide?: ReportData['severity_guide'];
		levels_with_no_issues_recorded?: ReportData['levels_with_no_issues_recorded'];
	}
): ReportData {
	const legacy = extras?.report;
	const testing_session = normalizeTestingSession(extras?.testing_session, {
		platform: legacy?.platform,
		version_tested: legacy?.version_tested,
		device: legacy?.device,
		tester: legacy?.tester,
		test_date: legacy?.test_date,
		test_scope: legacy?.test_scope
	});

	const sourceFile = legacy?.source_file?.trim() ? legacy.source_file : null;

	return {
		report: {
			title,
			type: legacy?.type ?? 'QA Testing Report',
			version: legacy?.version ?? '',
			source_file: sourceFile
		},
		testing_session,
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

	const reportResult = importReportDataInputSchema.safeParse(json);
	if (reportResult.success) {
		try {
			const data = normalizeReportData(reportResult.data);
			const title = nameOverride?.trim() || data.report.title;
			return buildSuccess('report', data, title, extractSlugHint(json));
		} catch (err) {
			return {
				ok: false,
				errors: [err instanceof Error ? err.message : 'Invalid report metadata.']
			};
		}
	}

	const exportResult = exportPayloadSchema.safeParse(json);
	if (exportResult.success) {
		const slugHint = resolveSlugHint(
			exportResult.data.report_slug,
			exportResult.data.project
		);
		const title =
			nameOverride?.trim() ||
			exportResult.data.report?.title ||
			slugHint ||
			'Imported QA Report';
		const data = createReportFromExport(exportResult.data.issues, title, {
			report: exportResult.data.report,
			testing_session: exportResult.data.testing_session,
			severity_guide: exportResult.data.severity_guide,
			levels_with_no_issues_recorded: exportResult.data.levels_with_no_issues_recorded
		});
		return buildSuccess('export', data, title, slugHint);
	}

	return {
		ok: false,
		errors: summarizeImportFailure(reportResult.error, exportResult.error)
	};
}

function buildSuccess(
	kind: 'report' | 'export',
	data: ReportData,
	title: string,
	slugHint?: string
): ImportParseSuccess {
	const normalized: ReportData = {
		...data,
		report: {
			...data.report,
			title
		}
	};

	const slug = slugHint ?? slugify(title);

	return {
		ok: true,
		kind,
		data: normalized,
		duplicateIds: detectDuplicateIssueIds(normalized.issues),
		title,
		slug,
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
