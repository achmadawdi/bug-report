export type OpenTab = {
	slug: string;
	title: string;
};

const STORAGE_KEY = 'bug-report-open-tabs';

export function loadOpenTabs(): OpenTab[] {
	if (typeof localStorage === 'undefined') return [];

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];

		const parsed = JSON.parse(raw) as OpenTab[];
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(
			(tab) => typeof tab?.slug === 'string' && typeof tab?.title === 'string'
		);
	} catch {
		return [];
	}
}

export function saveOpenTabs(tabs: OpenTab[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

export function upsertTab(tabs: OpenTab[], tab: OpenTab): OpenTab[] {
	const existing = tabs.find((item) => item.slug === tab.slug);
	if (existing) {
		return tabs.map((item) => (item.slug === tab.slug ? { ...item, title: tab.title } : item));
	}

	return [...tabs, tab];
}

export function removeTab(tabs: OpenTab[], slug: string): OpenTab[] {
	return tabs.filter((tab) => tab.slug !== slug);
}
