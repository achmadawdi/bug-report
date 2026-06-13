import { z } from 'zod';

export const severitySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);
export const statusSchema = z.enum(['open', 'in_progress', 'fixed', 'wont_fix']);
export const evidenceMediaTypeSchema = z.enum(['image', 'video']);

export const environmentSchema = z.enum(['Development', 'Staging', 'Production']);
export const reportTypeSchema = z.enum([
	'QA Testing Report',
	'Regression Report',
	'Smoke Test Report',
	'Bug Report'
]);
export const minecraftEditionSchema = z.enum(['Education', 'Bedrock', 'Java', 'Legacy']);
export const deviceTypeSchema = z.enum([
	'Windows',
	'Mac',
	'Android',
	'iOS',
	'iPad',
	'Chromebook',
	'Other'
]);
export const testerEducationLevelSchema = z.enum([
	'Primary',
	'Middle School',
	'High School',
	'University',
	'Adult / Professional',
	'Mixed'
]);

export const evidenceMediaSchema = z.object({
	type: evidenceMediaTypeSchema,
	src: z.string(),
	caption: z.string().optional()
});

export const issueSchema = z.object({
	id: z.string(),
	area: z.string(),
	title: z.string(),
	severity: severitySchema,
	category: z.string(),
	finding: z.array(z.string()),
	expected_result: z.array(z.string()),
	status: statusSchema.default('open'),
	notes: z.string().optional(),
	evidence: z.string().optional(),
	evidence_media: z.array(evidenceMediaSchema).optional(),
	reason: z.string().optional(),
	suggested_text_or_behavior: z.array(z.string()).optional(),
	source_page: z.number().optional()
});

export const issueFormSchema = issueSchema.omit({ evidence_media: true });

export const reportMetaSchema = z.object({
	title: z.string(),
	type: reportTypeSchema,
	version: z.string(),
	source_file: z.string()
});

export const testingSessionSchema = z.object({
	test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	minecraft_edition: minecraftEditionSchema,
	game_version_tested: z.string(),
	device_type: deviceTypeSchema,
	tester_count: z.number().int().min(1),
	tester_version: z.string(),
	tester_education_level: testerEducationLevelSchema,
	test_scope: z.string().nullable().optional(),
	environment: environmentSchema.nullable().optional()
});

const legacyReportFieldsSchema = z.object({
	platform: z.string().optional(),
	version_tested: z.string().optional(),
	device: z.string().optional(),
	tester: z.string().optional(),
	tester_version: z.string().optional(),
	test_date: z.string().optional(),
	test_scope: z.string().optional()
});

export const reportDataInputSchema = z.object({
	report: reportMetaSchema
		.extend({
			type: z.string().optional(),
			version: z.string().optional(),
			source_file: z.string().optional()
		})
		.merge(legacyReportFieldsSchema),
	testing_session: testingSessionSchema.partial().optional(),
	severity_guide: z.record(z.string(), z.string()),
	levels_with_no_issues_recorded: z.array(z.string()),
	issues: z.array(issueSchema),
	summary: z
		.object({
			total_issues: z.number(),
			by_severity: z.record(z.string(), z.number()),
			by_area: z.record(z.string(), z.number())
		})
		.optional()
});

export const reportDataSchema = z.object({
	report: reportMetaSchema,
	testing_session: testingSessionSchema,
	severity_guide: z.record(z.string(), z.string()),
	levels_with_no_issues_recorded: z.array(z.string()),
	issues: z.array(issueSchema),
	summary: z
		.object({
			total_issues: z.number(),
			by_severity: z.record(z.string(), z.number()),
			by_area: z.record(z.string(), z.number())
		})
		.optional()
});

export type Severity = z.infer<typeof severitySchema>;
export type BugStatus = z.infer<typeof statusSchema>;
export type EvidenceMediaType = z.infer<typeof evidenceMediaTypeSchema>;
export type EvidenceMedia = z.infer<typeof evidenceMediaSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type ReportType = z.infer<typeof reportTypeSchema>;
export type MinecraftEdition = z.infer<typeof minecraftEditionSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type TesterEducationLevel = z.infer<typeof testerEducationLevelSchema>;
export type ReportMeta = z.infer<typeof reportMetaSchema>;
export type TestingSession = z.infer<typeof testingSessionSchema>;
export type ReportData = z.infer<typeof reportDataSchema>;

export type ReportSummary = {
	total_issues: number;
	by_severity: Record<Severity, number>;
	by_area: Record<string, number>;
	by_status: Record<BugStatus, number>;
};

export type ReportView = Omit<ReportData, 'summary'> & {
	summary: ReportSummary;
};

export type SortOption = 'id-asc' | 'id-desc' | 'severity' | 'level' | 'status';

export type FilterState = {
	search: string;
	severity: Severity | 'all';
	area: string;
	status: BugStatus | 'all';
	sort: SortOption;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseReportType(value: string | undefined): ReportType {
	const parsed = reportTypeSchema.safeParse(value);
	return parsed.success ? parsed.data : 'QA Testing Report';
}

function parseMinecraftEdition(platform: string | undefined): MinecraftEdition {
	const lower = (platform ?? '').toLowerCase();
	if (lower.includes('bedrock')) return 'Bedrock';
	if (lower.includes('java')) return 'Java';
	if (lower.includes('legacy')) return 'Legacy';
	if (lower.includes('education')) return 'Education';
	return 'Education';
}

function parseDeviceType(device: string | undefined): DeviceType {
	const lower = (device ?? '').toLowerCase();
	if (lower.includes('windows')) return 'Windows';
	if (lower.includes('mac')) return 'Mac';
	if (lower.includes('android')) return 'Android';
	if (lower.includes('ios')) return 'iOS';
	if (lower.includes('ipad')) return 'iPad';
	if (lower.includes('chromebook')) return 'Chromebook';
	return 'Other';
}

function parseTesterCount(tester: string | undefined): number {
	const digits = (tester ?? '').replace(/\D/g, '');
	const count = Number.parseInt(digits, 10);
	return Number.isFinite(count) && count >= 1 ? count : 1;
}

function normalizeTestDate(value: string | undefined): string {
	if (value && DATE_PATTERN.test(value)) return value;
	return '1970-01-01';
}

function normalizeEnvironment(
	value: string | null | undefined
): Environment | null | undefined {
	if (value == null || value === '') return null;
	const parsed = environmentSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

export function normalizeTestingSession(
	input: Partial<TestingSession> | undefined,
	legacy?: {
		platform?: string;
		version_tested?: string;
		device?: string;
		tester?: string;
		tester_version?: string;
		test_date?: string;
		test_scope?: string;
	}
): TestingSession {
	const environment = normalizeEnvironment(input?.environment);
	if (input?.environment !== undefined && environment === undefined) {
		throw new Error('Invalid environment value.');
	}

	return {
		test_date: normalizeTestDate(input?.test_date ?? legacy?.test_date),
		minecraft_edition:
			input?.minecraft_edition ?? parseMinecraftEdition(legacy?.platform),
		game_version_tested: input?.game_version_tested ?? legacy?.version_tested ?? '',
		device_type: input?.device_type ?? parseDeviceType(legacy?.device),
		tester_count: input?.tester_count ?? parseTesterCount(legacy?.tester),
		tester_version: input?.tester_version ?? legacy?.tester_version ?? '',
		tester_education_level: input?.tester_education_level ?? 'Mixed',
		test_scope:
			input?.test_scope === undefined
				? legacy?.test_scope
					? legacy.test_scope
					: null
				: input.test_scope,
		environment: environment ?? null
	};
}

export function normalizeReportData(input: z.infer<typeof reportDataInputSchema>): ReportData {
	const reportInput = input.report;
	const reportType = parseReportType(reportInput.type);

	const testing_session = normalizeTestingSession(input.testing_session, {
		platform: reportInput.platform,
		version_tested: reportInput.version_tested,
		device: reportInput.device,
		tester: reportInput.tester,
		tester_version: reportInput.tester_version,
		test_date: reportInput.test_date,
		test_scope: reportInput.test_scope
	});

	return reportDataSchema.parse({
		report: {
			title: reportInput.title,
			type: reportType,
			version: reportInput.version ?? '',
			source_file: reportInput.source_file ?? ''
		},
		testing_session,
		severity_guide: input.severity_guide,
		levels_with_no_issues_recorded: input.levels_with_no_issues_recorded,
		issues: input.issues,
		summary: input.summary
	});
}

export function parseReportData(input: unknown): ReportData {
	const parsed = reportDataInputSchema.safeParse(input);
	if (!parsed.success) {
		throw parsed.error;
	}
	return normalizeReportData(parsed.data);
}
