import { preloadData } from '$app/navigation';

const preloaded = new Set<string>();

/** Preload a route's load data once (idempotent per href). */
export function preloadRoute(href: string) {
	if (preloaded.has(href)) return;
	preloaded.add(href);
	void preloadData(href);
}
