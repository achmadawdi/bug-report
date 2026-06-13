import { listGroupsWithReports, listStandaloneReports } from '$lib/server/store.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const [groups, projects] = await Promise.all([listGroupsWithReports(), listStandaloneReports()]);
	return { groups, projects };
};
