import { z } from 'zod';

export const severitySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);
export const statusSchema = z.enum(['open', 'in_progress', 'fixed', 'wont_fix']);
export const evidenceMediaTypeSchema = z.enum(['image', 'video']);

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
	type: z.string(),
	platform: z.string(),
	version_tested: z.string(),
	device: z.string(),
	tester: z.string(),
	tester_version: z.string(),
	test_date: z.string().default(''),
	test_scope: z.string(),
	version: z.string(),
	source_file: z.string()
});

export const reportDataSchema = z.object({
	report: reportMetaSchema,
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
export type ReportMeta = z.infer<typeof reportMetaSchema>;
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
