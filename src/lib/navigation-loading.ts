import { navigating } from '$app/state';
import { REPORT_PATH_RE } from '$lib/routes.js';

/** True when navigating to a report dashboard (`/report/:slug`). */
export function isNavigatingToReport() {
	const pathname = navigating.to?.url.pathname;
	return pathname != null && REPORT_PATH_RE.test(pathname);
}

/** True when navigating to the home page (`/`). */
export function isNavigatingToHome() {
	return navigating.to?.url.pathname === '/';
}

/** True during any in-app route transition. */
export function isNavigating() {
	return navigating.to != null;
}
