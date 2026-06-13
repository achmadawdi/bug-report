<script lang="ts">
	import type { ReportSummary } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import OpenReportDialog from '$lib/components/tabs/OpenReportDialog.svelte';
	import ReportCard from '$lib/components/tabs/ReportCard.svelte';
	import ProjectGroupCard from '$lib/components/tabs/ProjectGroupCard.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { ui } from '$lib/ui-layout.js';
	import { isNavigatingToReport } from '$lib/navigation-loading.js';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';

	let { data } = $props();

	let openDialog = $state(false);
	let dialogMode = $state<'all' | 'create'>('all');
	let defaultGroupSlug = $state('');

	const showLoadingSkeleton = $derived(isNavigatingToReport());

	function openReport(report: ReportSummary) {
		const tabs = upsertTab(loadOpenTabs(), {
			slug: report.slug,
			title: report.title
		});
		saveOpenTabs(tabs);
		goto(reportPath(report.slug));
	}

	function openCreateDialog(groupSlug = '') {
		defaultGroupSlug = groupSlug;
		dialogMode = 'create';
		openDialog = true;
	}
</script>

<svelte:head>
	<title>QA Bug Report Dashboard</title>
</svelte:head>

{#if showLoadingSkeleton}
	<DashboardPageSkeleton />
{:else}
	<div class="{ui.pageShellNarrow} min-h-[calc(100vh-2.5rem)] {ui.pageStack}">
		<div class="{ui.field} text-center">
			<h1 class="text-2xl font-bold tracking-tight">No report open</h1>
			<p class="text-sm text-muted-foreground">
				Open a bug report below or pick up where you left off.
			</p>
		</div>

		<div class="grid w-full {ui.gridLg} sm:grid-cols-2">
			{#each data.groups as group (group.slug)}
				<ProjectGroupCard
					{group}
					class="sm:col-span-2"
					onOpenReport={openReport}
					onCreateReport={() => openCreateDialog(group.slug)}
				/>
			{/each}

			{#each data.projects as report (report.slug)}
				<ReportCard {report} onclick={() => openReport(report)} />
			{/each}

			<button type="button" class="group/new-btn text-left" onclick={() => openCreateDialog()}>
				<Card
					class="flex h-full min-h-[131px] items-center justify-center border-dashed border-border-strong/30 bg-card/25 transition-all duration-200 hover:border-primary/40 hover:bg-card-hover hover:shadow-sm backdrop-blur-md"
				>
					<CardContent
						class="flex flex-col items-center {ui.gridLg} {ui.cardPadding} text-muted-foreground"
					>
						<div
							class="flex size-10 items-center justify-center rounded-lg border border-dashed border-border-strong/40 bg-secondary/20 text-muted-foreground group-hover/new-btn:border-primary-muted/40 group-hover/new-btn:bg-primary-surface/25 group-hover/new-btn:text-primary transition-all duration-200"
						>
							<PlusIcon class="size-5" />
						</div>
						<p class="text-sm font-medium text-muted-foreground group-hover/new-btn:text-foreground transition-colors">New report</p>
					</CardContent>
				</Card>
			</button>
		</div>
	</div>
{/if}

<OpenReportDialog
	bind:open={openDialog}
	projects={data.projects}
	groups={data.groups}
	mode={dialogMode}
	{defaultGroupSlug}
/>
