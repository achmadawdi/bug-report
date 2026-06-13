import { invalidate } from '$app/navigation';
import { refreshReportPanes } from '$lib/report-host.js';
import { loadOpenTabs } from '$lib/tabs.js';

export async function refreshAppData(): Promise<void> {
	const slugs = loadOpenTabs().map((tab) => tab.slug);

	await refreshReportPanes(slugs, async () => {
		await invalidate('app:layout');
		await Promise.all(slugs.map((slug) => invalidate(`report:${slug}`)));
	});
}
