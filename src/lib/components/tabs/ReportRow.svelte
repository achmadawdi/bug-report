<script lang="ts">
	import type { ReportSummary } from '$lib/server/store.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { displayDate } from '$lib/format.js';
	import { reportPath } from '$lib/routes.js';
	import { preloadRoute } from '$lib/preload.js';
	import BugIcon from '@lucide/svelte/icons/bug';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import {
		PROJECT_WORKFLOW_LABELS,
		PROJECT_WORKFLOW_STYLES
	} from '$lib/constants.js';

	let {
		report,
		highlighted = false,
		onclick
	}: {
		report: ReportSummary;
		highlighted?: boolean;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	class="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/50 {highlighted
		? 'bg-primary/5'
		: ''}"
	{onclick}
	onpointerenter={() => preloadRoute(reportPath(report.slug))}
	onfocus={() => preloadRoute(reportPath(report.slug))}
>
	<div class="min-w-0 flex-1 space-y-1">
		<p class="truncate font-medium">{report.title}</p>
		<p class="font-mono text-xs text-muted-foreground">{report.slug}</p>
	</div>
	<p class="hidden shrink-0 text-xs text-muted-foreground sm:block">
		{displayDate(report.testDate)}
	</p>
	<div class="flex shrink-0 items-center gap-2">
		{#if report.workflowStatus !== 'open'}
			<Badge variant="outline" class={PROJECT_WORKFLOW_STYLES[report.workflowStatus]}>
				{PROJECT_WORKFLOW_LABELS[report.workflowStatus]}
			</Badge>
		{/if}
		<Badge variant="secondary" class="gap-1">
			<BugIcon />
			{report.issueCount}
		</Badge>
		{#if report.openCount > 0}
			<Badge variant="outline">{report.openCount} open</Badge>
		{/if}
		{#if report.criticalCount > 0}
			<Badge variant="destructive" class="gap-1">
				<AlertTriangleIcon />
				{report.criticalCount}
			</Badge>
		{/if}
	</div>
	<ChevronRightIcon
		class="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
	/>
</button>
