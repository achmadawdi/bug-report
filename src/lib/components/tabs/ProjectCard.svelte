<script lang="ts">
	import type { ProjectSummary } from '$lib/server/store.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { displayText } from '$lib/format.js';
	import FolderKanbanIcon from '@lucide/svelte/icons/folder-kanban';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import BugIcon from '@lucide/svelte/icons/bug';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { ui } from '$lib/ui-layout.js';
	import { preloadRoute } from '$lib/preload.js';

	let {
		project,
		onclick
	}: {
		project: ProjectSummary;
		onclick: () => void;
	} = $props();

	const meta = $derived(
		[displayText(project.platform), displayText(project.version)]
			.filter((value) => value && value !== '—')
			.join(' · ')
	);
</script>

<button
	type="button"
	class="group w-full text-left"
	{onclick}
	onpointerenter={() => preloadRoute(`/p/${project.slug}`)}
	onfocus={() => preloadRoute(`/p/${project.slug}`)}
>
	<Card
		class="h-full border-border bg-card transition-colors hover:border-primary/40 hover:bg-card/80"
	>
		<div class="flex {ui.gridLg} {ui.cardPadding}">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary"
			>
				<FolderKanbanIcon class="size-5" />
			</div>

			<div class="flex min-w-0 flex-1 flex-col {ui.gridLg}">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 space-y-1">
						<p class="font-mono {ui.sectionTitle}">
							{project.slug}
						</p>
						<h3 class="line-clamp-2 text-sm leading-snug font-semibold sm:text-base">
							{project.title}
						</h3>
						{#if meta}
							<p class="truncate text-xs text-muted-foreground">{meta}</p>
						{/if}
					</div>
					<ChevronRightIcon
						class="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
					/>
				</div>

				<div class={ui.badgeRow}>
					<Badge variant="secondary" class="gap-1">
						<BugIcon />
						{project.issueCount} total
					</Badge>
					{#if project.openCount > 0}
						<Badge variant="outline" class="gap-1">
							{project.openCount} open
						</Badge>
					{/if}
					{#if project.criticalCount > 0}
						<Badge variant="destructive" class="gap-1">
							<AlertTriangleIcon />
							{project.criticalCount} critical
						</Badge>
					{/if}
					{#if project.fixedCount > 0}
						<Badge variant="outline" class="gap-1 border-severity-low/30 text-severity-low">
							<CircleCheckIcon />
							{project.fixedCount} fixed
						</Badge>
					{/if}
				</div>
			</div>
		</div>
	</Card>
</button>
