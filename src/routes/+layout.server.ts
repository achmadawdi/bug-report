import { listGroups, listReports } from '$lib/server/store.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
	const [projects, groups] = await Promise.all([listReports(), listGroups()]);
	return { projects, groups };
};
