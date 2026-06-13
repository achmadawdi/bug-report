<script lang="ts">
	import type { ProjectGroupDetail, ReportSummary } from '$lib/server/store.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ReportCard from './ReportCard.svelte';
	import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import { groupPath } from '$lib/routes.js';

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

<Card class={cn('gap-0 overflow-hidden border-border bg-card/25 backdrop-blur-md py-0 shadow-sm', className)}>
	<CardContent class="p-0">
		<div
			class="flex items-center justify-between gap-3 border-b border-border/40 {ui.cardHeader}"
		>
			<button
				type="button"
				class="group/title flex min-w-0 items-center gap-2 text-left hover:cursor-pointer"
				onclick={() => goto(groupPath(group.slug))}
			>
				<FolderTreeIcon class="size-3.5 shrink-0 text-primary-muted group-hover/title:text-primary transition-colors" />
				<h3 class="min-w-0 truncate text-sm font-semibold text-foreground/90 group-hover/title:text-primary transition-colors">
					{group.title}
				</h3>
			</button>

			{#if onCreateReport}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					class="{ui.controlSm} shrink-0 px-2.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
					onclick={onCreateReport}
				>
					<PlusIcon class="size-3.5" />
					New report
				</Button>
			{/if}
		</div>

		{#if group.reports.length > 0}
			<div class="{ui.cardPadding}">
				<div class="grid {ui.gridLg} md:grid-cols-2 lg:grid-cols-3">
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
