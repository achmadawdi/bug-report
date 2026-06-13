import { preloadData } from '$app/navigation';
import { reportPath } from '$lib/routes.js';

type RouteCacheEntry = {
	state: 'pending' | 'ready' | 'error';
	promise: Promise<void>;
};

const FILTER_PARAM_NAMES = ['q', 'severity', 'area', 'status', 'sort', 'view'] as const;

const routeCache = new Map<string, RouteCacheEntry>();

function parseHref(href: string): URL {
	if (href.startsWith('/')) {
		return new URL(href, 'http://localhost');
	}
	return new URL(href);
}

/** Canonical filter query string for stable cache keys. */
export function canonicalFilterQuery(searchParams: URLSearchParams): string {
	const params = new URLSearchParams();
	for (const name of FILTER_PARAM_NAMES) {
		const value = searchParams.get(name);
		if (value) params.set(name, value);
	}
	const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
	const canonical = new URLSearchParams(sorted);
	const query = canonical.toString();
	return query ? `?${query}` : '';
}

/** Pathname only — for tab-level checks where any report data is sufficient. */
export function normalizeRoutePathname(href: string): string {
	return parseHref(href).pathname;
}

/** Pathname plus filter-relevant query — used for route data cache keys. */
export function normalizeRouteCacheKey(href: string): string {
	const url = parseHref(href);
	return `${url.pathname}${canonicalFilterQuery(url.searchParams)}`;
}

/** @deprecated Use normalizeRouteCacheKey for data readiness; normalizeRoutePathname for pathname-only checks. */
export function normalizeRouteHref(href: string): string {
	return normalizeRouteCacheKey(href);
}

function setRouteState(href: string, entry: RouteCacheEntry) {
	routeCache.set(normalizeRouteCacheKey(href), entry);
}

/** Preload a route's load data; returns the same promise for repeated calls while in flight. */
export function preloadRoute(href: string): Promise<void> {
	const key = normalizeRouteCacheKey(href);
	const existing = routeCache.get(key);

	if (existing?.state === 'ready') {
		return existing.promise;
	}

	if (existing?.state === 'pending') {
		return existing.promise;
	}

	const promise = preloadData(href)
		.then(() => {
			setRouteState(href, { state: 'ready', promise });
		})
		.catch((error) => {
			routeCache.delete(key);
			throw error;
		});

	setRouteState(href, { state: 'pending', promise });
	return promise;
}

export function isRouteDataReady(href: string): boolean {
	return routeCache.get(normalizeRouteCacheKey(href))?.state === 'ready';
}

export function isRouteDataLoading(href: string): boolean {
	return routeCache.get(normalizeRouteCacheKey(href))?.state === 'pending';
}

export function markRouteDataReady(href: string): void {
	const key = normalizeRouteCacheKey(href);
	const existing = routeCache.get(key);
	setRouteState(href, {
		state: 'ready',
		promise: existing?.promise ?? Promise.resolve()
	});
}

export function invalidateRouteCache(href?: string): void {
	if (href) {
		routeCache.delete(normalizeRouteCacheKey(href));
		return;
	}

	routeCache.clear();
}

/** Invalidate all cached href variants for a report slug. */
export function invalidateReportRouteCache(slug: string): void {
	const prefix = reportPath(slug);
	for (const key of routeCache.keys()) {
		if (key === prefix || key.startsWith(`${prefix}?`)) {
			routeCache.delete(key);
		}
	}
}

export function preloadOpenTabs(slugs: string[]): void {
	for (const slug of slugs) {
		void preloadRoute(reportPath(slug));
	}
}
