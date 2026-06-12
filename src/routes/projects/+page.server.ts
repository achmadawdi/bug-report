import { fail, redirect } from '@sveltejs/kit';
import {
	type IdConflictStrategy,
	type SlugConflictStrategy,
	parseImportJson,
	resolveDuplicateIssueIds
} from '$lib/import-report.js';
import { createProject, importProject } from '$lib/server/store.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	createProject: async ({ request }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Project name is required.' });
		}

		try {
			const project = await createProject(name);
			throw redirect(303, `/p/${project.slug}`);
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to create project.'
			});
		}
	},

	importProject: async ({ request }) => {
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
			const project = await importProject(data, {
				name: parsed.title,
				slugConflict,
				idConflict
			});
			throw redirect(303, `/p/${project.slug}`);
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 303) {
				throw error;
			}

			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to import project.'
			});
		}
	}
};
