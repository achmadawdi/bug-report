export const CREATE_NEW_GROUP = '__create_new__';

const LAST_VISITED_KEY = 'bug-report-last-visited-in-group';

type LastVisitedMap = Record<string, string>;

export function loadLastVisitedInGroup(): LastVisitedMap {
	if (typeof localStorage === 'undefined') return {};

	try {
		const raw = localStorage.getItem(LAST_VISITED_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as LastVisitedMap;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

export function saveLastVisitedInGroup(groupSlug: string, projectSlug: string): void {
	if (typeof localStorage === 'undefined') return;

	const map = loadLastVisitedInGroup();
	map[groupSlug] = projectSlug;
	localStorage.setItem(LAST_VISITED_KEY, JSON.stringify(map));
}

export function getLastVisitedInGroup(groupSlug: string): string | null {
	return loadLastVisitedInGroup()[groupSlug] ?? null;
}
