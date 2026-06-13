import { error } from '@sveltejs/kit';
import { reportExists, readReport } from '$lib/server/store.js';
import { mergeAreas } from '$lib/areas.js';
import { filterIssues, parseFilters } from '$lib/filters.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, url }) => {
	if (!(await reportExists(params.report))) {
		error(404, `Report "${params.report}" not found`);
	}

	let report;
	try {
		report = await readReport(params.report);
	} catch (err) {
		console.error(`Failed to load report for "${params.report}":`, err);
		error(500, 'Report data is invalid');
	}

	const areas = mergeAreas([...new Set(report.issues.map((issue) => issue.area))]);
	const filters = parseFilters(url.searchParams, areas);
	const issues = filterIssues(report.issues, filters);

	return { report, issues, filters, reportSlug: params.report };
};
