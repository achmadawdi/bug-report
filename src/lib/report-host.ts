import { preloadData } from '$app/navigation';
import {
	invalidateReportRouteCache,
	invalidateRouteCache,
	isRouteDataReady,
	markRouteDataReady,
	preloadRoute
} from '$lib/preload.js';
import { buildReportHref, getNavigationTargetContext } from '$lib/report-navigation.js';
import { reportPath } from '$lib/routes.js';
import type { ActionData, PageData } from '../routes/report/[report]/$types.js';
import { clearReportSession } from '$lib/report-session.js';

export type ReportPane = {
	data: PageData;
	form: ActionData | null;
};

const panes = new Map<string, ReportPane>();
let paneVersion = 0;
const paneListeners = new Set<() => void>();

function notifyPaneChange() {
	paneVersion += 1;
	for (const listener of paneListeners) {
		listener();
	}
}

export function getPaneVersion(): number {
	return paneVersion;
}

export function subscribeReportPanes(listener: () => void): () => void {
	paneListeners.add(listener);
	return () => paneListeners.delete(listener);
}

export function updateReportPaneData(slug: string, data: PageData): void {
	const existing = panes.get(slug);
	if (existing?.data === data) return;

	panes.set(slug, { data, form: existing?.form ?? null });
	notifyPaneChange();
}

export function applyReportPaneForm(slug: string, form: ActionData | null): void {
	const existing = panes.get(slug);
	if (!existing) return;
	if (existing.form === form) return;

	panes.set(slug, { ...existing, form });
	notifyPaneChange();
}

export function registerReportPane(
	slug: string,
	data: PageData,
	form: ActionData | null = null
): void {
	const existing = panes.get(slug);
	if (existing?.data === data && existing?.form === form) {
		return;
	}

	panes.set(slug, { data, form });
	notifyPaneChange();
}

export function getReportPane(slug: string): ReportPane | undefined {
	return panes.get(slug);
}

export function removeReportPane(slug: string): void {
	panes.delete(slug);
	clearReportSession(slug);
	invalidateReportRouteCache(slug);
	notifyPaneChange();
}

export function invalidateReportPanes(): void {
	invalidateRouteCache();
	for (const slug of panes.keys()) {
		invalidateReportRouteCache(slug);
	}
	notifyPaneChange();
}

export async function reloadReportPane(slug: string, search = ''): Promise<void> {
	const href = buildReportHref(slug, search);
	invalidateRouteCache(href);

	const result = await preloadData(href);
	if (result.type === 'loaded' && result.data) {
		updateReportPaneData(slug, result.data as PageData);
		markRouteDataReady(href);
	}
}

export async function reloadReportPanes(
	slugs: string[],
	searchBySlug?: Map<string, string> | Record<string, string>
): Promise<void> {
	const searchMap =
		searchBySlug instanceof Map
			? searchBySlug
			: searchBySlug
				? new Map(Object.entries(searchBySlug))
				: new Map();

	const activeCtx = getNavigationTargetContext();

	await Promise.all(
		slugs.map((slug) => {
			let search = searchMap.get(slug) ?? '';
			if (!search && activeCtx?.slug === slug) {
				search = activeCtx.search;
			}
			return reloadReportPane(slug, search);
		})
	);
}

export async function refreshReportPanes(
	slugs: string[],
	invalidate: () => Promise<void>
): Promise<void> {
	for (const slug of slugs) {
		invalidateReportRouteCache(slug);
	}
	await invalidate();
	await reloadReportPanes(slugs);
}

const PRELOAD_DEBOUNCE_MS = 300;
let openTabsPreloadTimer: ReturnType<typeof setTimeout> | undefined;

/** Preload open tabs in the background, skipping the active tab and already-cached panes. */
export function schedulePreloadOpenTabs(
	slugs: string[],
	activeSlug: string | null,
	options: { force?: boolean } = {}
): void {
	clearTimeout(openTabsPreloadTimer);
	openTabsPreloadTimer = setTimeout(() => {
		for (const slug of slugs) {
			if (slug === activeSlug) continue;
			if (!options.force && getReportPane(slug)) continue;

			const href = reportPath(slug);
			if (isRouteDataReady(href)) continue;

			void preloadRoute(href);
		}
	}, PRELOAD_DEBOUNCE_MS);
}

export async function preloadReportTab(slug: string): Promise<void> {
	await preloadRoute(reportPath(slug));
}
