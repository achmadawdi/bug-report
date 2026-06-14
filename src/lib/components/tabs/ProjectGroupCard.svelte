<script lang="ts">
	import type { ProjectGroupDetail, ReportSummary } from '$lib/server/store.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ReportCard from './ReportCard.svelte';
	import SortableList from '$lib/components/sortable/SortableList.svelte';
	import DragHandle from '$lib/components/sortable/DragHandle.svelte';
	import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import { goto } from '$app/navigation';
	import { groupPath } from '$lib/routes.js';

	let {
		group,
		onOpenReport,
		onCreateReport,
		onDeleteGroup,
		onDeleteReport,
		onReorderReports,
		groupsOnlyLayout = false,
		sortable = false,
		dragHandleAttrs = null,
		class: className = ''
	}: {
		group: ProjectGroupDetail;
		onOpenReport: (report: ReportSummary) => void;
		onCreateReport?: () => void;
		onDeleteGroup?: () => void;
		onDeleteReport?: (report: ReportSummary) => void;
		onReorderReports?: (slugs: string[]) => void | Promise<void>;
		groupsOnlyLayout?: boolean;
		sortable?: boolean;
		dragHandleAttrs?: Record<string, unknown> | null;
		class?: string;
	} = $props();

	let reports = $state<ReportSummary[]>([]);

	$effect(() => {
		reports = [...group.reports];
	});

	const reportGridClass = $derived(
		cn(
			'grid',
			ui.gridLg,
			groupsOnlyLayout
				? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]'
				: 'md:grid-cols-2 lg:grid-cols-3'
		)
	);

	async function handleReportReorder(nextReports: ReportSummary[]) {
		const previous = reports;
		reports = nextReports;
		try {
			await onReorderReports?.(nextReports.map((report) => report.slug));
		} catch {
			reports = previous;
		}
	}
</script>

<Card class={cn('group/group gap-0 overflow-hidden border-border bg-card/25 backdrop-blur-md py-0 shadow-sm', className)}>
	<CardContent class="p-0">
		<div
			class="flex items-center justify-between gap-3 border-b border-border/40 {ui.cardHeader}"
		>
			<div class="flex min-w-0 items-center gap-2">
				{#if sortable && dragHandleAttrs}
					<DragHandle attributes={dragHandleAttrs} />
				{/if}
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
			</div>

			<div class="flex shrink-0 items-center gap-1">
				{#if onDeleteGroup}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						class="{ui.controlSm} shrink-0 px-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/group:opacity-100"
						aria-label="Delete group"
						onclick={onDeleteGroup}
					>
						<Trash2Icon class="size-3.5" />
					</Button>
				{/if}
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
		</div>

		{#if reports.length > 0}
			<div class="{ui.cardPadding}">
				{#if sortable && onReorderReports}
					<SortableList
						items={reports}
						getKey={(report) => report.slug}
						class={reportGridClass}
						onReorder={handleReportReorder}
					>
						{#snippet children(report, { dragHandleAttrs: reportDragHandleAttrs })}
							<ReportCard
								{report}
								variant="nested"
								dragHandleAttrs={reportDragHandleAttrs}
								onclick={() => onOpenReport(report)}
								onDelete={onDeleteReport}
							/>
						{/snippet}
					</SortableList>
				{:else}
					<div class={reportGridClass}>
						{#each reports as report (report.slug)}
							<ReportCard
								{report}
								variant="nested"
								onclick={() => onOpenReport(report)}
								onDelete={onDeleteReport}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>
