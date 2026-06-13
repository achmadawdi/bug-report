import { error } from '@sveltejs/kit';
import { getGroupWithReports } from '$lib/server/store.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const group = await getGroupWithReports(params.group);

	if (!group) {
		error(404, `Group "${params.group}" not found`);
	}

	return { group };
};
