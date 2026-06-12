import { fail, redirect } from '@sveltejs/kit';
import { createProject } from '$lib/server/store.js';
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
	}
};
