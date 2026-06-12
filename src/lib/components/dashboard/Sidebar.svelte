<script lang="ts">
	import type { ReportView } from '$lib/types.js';
	import { SEVERITIES, SEVERITY_STYLES } from '$lib/constants.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import BreakdownChart from './BreakdownChart.svelte';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let { report }: { report: ReportView } = $props();
</script>

<aside class="space-y-4">
	<Card size="sm" class={ui.cardPanel}>
		<details class="group">
			<summary
				class="cursor-pointer list-none [&::-webkit-details-marker]:hidden"
			>
				<CardHeader class={ui.cardHeader}>
					<CardTitle class="flex items-center justify-between gap-2 text-sm font-semibold">
						<span class="flex items-center gap-2">
							<ShieldIcon class="size-4 text-primary" />
							Severity Guide
						</span>
						<ChevronDownIcon
							class="size-4 text-muted-foreground transition-transform group-open:rotate-180"
						/>
					</CardTitle>
				</CardHeader>
			</summary>
			<CardContent class="space-y-3 {ui.cardContent}">
				{#each SEVERITIES as severity}
					<div class="rounded-md border border-border bg-secondary/40 p-3">
						<div class="mb-1 flex items-center gap-2">
							<span class="size-2 rounded-full {SEVERITY_STYLES[severity].dot}"></span>
							<span class="text-sm font-semibold">{severity}</span>
						</div>
						<p class="text-xs leading-relaxed text-muted-foreground">
							{report.severity_guide[severity]}
						</p>
					</div>
				{/each}
			</CardContent>
		</details>
	</Card>

	<Card size="sm" class={ui.cardPanel}>
		<CardHeader class={ui.cardHeader}>
			<CardTitle class="flex items-center gap-2 text-sm font-semibold">
				<CircleCheckIcon class="size-4 text-severity-low" />
				No Issues Recorded
			</CardTitle>
		</CardHeader>
		<CardContent class={cn(ui.badgeRow, ui.cardContent)}>
			{#each report.levels_with_no_issues_recorded as level}
				<Badge variant="outline" class="border-severity-low/30 bg-severity-low/10 text-severity-low">
					{level}
				</Badge>
			{/each}
		</CardContent>
	</Card>

	<BreakdownChart summary={report.summary} />
</aside>
