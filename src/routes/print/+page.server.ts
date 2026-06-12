import { readReport } from '$lib/server/store.js';
import { filterIssues, parseFilters } from '$lib/filters.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const report = await readReport();
	const filters = parseFilters(url.searchParams);
	const issues = filterIssues(report.issues, filters);

	return { report, issues, filters };
};
