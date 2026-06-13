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
		badge: 'border-severity-critical/20 bg-severity-critical/8 text-severity-critical',
		dot: 'bg-severity-critical',
		bar: 'bg-severity-critical'
	},
	High: {
		badge: 'border-severity-high/20 bg-severity-high/8 text-severity-high',
		dot: 'bg-severity-high',
		bar: 'bg-severity-high'
	},
	Medium: {
		badge: 'border-severity-medium/20 bg-severity-medium/8 text-severity-medium',
		dot: 'bg-severity-medium',
		bar: 'bg-severity-medium'
	},
	Low: {
		badge: 'border-severity-low/20 bg-severity-low/8 text-severity-low',
		dot: 'bg-severity-low',
		bar: 'bg-severity-low'
	}
};

export const STATUS_STYLES: Record<BugStatus, string> = {
	open: 'border-severity-high/20 bg-severity-high/8 text-severity-high',
	in_progress: 'border-primary-muted/30 bg-primary-surface/40 text-primary',
	fixed: 'border-severity-low/20 bg-severity-low/8 text-severity-low',
	wont_fix: 'border-border-subtle bg-secondary/40 text-muted-foreground'
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
	open: 'border-severity-high/20 bg-severity-high/8 text-severity-high',
	resolved: 'border-severity-low/25 bg-severity-low/8 text-foreground/75 dark:text-severity-low/80',
	postponed: 'border-border-subtle bg-secondary/40 text-muted-foreground'
};

export const PROJECT_WORKFLOW_CARD_STYLES: Record<ReportWorkflowStatus, string> = {
	open: '',
	resolved:
		'border-border-subtle bg-surface-subtle/40 text-muted-foreground hover:border-border/50 hover:bg-card-hover',
	postponed:
		'border-border-subtle/70 bg-secondary/20 text-foreground/80 hover:border-border/60 hover:bg-secondary/30'
};

export const AREA_BADGE_STYLE =
	'border-primary-muted/25 bg-primary-surface/40 text-primary hover:bg-primary-surface/60';

export const CATEGORY_BADGE_STYLE =
	'border-chart-4/20 bg-chart-4/8 text-chart-4 hover:bg-chart-4/12';
