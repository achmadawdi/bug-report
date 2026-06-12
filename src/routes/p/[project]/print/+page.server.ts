import { error } from '@sveltejs/kit';
import { projectExists, readReport } from '$lib/server/store.js';
import { mergeAreas } from '$lib/areas.js';
import { filterIssues, parseFilters } from '$lib/filters.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, url }) => {
	if (!(await projectExists(params.project))) {
		error(404, `Project "${params.project}" not found`);
	}

	let report;
	try {
		report = await readReport(params.project);
	} catch (err) {
		console.error(`Failed to load report for project "${params.project}":`, err);
		error(500, 'Report data is invalid');
	}

	const areas = mergeAreas([...new Set(report.issues.map((issue) => issue.area))]);
	const filters = parseFilters(url.searchParams, areas);
	const issues = filterIssues(report.issues, filters);

	return { report, issues, filters, project: params.project };
};
