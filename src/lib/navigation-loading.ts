import { navigating } from '$app/state';
import {
	canonicalFilterQuery,
	isRouteDataLoading,
	isRouteDataReady
} from '$lib/preload.js';
import { REPORT_PATH_RE } from '$lib/routes.js';

export const NAVIGATION_LOADING_DELAY_MS = 150;

/** True when pathname is a report dashboard (`/report/:slug`). */
export function isReportPath(pathname: string | null | undefined): boolean {
	return pathname != null && REPORT_PATH_RE.test(pathname);
}

/** True when navigating to a report dashboard (`/report/:slug`). */
export function isNavigatingToReport() {
	const pathname = navigating.to?.url.pathname;
	return isReportPath(pathname);
}

/** True when a report navigation must replace a non-report routed page. */
export function isNavigatingFromNonReportToReport() {
	return isNavigatingToReport() && !isReportPath(navigating.from?.url.pathname);
}

/** True when navigating to the home page (`/`). */
export function isNavigatingToHome() {
	return navigating.to?.url.pathname === '/';
}

/** True during any in-app route transition. */
export function isNavigating() {
	return navigating.to != null;
}

export function getNavigationTargetHref(): string | null {
	if (!navigating.to) return null;
	const pathname = navigating.to.url.pathname;
	const search = canonicalFilterQuery(navigating.to.url.searchParams);
	return `${pathname}${search}`;
}

export function isNavigationTargetDataReady(): boolean {
	const href = getNavigationTargetHref();
	if (!href) return true;
	return isRouteDataReady(href);
}

export function isNavigationTargetDataLoading(): boolean {
	const href = getNavigationTargetHref();
	if (!href) return false;
	return isRouteDataLoading(href);
}

/** Show skeleton when navigating to a report and target load data is not ready yet. */
export function shouldShowReportNavigationSkeleton(): boolean {
	return (
		isNavigatingToReport() &&
		(isNavigatingFromNonReportToReport() || !isNavigationTargetDataReady())
	);
}

/** Show skeleton when navigating home and home data is not ready yet. */
export function shouldShowHomeNavigationSkeleton(): boolean {
	return isNavigatingToHome() && !isRouteDataReady('/');
}
