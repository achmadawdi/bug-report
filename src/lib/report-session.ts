export type ReportSession = {
	scrollY: number;
	selectedIssueId: string | null;
	detailOpen: boolean;
};

const sessions = new Map<string, ReportSession>();

export function getReportSession(slug: string): ReportSession | undefined {
	return sessions.get(slug);
}

export function saveReportSession(slug: string, session: ReportSession): void {
	sessions.set(slug, session);
}

export function clearReportSession(slug: string): void {
	sessions.delete(slug);
}
