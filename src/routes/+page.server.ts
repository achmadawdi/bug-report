import { fail } from '@sveltejs/kit';
import {
	addEvidenceMedia,
	addIssue,
	readReport,
	removeEvidenceMedia,
	saveEvidenceFile,
	updateIssue,
	updateReport
} from '$lib/server/store.js';
import {
	detectMediaTypeFromFile,
	detectMediaTypeFromUrl,
	isAllowedEvidenceFile
} from '$lib/evidence.js';
import {
	evidenceMediaTypeSchema,
	issueFormSchema,
	reportMetaSchema,
	statusSchema
} from '$lib/types.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const report = await readReport();
	const areas = [...new Set(report.issues.map((issue) => issue.area))].sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true })
	);

	return { report, areas };
};

function parseList(value: FormDataEntryValue | null): string[] {
	if (!value || typeof value !== 'string') return [];
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

export const actions: Actions = {
	updateIssue: async ({ request }) => {
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
			const report = await updateIssue(id, parsed.data);
			return { success: true, message: `${id} updated.`, report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to update issue.'
			});
		}
	},

	addIssue: async ({ request }) => {
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
			const report = await addIssue(parsed.data);
			return { success: true, message: 'New bug added.', report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to add issue.'
			});
		}
	},

	updateStatus: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const status = statusSchema.safeParse(formData.get('status'));

		if (!id || !status.success) {
			return fail(400, { message: 'Invalid status update.' });
		}

		try {
			const report = await updateIssue(id, { status: status.data });
			return { success: true, message: `${id} marked ${status.data}.`, report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to update status.'
			});
		}
	},

	uploadEvidence: async ({ request }) => {
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
			const src = await saveEvidenceFile(id, file);
			const report = await addEvidenceMedia(id, { type, src, caption });
			return { success: true, message: 'Evidence uploaded.', report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to upload evidence.'
			});
		}
	},

	addEvidenceUrl: async ({ request }) => {
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
			const report = await addEvidenceMedia(id, { type, src: url, caption });
			return { success: true, message: 'Evidence link added.', report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to add evidence URL.'
			});
		}
	},

	updateReport: async ({ request }) => {
		const formData = await request.formData();

		const parsed = reportMetaSchema.safeParse({
			title: String(formData.get('title') ?? ''),
			type: String(formData.get('type') ?? ''),
			platform: String(formData.get('platform') ?? ''),
			version_tested: String(formData.get('version_tested') ?? ''),
			device: String(formData.get('device') ?? ''),
			tester: String(formData.get('tester') ?? ''),
			tester_version: String(formData.get('tester_version') ?? ''),
			test_scope: String(formData.get('test_scope') ?? ''),
			version: String(formData.get('version') ?? ''),
			source_file: String(formData.get('source_file') ?? '')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid report metadata.', issues: parsed.error.flatten() });
		}

		try {
			const report = await updateReport(parsed.data);
			return { success: true, message: 'Report details updated.', report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to update report.'
			});
		}
	},

	removeEvidence: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const src = String(formData.get('src') ?? '');

		if (!id || !src) {
			return fail(400, { message: 'Issue ID and media source are required.' });
		}

		try {
			const report = await removeEvidenceMedia(id, src);
			return { success: true, message: 'Evidence removed.', report };
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to remove evidence.'
			});
		}
	}
};
