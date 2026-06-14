import { error, fail } from '@sveltejs/kit';
import { deleteGroup, getGroupWithReports } from '$lib/server/store.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const group = await getGroupWithReports(params.group);

	if (!group) {
		error(404, `Group "${params.group}" not found`);
	}

	return { group };
};

export const actions: Actions = {
	deleteGroup: async ({ params }) => {
		try {
			await deleteGroup(params.group);
			return { success: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to delete group.'
			});
		}
	}
};
