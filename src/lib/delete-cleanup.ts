import { goto, invalidate } from '$app/navigation';
import { page } from '$app/state';
import { parseReportSlug } from '$lib/routes.js';
import { clearShallowActiveSlug } from '$lib/report-navigation.js';
import { removeReportPane } from '$lib/report-host.js';
import { loadOpenTabs, removeTab, saveOpenTabs } from '$lib/tabs.js';

export async function cleanupDeletedReport(slug: string): Promise<void> {
	const tabs = loadOpenTabs();
	const nextTabs = removeTab(tabs, slug);

	if (nextTabs.length !== tabs.length) {
		saveOpenTabs(nextTabs);
	}

	removeReportPane(slug);

	const pathname = page.url.pathname;
	if (parseReportSlug(pathname) === slug) {
		clearShallowActiveSlug();
		await goto('/');
	}

	await invalidate('app:layout');
}
