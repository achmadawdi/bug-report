<script lang="ts">
	import type { ReportSummary } from '$lib/types.js';
	import type { FilterView } from '$lib/types.js';
	import {
		SEVERITIES,
		SEVERITY_STYLES,
		STATUSES,
		STATUS_LABELS,
		isResolvedStatus
	} from '$lib/constants.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';
	import { cn } from '$lib/utils.js';

	let {
		summary,
		onViewChange,
		currentView = 'active'
	}: {
		summary: ReportSummary;
		onViewChange?: (view: FilterView) => void;
		currentView?: FilterView;
	} = $props();

	const severityTotal = $derived(
		SEVERITIES.reduce((acc, severity) => acc + summary.by_severity[severity], 0)
	);
	const statusTotal = $derived(
		STATUSES.reduce((acc, status) => acc + summary.by_status[status], 0)
	);

	function handleStatusClick(status: (typeof STATUSES)[number]) {
		if (!onViewChange) return;
		onViewChange(isResolvedStatus(status) ? 'resolved' : 'active');
	}
</script>

<Card size="sm" class={cn(ui.cardPanel, 'border-border/60 bg-card/45 backdrop-blur-md shadow-sm')}>
	<CardHeader class={ui.cardHeader}>
		<CardTitle class="flex items-center gap-2 text-sm font-semibold">
			<BarChart3Icon class="size-4 text-primary-muted" />
			Breakdown
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4 {ui.cardContent}">
		<div class={ui.field}>
			<p class={ui.sectionTitle}>By Severity</p>
			<div class="flex h-3 overflow-hidden rounded-full bg-secondary">
				{#each SEVERITIES as severity}
					{@const count = summary.by_severity[severity]}
					{#if count > 0}
						<div
							class="{SEVERITY_STYLES[severity].bar} transition-all"
							style:width="{severityTotal ? (count / severityTotal) * 100 : 0}%"
							title="{severity}: {count}"
						></div>
					{/if}
				{/each}
			</div>
			<div class="grid grid-cols-2 {ui.grid}">
				{#each SEVERITIES as severity}
					<div class="flex items-center justify-between text-xs">
						<span class="flex items-center gap-2 text-muted-foreground">
							<span class="size-2 rounded-full {SEVERITY_STYLES[severity].dot}"></span>
							{severity}
						</span>
						<span class="font-semibold">{summary.by_severity[severity]}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class={ui.field}>
			<div class="flex items-center justify-between gap-2">
				<p class={ui.sectionTitle}>By Status</p>
				{#if onViewChange}
					<button
						type="button"
						class="text-[10px] font-medium text-primary hover:underline {currentView === 'all'
							? 'underline'
							: ''}"
						onclick={() => onViewChange('all')}
					>
						View all
					</button>
				{/if}
			</div>
			<div class="flex h-3 overflow-hidden rounded-full bg-secondary">
				{#each STATUSES as status}
					{@const count = summary.by_status[status]}
					{#if count > 0}
						<div
							class="bg-primary/70 transition-all {status === 'fixed'
								? 'bg-severity-low'
								: status === 'wont_fix'
									? 'bg-muted-foreground'
									: status === 'in_progress'
										? 'bg-primary'
										: 'bg-secondary-foreground/40'}"
							style:width="{statusTotal ? (count / statusTotal) * 100 : 0}%"
							title="{STATUS_LABELS[status]}: {count}"
						></div>
					{/if}
				{/each}
			</div>
			<div class="grid grid-cols-2 {ui.grid}">
				{#each STATUSES as status}
					{#if onViewChange}
						<button
							type="button"
							class="flex items-center justify-between rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-secondary/60"
							onclick={() => handleStatusClick(status)}
						>
							<span class="text-muted-foreground">{STATUS_LABELS[status]}</span>
							<span class="font-semibold">{summary.by_status[status]}</span>
						</button>
					{:else}
						<div class="flex items-center justify-between text-xs">
							<span class="text-muted-foreground">{STATUS_LABELS[status]}</span>
							<span class="font-semibold">{summary.by_status[status]}</span>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</CardContent>
</Card>
