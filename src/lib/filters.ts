import { SEVERITY_ORDER } from './constants.js';
import type { FilterState, Issue, SortOption } from './types.js';

export function getLevelOrder(area: string): number {
	if (area === 'Global UI') return 1000;
	if (area === 'Multiplayer') return 1001;

	const match = area.match(/Level\s+(\d+)/i);
	return match ? Number.parseInt(match[1], 10) : 999;
}

export function issueSearchText(issue: Issue): string {
	return [
		issue.id,
		issue.title,
		issue.area,
		issue.category,
		issue.severity,
		issue.status,
		issue.notes ?? '',
		...issue.finding,
		...issue.expected_result,
		issue.evidence ?? '',
		issue.reason ?? '',
		...(issue.suggested_text_or_behavior ?? [])
	]
		.join(' ')
		.toLowerCase();
}

export function sortIssues(issues: Issue[], sort: SortOption): Issue[] {
	const sorted = [...issues];

	switch (sort) {
		case 'id-desc':
			return sorted.sort((a, b) => b.id.localeCompare(a.id));
		case 'severity':
			return sorted.sort(
				(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
			);
		case 'level':
			return sorted.sort((a, b) => {
				const levelDiff = getLevelOrder(a.area) - getLevelOrder(b.area);
				return levelDiff !== 0 ? levelDiff : a.id.localeCompare(b.id);
			});
		case 'status':
			return sorted.sort((a, b) => a.status.localeCompare(b.status));
		default:
			return sorted.sort((a, b) => a.id.localeCompare(b.id));
	}
}

export function filterIssues(issues: Issue[], filters: FilterState): Issue[] {
	const query = filters.search.trim().toLowerCase();

	return sortIssues(
		issues.filter((issue) => {
			if (filters.severity !== 'all' && issue.severity !== filters.severity) {
				return false;
			}

			if (filters.area !== 'all' && issue.area !== filters.area) {
				return false;
			}

			if (filters.status !== 'all' && issue.status !== filters.status) {
				return false;
			}

			if (query && !issueSearchText(issue).includes(query)) {
				return false;
			}

			return true;
		}),
		filters.sort
	);
}

export function parseFilters(searchParams: URLSearchParams): FilterState {
	return {
		search: searchParams.get('q') ?? '',
		severity: (searchParams.get('severity') as FilterState['severity']) ?? 'all',
		area: searchParams.get('area') ?? 'all',
		status: (searchParams.get('status') as FilterState['status']) ?? 'all',
		sort: (searchParams.get('sort') as SortOption) ?? 'id-asc'
	};
}

export function filtersToSearchParams(filters: FilterState): URLSearchParams {
	const params = new URLSearchParams();

	if (filters.search) params.set('q', filters.search);
	if (filters.severity !== 'all') params.set('severity', filters.severity);
	if (filters.area !== 'all') params.set('area', filters.area);
	if (filters.status !== 'all') params.set('status', filters.status);
	if (filters.sort !== 'id-asc') params.set('sort', filters.sort);

	return params;
}

export function isFiltersActive(filters: FilterState): boolean {
	return (
		Boolean(filters.search.trim()) ||
		filters.severity !== 'all' ||
		filters.area !== 'all' ||
		filters.status !== 'all' ||
		filters.sort !== 'id-asc'
	);
}

export function clearFilters(): FilterState {
	return {
		search: '',
		severity: 'all',
		area: 'all',
		status: 'all',
		sort: 'id-asc'
	};
}
