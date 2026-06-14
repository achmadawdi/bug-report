<script lang="ts">
	import type { ReportSummary } from '$lib/server/store.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { displayText, displayDate } from '$lib/format.js';
	import FolderKanbanIcon from '@lucide/svelte/icons/folder-kanban';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import BugIcon from '@lucide/svelte/icons/bug';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { ui } from '$lib/ui-layout.js';
	import { preloadRoute } from '$lib/preload.js';
	import { reportPath } from '$lib/routes.js';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import {
		PROJECT_WORKFLOW_LABELS,
		PROJECT_WORKFLOW_STYLES,
		PROJECT_WORKFLOW_CARD_STYLES
	} from '$lib/constants.js';
	import { cn } from '$lib/utils.js';
	import DragHandle from '$lib/components/sortable/DragHandle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	let {
		report,
		onclick,
		onDelete,
		variant = 'default',
		dragHandleAttrs = null
	}: {
		report: ReportSummary;
		onclick: () => void;
		onDelete?: (report: ReportSummary) => void;
		variant?: 'default' | 'nested';
		dragHandleAttrs?: Record<string, unknown> | null;
	} = $props();

	const meta = $derived(
		[displayText(report.gameVersion), displayDate(report.testDate)]
			.filter((value) => value && value !== '—')
			.join(' · ')
	);

	const isNested = $derived(variant === 'nested');
	const isResolved = $derived(report.workflowStatus === 'resolved');
	const isOpen = $derived(report.workflowStatus === 'open');
	const isMuted = $derived(!isOpen);
	const showProgress = $derived(report.issueCount > 0);
	const badgeSize = $derived(isNested ? 'px-1.5 py-0 text-[10px]' : '');
	const mutedBadge = 'border-border/50 bg-muted/20 text-muted-foreground';
	const surfaceStyle = $derived(
		isOpen
			? isNested
				? 'border-border/60 bg-card/45 hover:border-primary-muted/40 hover:bg-card-hover/90 hover:shadow-xs backdrop-blur-md'
				: 'border-border bg-card/65 hover:border-primary/40 hover:bg-card-hover hover:shadow-sm backdrop-blur-md'
			: PROJECT_WORKFLOW_CARD_STYLES[report.workflowStatus]
	);
	const cardPadding = $derived(isNested ? 'px-3 py-4' : 'px-4 py-4');
	const iconSize = $derived(isNested ? 'size-9' : 'size-10');
</script>

<div class="group/report relative w-full">
	<button
		type="button"
		class="w-full text-left"
		{onclick}
		onpointerenter={() => preloadRoute(reportPath(report.slug))}
		onfocus={() => preloadRoute(reportPath(report.slug))}
	>
		<Card class={cn('gap-0 py-0 transition-colors', surfaceStyle)}>
		<div class={cn('flex flex-col gap-2', cardPadding)}>
			<div class="flex items-start gap-2.5">
				{#if dragHandleAttrs}
					<DragHandle attributes={dragHandleAttrs} class="mt-0.5" />
				{/if}
				<div
					class={cn(
						'flex shrink-0 items-center justify-center rounded-md border p-1 transition-colors',
						isResolved
							? 'border-border-subtle bg-surface-subtle/50 text-muted-foreground/60'
							: 'border-border bg-secondary/30 text-muted-foreground group-hover/report:border-primary-muted/40 group-hover/report:bg-primary-surface/30 group-hover/report:text-primary',
						iconSize
					)}
				>
					<FolderKanbanIcon class="size-full" />
				</div>

				<div class="flex min-w-0 flex-1 items-start justify-between gap-2">
					<div class="min-w-0 space-y-0.5">
						<h3
							class={cn(
								'line-clamp-2 text-sm leading-snug font-medium',
								isResolved && 'text-muted-foreground'
							)}
						>
							{report.title}
						</h3>
						{#if meta}
							<p
								class={cn(
									'truncate text-xs',
									isResolved ? 'text-muted-foreground/70' : 'text-muted-foreground'
								)}
							>
								{meta}
							</p>
						{/if}
					</div>
					<ChevronRightIcon
						class={cn(
							'mt-0.5 size-4 shrink-0 transition-opacity',
							isResolved
								? 'text-muted-foreground/40 opacity-0 group-hover/report:opacity-60'
								: 'text-muted-foreground opacity-0 group-hover/report:opacity-100'
						)}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-2 border-t border-border/40 pt-2">
				<div class={cn(ui.badgeRow, isNested && 'gap-1.5')}>
					{#if !isOpen}
						<Badge
							variant="outline"
							class={cn(
								PROJECT_WORKFLOW_STYLES[report.workflowStatus],
								badgeSize
							)}
						>
							{PROJECT_WORKFLOW_LABELS[report.workflowStatus]}
						</Badge>
					{/if}
					<Badge
						variant="secondary"
						class={cn('gap-1', badgeSize, isMuted && mutedBadge)}
					>
						<BugIcon class={isNested ? 'size-3' : 'size-3.5'} />
						{report.issueCount} total
					</Badge>
					{#if report.openCount > 0 && !isResolved}
						<Badge variant="outline" class={cn('gap-1 border-severity-high/20 bg-severity-high/6 text-severity-high', badgeSize)}>
							{report.openCount} open
						</Badge>
					{/if}
					{#if report.criticalCount > 0 && !isResolved}
						<Badge variant="destructive" class={cn('gap-1', badgeSize)}>
							<AlertTriangleIcon class={isNested ? 'size-3' : 'size-3.5'} />
							{report.criticalCount} critical
						</Badge>
					{/if}
					{#if report.fixedCount > 0}
						<Badge
							variant="outline"
							class={cn(
								'gap-1',
								badgeSize,
								isMuted
									? mutedBadge
									: 'border-severity-low/30 text-severity-low'
							)}
						>
							<CircleCheckIcon class={isNested ? 'size-3' : 'size-3.5'} />
							{report.fixedCount} fixed
						</Badge>
					{/if}
				</div>

				{#if showProgress}
					<ProgressBar
						value={report.resolvedCount}
						max={report.issueCount}
						tone={isMuted ? 'muted' : 'default'}
						size={isNested ? 'sm' : 'default'}
					/>
				{/if}
			</div>
		</div>
	</Card>
	</button>

	{#if onDelete}
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			class="absolute top-2 right-2 z-10 size-7 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/report:opacity-100"
			aria-label="Delete report"
			onclick={(event) => {
				event.stopPropagation();
				onDelete(report);
			}}
		>
			<Trash2Icon class="size-3.5" />
		</Button>
	{/if}
</div>
