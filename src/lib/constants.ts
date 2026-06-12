import type { BugStatus, Severity } from './types.js';

export const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES: BugStatus[] = ['open', 'in_progress', 'fixed', 'wont_fix'];

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
	open: 'border-border bg-secondary text-foreground',
	in_progress: 'border-primary/30 bg-primary/10 text-primary',
	fixed: 'border-severity-low/30 bg-severity-low/10 text-severity-low',
	wont_fix: 'border-muted-foreground/30 bg-muted text-muted-foreground'
};
