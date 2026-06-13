/** Bundled report JSON shipped with the serverless bundle for first-deploy seeding. */
const seedModules = import.meta.glob(
	['../../../../data/reports/*/report.json', '../../../../data/projects/*/report.json'],
	{
		eager: true,
		query: '?raw',
		import: 'default'
	}
);

export function getBundledSeedReports(): { slug: string; json: string }[] {
	const reports: { slug: string; json: string }[] = [];
	const seen = new Set<string>();

	for (const [filePath, json] of Object.entries(seedModules)) {
		const match = filePath.match(/\/([^/]+)\/report\.json$/);
		const slug = match?.[1];
		if (!slug || typeof json !== 'string' || seen.has(slug)) continue;
		seen.add(slug);
		reports.push({ slug, json });
	}

	return reports;
}
