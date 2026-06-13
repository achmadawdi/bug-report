import type { BugStatus, Severity } from './types.js';

export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES: BugStatus[] = ['open', 'in_progress', 'fixed', 'wont_fix'];

export const RESOLVED_STATUSES: BugStatus[] = ['fixed', 'wont_fix'];

export const ACTIVE_STATUSES: BugStatus[] = ['open', 'in_progress'];

export function isResolvedStatus(status: BugStatus): boolean {
	return RESOLVED_STATUSES.includes(status);
}

export const FILTER_VIEWS = ['active', 'resolved', 'all'] as const;

export const FILTER_VIEW_LABELS: Record<(typeof FILTER_VIEWS)[number], string> = {
	active: 'Active',
	resolved: 'Resolved',
	all: 'All'
};

export const SEVERITY_ORDER: Record<Severity, number> = {
	Critical: 0,
	High: 1,
	Medium: 2,
	Low: 3
};

export const STATUS_LABELS: Record<BugStatus, string> = {
	open: 'Open',
	in_progress: 'In Progress',
	fixed: 'Fixed',
	wont_fix: "Won't Fix"
};

export const SEVERITY_STYLES: Record<
	Severity,
	{ badge: string; dot: string; bar: string }
> = {
	Critical: {
		badge: 'border-severity-critical/30 bg-severity-critical/10 text-severity-critical',
		dot: 'bg-severity-critical',
		bar: 'bg-severity-critical'
	},
	High: {
		badge: 'border-severity-high/30 bg-severity-high/10 text-severity-high',
		dot: 'bg-severity-high',
		bar: 'bg-severity-high'
	},
	Medium: {
		badge: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
		dot: 'bg-severity-medium',
		bar: 'bg-severity-medium'
	},
	Low: {
		badge: 'border-severity-low/30 bg-severity-low/10 text-severity-low',
		dot: 'bg-severity-low',
		bar: 'bg-severity-low'
	}
};

export const STATUS_STYLES: Record<BugStatus, string> = {
	open: 'border-severity-high/35 bg-severity-high/12 text-severity-high',
	in_progress: 'border-primary/35 bg-primary/12 text-primary',
	fixed: 'border-severity-low/35 bg-severity-low/12 text-severity-low',
	wont_fix: 'border-muted-foreground/35 bg-muted/40 text-muted-foreground'
};

export const STATUS_DOT_STYLES: Record<BugStatus, string> = {
	open: 'bg-severity-high',
	in_progress: 'bg-primary',
	fixed: 'bg-severity-low',
	wont_fix: 'bg-muted-foreground'
};

import type { ReportWorkflowStatus } from './types.js';

export const PROJECT_WORKFLOW_STATUSES = ['open', 'resolved', 'postponed'] as const satisfies readonly ReportWorkflowStatus[];

export const PROJECT_WORKFLOW_LABELS: Record<ReportWorkflowStatus, string> = {
	open: 'Open',
	resolved: 'Resolved',
	postponed: 'Postponed'
};

export const PROJECT_WORKFLOW_STYLES: Record<ReportWorkflowStatus, string> = {
	open: 'border-severity-high/35 bg-severity-high/12 text-severity-high',
	resolved: 'border-border bg-muted/30 text-muted-foreground',
	postponed: 'border-muted-foreground/35 bg-muted/40 text-muted-foreground'
};

export const PROJECT_WORKFLOW_CARD_STYLES: Record<ReportWorkflowStatus, string> = {
	open: '',
	resolved:
		'border-border/40 bg-muted/15 text-muted-foreground hover:border-border/60 hover:bg-muted/20',
	postponed:
		'border-border/50 bg-secondary/15 text-foreground/80 hover:border-border/70 hover:bg-secondary/25'
};

export const AREA_BADGE_STYLE =
	'border-primary/35 bg-primary/12 text-primary hover:bg-primary/12';

export const CATEGORY_BADGE_STYLE =
	'border-chart-4/35 bg-chart-4/12 text-chart-4 hover:bg-chart-4/12';
