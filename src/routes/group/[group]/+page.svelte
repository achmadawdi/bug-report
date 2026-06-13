<script lang="ts">
	import type { ProjectGroupDetail } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { Card } from '$lib/components/ui/card/index.js';
	import ReportRow from '$lib/components/tabs/ReportRow.svelte';
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
		const tabs = upsertTab(loadOpenTabs(), {
			slug: report.slug,
			title: report.title
		});
		saveOpenTabs(tabs);
		goto(reportPath(report.slug));
	}
</script>

<svelte:head>
	<title>{data.group.title} · Project Group</title>
</svelte:head>

<div class="{ui.pageShellNarrow} {ui.pageStack}">
	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
		onclick={() => goto('/')}
	>
		<ArrowLeftIcon class="size-4" />
		Back to reports
	</button>

	<header class="space-y-3">
		<h1 class="text-2xl font-bold tracking-tight">{data.group.title}</h1>
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="secondary">
				{data.group.reportCount} QA report{data.group.reportCount === 1 ? '' : 's'}
			</Badge>
			<Badge variant="outline" class="gap-1">
				<BugIcon />
				{data.group.issueCount} total
			</Badge>
			{#if data.group.openCount > 0}
				<Badge variant="outline">{data.group.openCount} open</Badge>
			{/if}
		</div>
		{#if data.group.issueCount > 0}
			<ProgressBar value={data.group.resolvedCount} max={data.group.issueCount} class="max-w-xs" />
		{/if}
	</header>

	<section class="space-y-3">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			Reports in this group
		</h2>
		<Card class="overflow-hidden">
			{#if data.group.reports.length === 0}
				<div class="px-4 py-12 text-center text-sm text-muted-foreground">
					No reports in this group yet.
				</div>
			{:else}
				<ul class="divide-y divide-border">
					{#each data.group.reports as report (report.slug)}
						<li>
							<ReportRow
								{report}
								highlighted={lastVisited === report.slug}
								onclick={() => openReport(report)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>

		<button
			type="button"
			class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
			onclick={() => (openDialog = true)}
		>
			<PlusIcon class="size-4" />
			Add report to group
		</button>
	</section>
</div>

<OpenReportDialog
	bind:open={openDialog}
	projects={[]}
	groups={[data.group]}
	mode="create"
	defaultGroupSlug={data.group.slug}
/>
