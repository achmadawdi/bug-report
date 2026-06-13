import { browser } from '$app/environment';
import { goto, pushState } from '$app/navigation';
import { getReportPane } from '$lib/report-host.js';
import { isRouteDataReady, preloadRoute } from '$lib/preload.js';
import { parseReportSlug, reportPath } from '$lib/routes.js';
import { loadOpenTabs, saveOpenTabs, upsertTab } from '$lib/tabs.js';
import type { ReportSummary } from '$lib/server/store.js';

export type NavigateToReportOptions = {
	search?: string;
	title?: string;
};

/** Overrides page.url for instant shallow tab switches (pushState does not always sync $page). */
let shallowActiveSlug: string | null = null;
let navigationRevision = 0;
const navigationListeners = new Set<() => void>();

function notifyNavigationChange(): void {
	navigationRevision += 1;
	for (const listener of navigationListeners) {
		listener();
	}
}

export function getNavigationRevision(): number {
	return navigationRevision;
}

export function subscribeNavigationSlug(listener: () => void): () => void {
	navigationListeners.add(listener);
	return () => navigationListeners.delete(listener);
}

/** Resolve the active report slug from shallow routing override or SvelteKit page URL. */
export function resolveActiveReportSlug(pagePathname: string): string | null {
	const fromPage = parseReportSlug(pagePathname);
	if (!fromPage) return null;
	return shallowActiveSlug ?? fromPage;
}

function setShallowActiveSlug(slug: string | null): void {
	if (shallowActiveSlug === slug) return;
	shallowActiveSlug = slug;
	notifyNavigationChange();
}

export function clearShallowActiveSlug(): void {
	setShallowActiveSlug(null);
}

export type ActiveReportContext = {
	slug: string;
	search: string;
	href: string;
};

/** Active report href from the browser URL (authoritative after pushState). */
export function getActiveReportHref(): string | null {
	if (!browser) return null;
	const slug = parseReportSlug(window.location.pathname);
	if (!slug) return null;
	return `${reportPath(slug)}${window.location.search}`;
}

/** Active report search string from the browser URL. */
export function getActiveReportSearch(): string {
	if (!browser) return '';
	return window.location.search;
}

/** Active report slug, search, and href for pane/filter coordination. */
export function getNavigationTargetContext(): ActiveReportContext | null {
	if (!browser) return null;
	const slug = resolveActiveReportSlug(window.location.pathname);
	if (!slug) return null;
	const search = window.location.search;
	return { slug, search, href: `${reportPath(slug)}${search}` };
}

if (browser) {
	window.addEventListener('popstate', () => {
		setShallowActiveSlug(parseReportSlug(window.location.pathname));
		notifyNavigationChange();
	});
}

export function buildReportHref(slug: string, search = ''): string {
	const base = reportPath(slug);
	if (!search) return base;
	return search.startsWith('?') ? `${base}${search}` : `${base}?${search}`;
}

/** Upsert tab in session storage so the tab bar updates without waiting for activeSlug effect. */
export function ensureReportTab(slug: string, title: string): void {
	const tabs = loadOpenTabs();
	const next = upsertTab(tabs, { slug, title });
	if (JSON.stringify(next) !== JSON.stringify(tabs)) {
		saveOpenTabs(next);
	}
}

/**
 * Navigate to a report dashboard.
 * Cached panes use shallow routing only for report-to-report dashboard switches.
 * Non-report pages use goto so SvelteKit replaces the routed child.
 */
export async function navigateToReport(
	slug: string,
	options: NavigateToReportOptions = {}
): Promise<void> {
	if (!browser) return;

	const href = buildReportHref(slug, options.search ?? '');
	if (options.title) {
		ensureReportTab(slug, options.title);
	}

	const currentReportSlug = parseReportSlug(window.location.pathname);
	const canUseShallowReportSwitch = currentReportSlug != null && getReportPane(slug);

	if (canUseShallowReportSwitch) {
		setShallowActiveSlug(slug);
		pushState(href, {});
		notifyNavigationChange();
		return;
	}

	setShallowActiveSlug(null);
	if (!isRouteDataReady(href)) {
		void preloadRoute(href);
	}

	await goto(href);
	setShallowActiveSlug(null);
}

export async function navigateToReportFromSummary(report: ReportSummary): Promise<void> {
	ensureReportTab(report.slug, report.title);
	await navigateToReport(report.slug);
}
