/** App route paths for reports and groups. */
export function reportPath(slug: string): string {
	return `/report/${slug}`;
}

export function reportPrintPath(slug: string, query = ''): string {
	const base = `/report/${slug}/print`;
	return query ? `${base}?${query}` : base;
}

export function groupPath(slug: string): string {
	return `/group/${slug}`;
}

export const REPORT_PATH_RE = /^\/report\/([^/]+)$/;

export function parseReportSlug(pathname: string): string | null {
	return pathname.match(REPORT_PATH_RE)?.[1] ?? null;
}
