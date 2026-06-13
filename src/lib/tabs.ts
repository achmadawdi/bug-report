export type OpenTab = {
	slug: string;
	title: string;
};

const STORAGE_KEY = 'bug-report-open-tabs';

let openTabsState: OpenTab[] = [];
let tabsHydrated = false;
let tabsVersion = 0;
const tabListeners = new Set<() => void>();

function notifyTabChange(): void {
	tabsVersion += 1;
	for (const listener of tabListeners) {
		listener();
	}
}

export function getTabsVersion(): number {
	return tabsVersion;
}

export function subscribeOpenTabs(listener: () => void): () => void {
	tabListeners.add(listener);
	return () => tabListeners.delete(listener);
}

export function getOpenTabsState(): OpenTab[] {
	return openTabsState;
}

export function hydrateOpenTabs(): void {
	openTabsState = loadOpenTabsFromStorage();
	tabsHydrated = true;
	notifyTabChange();
}

export function areOpenTabsHydrated(): boolean {
	return tabsHydrated;
}

function loadOpenTabsFromStorage(): OpenTab[] {
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

export function loadOpenTabs(): OpenTab[] {
	if (!tabsHydrated) {
		return loadOpenTabsFromStorage();
	}
	return openTabsState;
}

export function saveOpenTabs(tabs: OpenTab[]): void {
	openTabsState = tabs;
	tabsHydrated = true;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
	}
	notifyTabChange();
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
