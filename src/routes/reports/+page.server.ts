import { fail, redirect } from '@sveltejs/kit';
import { reportPath } from '$lib/routes.js';
import {
	type IdConflictStrategy,
	type SlugConflictStrategy,
	parseImportJson,
	resolveDuplicateIssueIds
} from '$lib/import-report.js';
import { resolveGroupAssignment } from '$lib/server/groups.js';
import { createReport, importReport } from '$lib/server/store.js';
import type { Actions } from './$types.js';

async function groupFromForm(formData: FormData): Promise<string | null> {
	return resolveGroupAssignment(
		String(formData.get('group_slug') ?? ''),
		String(formData.get('new_group_name') ?? '')
	);
}

export const actions: Actions = {
	createReport: async ({ request }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Report name is required.' });
		}

		try {
			const groupSlug = await groupFromForm(formData);
			const report = await createReport(name, groupSlug);
			throw redirect(303, reportPath(report.slug));
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to create report.'
			});
		}
	},

	importReport: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file');
		const name = String(formData.get('name') ?? '').trim() || undefined;
		const slugConflict = String(formData.get('slugConflict') ?? 'suffix') as SlugConflictStrategy;
		const idConflict = String(formData.get('idConflict') ?? 'regenerate') as IdConflictStrategy;

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'A JSON file is required.' });
		}

		const text = await file.text();
		const parsed = parseImportJson(text, name);

		if (!parsed.ok) {
			return fail(400, { message: parsed.errors.join(' ') });
		}

		if (parsed.duplicateIds.length > 0 && idConflict === 'cancel') {
			return fail(400, {
				message: `Duplicate issue IDs found: ${parsed.duplicateIds.join(', ')}`
			});
		}

		const issues = resolveDuplicateIssueIds(parsed.data.issues, idConflict);
		const data = {
			...parsed.data,
			issues
		};

		try {
			const groupSlug = await groupFromForm(formData);
			const report = await importReport(data, {
				name: parsed.title,
				slug: parsed.slug,
				slugConflict,
				idConflict,
				groupSlug
			});
			throw redirect(303, reportPath(report.slug));
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to import report.'
			});
		}
	}
};
