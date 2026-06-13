<script lang="ts">
	import type { ProjectGroupDetail, ReportSummary } from '$lib/server/store.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ReportCard from './ReportCard.svelte';
	import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';

	let {
		group,
		onOpenReport,
		onCreateReport,
		class: className = ''
	}: {
		group: ProjectGroupDetail;
		onOpenReport: (report: ReportSummary) => void;
		onCreateReport?: () => void;
		class?: string;
	} = $props();
</script>

<Card class={cn('gap-0 overflow-hidden border-border bg-card py-0', className)}>
	<CardContent class="p-0">
		<div
			class="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2"
		>
			<div class="flex min-w-0 items-center gap-2">
				<FolderTreeIcon class="size-3.5 shrink-0 text-muted-foreground" />
				<h3 class="min-w-0 truncate text-sm font-semibold">
					{group.title}
				</h3>
			</div>

			{#if onCreateReport}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					class="{ui.controlSm} shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
					onclick={onCreateReport}
				>
					<PlusIcon class="size-3.5" />
					New report
				</Button>
			{/if}
		</div>

		{#if group.reports.length > 0}
			<div class="p-3">
				<div class="grid {ui.grid} sm:grid-cols-2">
					{#each group.reports as report (report.slug)}
						<ReportCard
							{report}
							variant="nested"
							onclick={() => onOpenReport(report)}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
