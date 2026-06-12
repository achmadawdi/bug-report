<script lang="ts">
	import type { ReportSummary } from '$lib/types.js';
	import { SEVERITIES, SEVERITY_STYLES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';

	let { summary }: { summary: ReportSummary } = $props();

	const severityTotal = $derived(
		SEVERITIES.reduce((acc, severity) => acc + summary.by_severity[severity], 0)
	);
	const statusTotal = $derived(
		STATUSES.reduce((acc, status) => acc + summary.by_status[status], 0)
	);
</script>

<Card class="border-border bg-card">
	<CardHeader class="pb-3">
		<CardTitle class="flex items-center gap-2 text-sm font-semibold">
			<BarChart3Icon class="size-4 text-primary" />
			Breakdown
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-5">
		<div class="space-y-2">
			<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">By Severity</p>
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
			<div class="grid grid-cols-2 gap-2">
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

		<div class="space-y-2">
			<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">By Status</p>
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
			<div class="grid grid-cols-2 gap-2">
				{#each STATUSES as status}
					<div class="flex items-center justify-between text-xs">
						<span class="text-muted-foreground">{STATUS_LABELS[status]}</span>
						<span class="font-semibold">{summary.by_status[status]}</span>
					</div>
				{/each}
			</div>
		</div>
	</CardContent>
</Card>
