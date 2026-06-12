import { navigating } from '$app/state';

/** True when navigating to a project dashboard (`/p/:slug`). */
export function isNavigatingToProject() {
	const pathname = navigating.to?.url.pathname;
	return pathname != null && /^\/p\/[^/]+$/.test(pathname);
}

/** True when navigating to the home page (`/`). */
export function isNavigatingToHome() {
	return navigating.to?.url.pathname === '/';
}

/** True during any in-app route transition. */
export function isNavigating() {
	return navigating.to != null;
}
