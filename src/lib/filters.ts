import { ACTIVE_STATUSES, FILTER_VIEWS, RESOLVED_STATUSES, SEVERITY_ORDER } from './constants.js';
import { severitySchema, statusSchema } from './types.js';
import type { FilterState, FilterView, Issue, SortOption } from './types.js';

const SORT_OPTIONS: SortOption[] = ['id-asc', 'id-desc', 'severity', 'level', 'status'];

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

export function buildIssueSearchTextMap(issues: Issue[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const issue of issues) {
		map.set(issue.id, issueSearchText(issue));
	}
	return map;
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

function matchesView(issue: Issue, view: FilterView): boolean {
	switch (view) {
		case 'active':
			return ACTIVE_STATUSES.includes(issue.status);
		case 'resolved':
			return RESOLVED_STATUSES.includes(issue.status);
		default:
			return true;
	}
}

export function filterIssues(
	issues: Issue[],
	filters: FilterState,
	searchTextById?: Map<string, string>
): Issue[] {
	const tokens = filters.search
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);

	return sortIssues(
		issues.filter((issue) => {
			if (!matchesView(issue, filters.view)) {
				return false;
			}

			if (filters.severity !== 'all' && issue.severity !== filters.severity) {
				return false;
			}

			if (filters.area !== 'all' && issue.area !== filters.area) {
				return false;
			}

			if (filters.status !== 'all' && issue.status !== filters.status) {
				return false;
			}

			if (tokens.length > 0) {
				const text = searchTextById?.get(issue.id) ?? issueSearchText(issue);
				if (!tokens.every((token) => text.includes(token))) {
					return false;
				}
			}

			return true;
		}),
		filters.sort
	);
}

export function parseFilters(
	searchParams: URLSearchParams,
	validAreas?: string[]
): FilterState {
	const severityParam = searchParams.get('severity');
	const statusParam = searchParams.get('status');
	const sortParam = searchParams.get('sort');
	const areaParam = searchParams.get('area');
	const viewParam = searchParams.get('view');

	const severity =
		severityParam && severityParam !== 'all' && severitySchema.safeParse(severityParam).success
			? (severityParam as FilterState['severity'])
			: 'all';

	const status =
		statusParam && statusParam !== 'all' && statusSchema.safeParse(statusParam).success
			? (statusParam as FilterState['status'])
			: 'all';

	const sort =
		sortParam && SORT_OPTIONS.includes(sortParam as SortOption)
			? (sortParam as SortOption)
			: 'id-asc';

	const view =
		viewParam && FILTER_VIEWS.includes(viewParam as FilterView)
			? (viewParam as FilterView)
			: 'active';

	let area: FilterState['area'] = 'all';
	if (areaParam && areaParam !== 'all') {
		area =
			validAreas && !validAreas.includes(areaParam)
				? 'all'
				: areaParam;
	}

	return {
		search: (searchParams.get('q') ?? '').trim(),
		severity,
		area,
		status,
		sort,
		view
	};
}

export function filtersToSearchParams(filters: FilterState): URLSearchParams {
	const params = new URLSearchParams();

	const trimmedSearch = filters.search.trim();
	if (trimmedSearch) params.set('q', trimmedSearch);
	if (filters.severity !== 'all') params.set('severity', filters.severity);
	if (filters.area !== 'all') params.set('area', filters.area);
	if (filters.status !== 'all') params.set('status', filters.status);
	if (filters.sort !== 'id-asc') params.set('sort', filters.sort);
	if (filters.view !== 'active') params.set('view', filters.view);

	return params;
}

export function isFiltersActive(filters: FilterState): boolean {
	return (
		Boolean(filters.search.trim()) ||
		filters.severity !== 'all' ||
		filters.area !== 'all' ||
		filters.status !== 'all' ||
		filters.sort !== 'id-asc' ||
		filters.view !== 'active'
	);
}

export function clearFilters(): FilterState {
	return {
		search: '',
		severity: 'all',
		area: 'all',
		status: 'all',
		sort: 'id-asc',
		view: 'active'
	};
}

export function clearSearchFilter(filters: FilterState): FilterState {
	return {
		...filters,
		search: ''
	};
}
