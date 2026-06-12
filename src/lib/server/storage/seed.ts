/** Bundled project JSON shipped with the serverless bundle for first-deploy seeding. */
const seedModules = import.meta.glob('../../../../data/projects/*/report.json', {
	eager: true,
	query: '?raw',
	import: 'default'
});

export function getBundledSeedProjects(): { slug: string; json: string }[] {
	const projects: { slug: string; json: string }[] = [];

	for (const [filePath, json] of Object.entries(seedModules)) {
		const match = filePath.match(/\/([^/]+)\/report\.json$/);
		const slug = match?.[1];
		if (!slug || typeof json !== 'string') continue;
		projects.push({ slug, json });
	}

	return projects;
}
