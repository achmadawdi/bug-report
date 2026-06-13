<script lang="ts">
	import type { ProjectGroupDetail } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { navigateToReportFromSummary } from '$lib/report-navigation.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { Card } from '$lib/components/ui/card/index.js';
	import ReportCard from '$lib/components/tabs/ReportCard.svelte';
	import OpenReportDialog from '$lib/components/tabs/OpenReportDialog.svelte';
	import { getLastVisitedInGroup } from '$lib/groups.js';
	import { ui } from '$lib/ui-layout.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import BugIcon from '@lucide/svelte/icons/bug';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let { data } = $props();

	let openDialog = $state(false);
	const lastVisited = $derived(getLastVisitedInGroup(data.group.slug));

	function openReport(report: ProjectGroupDetail['reports'][number]) {
		void navigateToReportFromSummary(report);
	}
</script>

<svelte:head>
	<title>{data.group.title} · Project Group</title>
</svelte:head>

<div class="{ui.pageShell} {ui.pageStack}">
	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg border border-transparent hover:border-border-subtle self-start"
		onclick={() => goto('/')}
	>
		<ArrowLeftIcon class="size-4 text-muted-foreground" />
		Back to reports
	</button>

	<header class="space-y-3 px-1">
		<h1 class="text-2xl font-bold tracking-tight text-foreground">{data.group.title}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="secondary" class="bg-secondary/60 text-secondary-foreground">
				{data.group.reportCount} QA report{data.group.reportCount === 1 ? '' : 's'}
			</Badge>
			<Badge variant="outline" class="gap-1 border-border-subtle">
				<BugIcon class="size-3.5 text-muted-foreground" />
				{data.group.issueCount} total
			</Badge>
			{#if data.group.openCount > 0}
				<Badge variant="outline" class="gap-1 border-severity-high/20 bg-severity-high/6 text-severity-high">
					{data.group.openCount} open
				</Badge>
			{/if}
		</div>
		{#if data.group.issueCount > 0}
			<ProgressBar value={data.group.resolvedCount} max={data.group.issueCount} class="max-w-xs" />
		{/if}
	</header>

	<section class="space-y-3">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase px-1">
			Reports in this group
		</h2>
		{#if data.group.reports.length === 0}
			<Card class="overflow-hidden border border-border/60 bg-card/45 backdrop-blur-md shadow-sm">
				<div class="px-4 py-12 text-center text-sm text-muted-foreground">
					No reports in this group yet.
				</div>
			</Card>
		{:else}
			<div class="grid w-full {ui.gridLg} md:grid-cols-2 lg:grid-cols-3">
				{#each data.group.reports as report (report.slug)}
					<ReportCard
						{report}
						onclick={() => openReport(report)}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg border border-transparent hover:border-border-subtle self-start"
		onclick={() => (openDialog = true)}
	>
		<PlusIcon class="size-4 text-muted-foreground" />
		Add report to group
	</button>
</div>

<OpenReportDialog
	bind:open={openDialog}
	projects={[]}
	groups={[data.group]}
	mode="create"
	defaultGroupSlug={data.group.slug}
/>
