import { error, fail } from '@sveltejs/kit';
import {
	addEvidenceMedia,
	addIssue,
	assignReportToGroup,
	deleteIssue,
	deleteReport,
	getReportGroupContext,
	getWorkflowInfo,
	readReport,
	removeEvidenceMedia,
	saveEvidenceFile,
	setWorkflowStatus,
	updateIssue,
	updateIssueStatus,
	updateReport
} from '$lib/server/store.js';
import { resolveGroupAssignment } from '$lib/server/groups.js';
import { mergeAreas } from '$lib/areas.js';
import { parseFilters } from '$lib/filters.js';
import { isValidSlug, reportExists } from '$lib/server/store.js';
import {
	detectMediaTypeFromFile,
	detectMediaTypeFromUrl,
	isAllowedEvidenceFile
} from '$lib/evidence.js';
import {
	evidenceMediaTypeSchema,
	issueFormSchema,
	reportMetaSchema,
	testingSessionSchema,
	statusSchema,
	reportWorkflowStatusSchema,
	workflowNoteSchema
} from '$lib/types.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, url, parent, depends }) => {
	depends(`report:${params.report}`);

	if (!isValidSlug(params.report) || !(await reportExists(params.report))) {
		error(404, `Report "${params.report}" not found`);
	}

	const [{ groups }, reportResult, groupContext, workflow] = await Promise.all([
		parent(),
		readReport(params.report)
			.then((report) => ({ ok: true as const, report }))
			.catch((err: unknown) => ({ ok: false as const, err })),
		getReportGroupContext(params.report, { skipExistsCheck: true }),
		getWorkflowInfo(params.report)
	]);

	if (!reportResult.ok) {
		const message = reportResult.err instanceof Error ? reportResult.err.message : '';
		if (message.includes('not found')) {
			error(404, `Report "${params.report}" not found`);
		}

		console.error(`Failed to load report for "${params.report}":`, reportResult.err);
		error(500, 'Report data is invalid');
	}

	const report = reportResult.report;
	const areas = mergeAreas([...new Set(report.issues.map((issue) => issue.area))]);
	const initialFilters = parseFilters(url.searchParams, areas);

	return {
		report,
		areas,
		reportSlug: params.report,
		initialFilters,
		groupContext,
		groups,
		workflowStatus: workflow.status,
		workflowNote: workflow.note
	};
};

function parseList(value: FormDataEntryValue | null): string[] {
	if (!value || typeof value !== 'string') return [];
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

export const actions: Actions = {
	updateIssue: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');

		if (!id) {
			return fail(400, { message: 'Issue ID is required.' });
		}

		const parsed = issueFormSchema.safeParse({
			id,
			area: String(formData.get('area') ?? ''),
			title: String(formData.get('title') ?? ''),
			severity: formData.get('severity'),
			category: String(formData.get('category') ?? ''),
			status: formData.get('status'),
			notes: String(formData.get('notes') ?? '') || undefined,
			evidence: String(formData.get('evidence') ?? '') || undefined,
			reason: String(formData.get('reason') ?? '') || undefined,
			finding: parseList(formData.get('finding')),
			expected_result: parseList(formData.get('expected_result')),
			suggested_text_or_behavior: parseList(formData.get('suggested_text_or_behavior')),
			source_page: formData.get('source_page')
				? Number(formData.get('source_page'))
				: undefined
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid issue data.', issues: parsed.error.flatten() });
		}

		try {
			const report = await updateIssue(params.report, id, parsed.data);
			return { success: true, message: `${id} updated.`, report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to update issue.'
			});
		}
	},

	addIssue: async ({ request, params }) => {
		const formData = await request.formData();

		const parsed = issueFormSchema
			.omit({ id: true })
			.safeParse({
				area: String(formData.get('area') ?? ''),
				title: String(formData.get('title') ?? ''),
				severity: formData.get('severity'),
				category: String(formData.get('category') ?? ''),
				status: formData.get('status') ?? 'open',
				notes: String(formData.get('notes') ?? '') || undefined,
				evidence: String(formData.get('evidence') ?? '') || undefined,
				reason: String(formData.get('reason') ?? '') || undefined,
				finding: parseList(formData.get('finding')),
				expected_result: parseList(formData.get('expected_result')),
				suggested_text_or_behavior: parseList(formData.get('suggested_text_or_behavior')),
				source_page: formData.get('source_page')
					? Number(formData.get('source_page'))
					: undefined
			});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid issue data.', issues: parsed.error.flatten() });
		}

		try {
			const report = await addIssue(params.report, parsed.data);
			return { success: true, message: 'New bug added.', report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to add issue.'
			});
		}
	},

	updateStatus: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const status = statusSchema.safeParse(formData.get('status'));

		if (!id || !status.success) {
			return fail(400, { message: 'Invalid status update.' });
		}

		try {
			const report = await updateIssueStatus(params.report, id, status.data);
			return { success: true, message: `${id} marked ${status.data}.`, report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to update status.'
			});
		}
	},

	deleteIssue: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { message: 'Issue ID is required.' });
		}

		try {
			const report = await deleteIssue(params.report, id);
			return { success: true, message: `${id} deleted.`, report, deletedIssueId: id };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to delete issue.'
			});
		}
	},

	uploadEvidence: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const file = formData.get('file');
		const caption = String(formData.get('caption') ?? '').trim() || undefined;

		if (!id || !(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Issue ID and file are required.' });
		}

		if (!isAllowedEvidenceFile(file)) {
			return fail(400, {
				message: 'Unsupported file type or file is too large (max 10MB).'
			});
		}

		const type = detectMediaTypeFromFile(file);
		if (!type) {
			return fail(400, { message: 'Could not determine media type.' });
		}

		try {
			const src = await saveEvidenceFile(params.report, id, file);
			const report = await addEvidenceMedia(params.report, id, { type, src, caption });
			return { success: true, message: 'Evidence uploaded.', report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to upload evidence.'
			});
		}
	},

	addEvidenceUrl: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const url = String(formData.get('url') ?? '').trim();
		const caption = String(formData.get('caption') ?? '').trim() || undefined;
		const typeOverride = evidenceMediaTypeSchema.safeParse(formData.get('type'));

		if (!id || !url) {
			return fail(400, { message: 'Issue ID and URL are required.' });
		}

		try {
			new URL(url);
		} catch {
			return fail(400, { message: 'Invalid URL.' });
		}

		const type = typeOverride.success ? typeOverride.data : detectMediaTypeFromUrl(url);
		if (!type) {
			return fail(400, {
				message: 'Could not detect media type. Select image or video manually.'
			});
		}

		try {
			const report = await addEvidenceMedia(params.report, id, { type, src: url, caption });
			return { success: true, message: 'Evidence link added.', report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to add evidence URL.'
			});
		}
	},

	updateReport: async ({ request, params }) => {
		const formData = await request.formData();
		const testScopeRaw = String(formData.get('test_scope') ?? '').trim();
		const environmentRaw = String(formData.get('environment') ?? '').trim();
		const sourceFileRaw = String(formData.get('source_file') ?? '').trim();

		const reportParsed = reportMetaSchema.safeParse({
			title: String(formData.get('title') ?? ''),
			type: String(formData.get('type') ?? ''),
			version: String(formData.get('version') ?? ''),
			source_file: sourceFileRaw === '' ? null : sourceFileRaw
		});

		const sessionParsed = testingSessionSchema.safeParse({
			test_date: String(formData.get('test_date') ?? ''),
			minecraft_edition: String(formData.get('minecraft_edition') ?? ''),
			game_version_tested: String(formData.get('game_version_tested') ?? ''),
			device_type: String(formData.get('device_type') ?? ''),
			tester_count: Number(formData.get('tester_count')),
			tester_level: String(formData.get('tester_level') ?? ''),
			test_scope: testScopeRaw === '' ? null : testScopeRaw,
			environment: environmentRaw === '' ? null : environmentRaw
		});

		if (!reportParsed.success || !sessionParsed.success) {
			return fail(400, {
				message: 'Invalid report metadata.',
				issues: {
					report: reportParsed.success ? undefined : reportParsed.error.flatten(),
					testing_session: sessionParsed.success ? undefined : sessionParsed.error.flatten()
				}
			});
		}

		try {
			const report = await updateReport(params.report, {
				report: reportParsed.data,
				testing_session: sessionParsed.data
			});

			const groupSlug = await resolveGroupAssignment(
				String(formData.get('group_slug') ?? ''),
				String(formData.get('new_group_name') ?? '')
			);
			await assignReportToGroup(params.report, groupSlug);

			return { success: true, message: 'Report details updated.', report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to update report.'
			});
		}
	},

	removeEvidence: async ({ request, params }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const src = String(formData.get('src') ?? '');

		if (!id || !src) {
			return fail(400, { message: 'Issue ID and media source are required.' });
		}

		try {
			const report = await removeEvidenceMedia(params.report, id, src);
			return { success: true, message: 'Evidence removed.', report };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to remove evidence.'
			});
		}
	},

	updateWorkflowStatus: async ({ request, params }) => {
		const formData = await request.formData();
		const status = reportWorkflowStatusSchema.safeParse(formData.get('status'));

		if (!status.success) {
			return fail(400, { message: 'Invalid report status.' });
		}

		let workflowNote: string | null = null;
		if (status.data === 'resolved' || status.data === 'postponed') {
			const note = workflowNoteSchema.safeParse(formData.get('workflowNote'));
			if (!note.success) {
				return fail(400, {
					message: note.error.issues[0]?.message ?? 'Developer note is required.'
				});
			}
			workflowNote = note.data;
		}

		try {
			const workflow = await setWorkflowStatus(params.report, status.data, workflowNote);
			return {
				success: true,
				message: `Report marked ${status.data}.`,
				workflowStatus: workflow.status,
				workflowNote: workflow.note
			};
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to update report status.'
			});
		}
	},

	deleteReport: async ({ params }) => {
		try {
			await deleteReport(params.report);
			return { success: true, deleted: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to delete report.'
			});
		}
	}
};
