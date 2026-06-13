<script lang="ts">
	import type { ReportSummary, ProjectGroupDetail } from '$lib/server/store.js';
	import type { ReportWorkflowStatus } from '$lib/types.js';
	import { goto } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import OpenReportDialog from '$lib/components/tabs/OpenReportDialog.svelte';
	import ReportCard from '$lib/components/tabs/ReportCard.svelte';
	import ProjectGroupCard from '$lib/components/tabs/ProjectGroupCard.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import FolderKanbanIcon from '@lucide/svelte/icons/folder-kanban';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import { PROJECT_WORKFLOW_LABELS } from '$lib/constants.js';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import { isNavigatingToReport } from '$lib/navigation-loading.js';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';

	let { data } = $props();

	let openDialog = $state(false);
	let dialogMode = $state<'all' | 'create'>('all');
	let defaultGroupSlug = $state('');
	let searchQuery = $state('');
	let workflowFilter = $state<'all' | ReportWorkflowStatus>('all');

	const showLoadingSkeleton = $derived(isNavigatingToReport());

	const WORKFLOW_FILTERS = [
		{ value: 'all' as const, label: 'All' },
		{ value: 'open' as const, label: PROJECT_WORKFLOW_LABELS.open },
		{ value: 'resolved' as const, label: PROJECT_WORKFLOW_LABELS.resolved },
		{ value: 'postponed' as const, label: PROJECT_WORKFLOW_LABELS.postponed }
	];

	function reportMatchesSearch(report: ReportSummary, query: string): boolean {
		const needle = query.trim().toLowerCase();
		if (!needle) return true;

		return [report.title, report.slug, report.platform, report.version, report.groupTitle]
			.filter((value): value is string => Boolean(value?.trim()))
			.some((value) => value.toLowerCase().includes(needle));
	}

	function groupMatchesSearch(group: ProjectGroupDetail, query: string): boolean {
		const needle = query.trim().toLowerCase();
		if (!needle) return true;

		return (
			group.title.toLowerCase().includes(needle) || group.slug.toLowerCase().includes(needle)
		);
	}

	function reportMatchesWorkflow(report: ReportSummary): boolean {
		return workflowFilter === 'all' || report.workflowStatus === workflowFilter;
	}

	const filteredStandalone = $derived(
		data.projects.filter(
			(report) => reportMatchesSearch(report, searchQuery) && reportMatchesWorkflow(report)
		)
	);

	const filteredGroups = $derived(
		data.groups
			.map((group) => {
				const nameMatches = groupMatchesSearch(group, searchQuery);
				const reports = group.reports.filter(
					(report) =>
						reportMatchesWorkflow(report) &&
						(nameMatches || reportMatchesSearch(report, searchQuery))
				);
				return { ...group, reports };
			})
			.filter((group) => {
				if (!searchQuery.trim() && workflowFilter === 'all') return true;
				return groupMatchesSearch(group, searchQuery) || group.reports.length > 0;
			})
	);

	const filtersActive = $derived(
		searchQuery.trim().length > 0 || workflowFilter !== 'all'
	);

	const visibleReportCount = $derived(
		filteredStandalone.length +
			filteredGroups.reduce((count, group) => count + group.reports.length, 0)
	);

	const hasVisibleReports = $derived(visibleReportCount > 0);

	const workflowFilterLabel = $derived(
		WORKFLOW_FILTERS.find((option) => option.value === workflowFilter)?.label ?? 'All'
	);

	const groupsOnlyLayout = $derived(filteredStandalone.length === 0);

	function clearFilters() {
		searchQuery = '';
		workflowFilter = 'all';
	}

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
	<div class="{ui.pageShell} min-h-[calc(100vh-2.5rem)] {ui.pageStack}">
		<div class="space-y-4 py-4 sm:py-6">
			<div class="text-center">
				<h1
					class="flex items-center justify-center gap-2.5 text-2xl font-bold tracking-tight text-foreground/90 sm:text-3xl"
				>
					<FolderKanbanIcon
						class="size-6 shrink-0 text-primary-muted sm:size-7"
						aria-hidden="true"
					/>
					No report open
				</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					Open a bug report below or pick up where you left off.
				</p>
			</div>

			<div class="mx-auto flex w-full max-w-2xl items-center gap-2">
				<div class="relative min-w-0 flex-1">
					<SearchIcon
						class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70"
					/>
					<Input
						class="h-10 bg-background/40 border-border-subtle pl-9 pr-9 text-sm focus-visible:ring-primary-muted/30 focus-visible:border-primary/40"
						placeholder="Search reports…"
						bind:value={searchQuery}
					/>
					{#if searchQuery.trim()}
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							class="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
							aria-label="Clear search"
							onclick={() => (searchQuery = '')}
						>
							<XIcon class="size-3.5" />
						</Button>
					{/if}
				</div>

				<Select
					type="single"
					value={workflowFilter}
					onValueChange={(value) => {
						if (value) workflowFilter = value as typeof workflowFilter;
					}}
				>
					<SelectTrigger
						class="h-10 data-[size=default]:h-10 w-auto shrink-0 py-0 border-border-subtle bg-background/40 px-3 text-xs"
						aria-label="Filter by status"
					>
						{workflowFilterLabel}
					</SelectTrigger>
					<SelectContent>
						{#each WORKFLOW_FILTERS as option}
							<SelectItem value={option.value} class="text-xs">
								{option.label}
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>

				{#if filtersActive}
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						class="size-10 shrink-0 border-border-subtle bg-background/40 text-muted-foreground hover:bg-background/60"
						aria-label="Clear filters"
						onclick={clearFilters}
					>
						<XIcon class="size-4" />
					</Button>
				{/if}
			</div>
		</div>

		{#if filtersActive && !hasVisibleReports}
			<div
				class="rounded-xl border border-dashed border-border-subtle bg-card/25 px-4 py-10 text-center text-sm text-muted-foreground"
			>
				No reports match your search.
			</div>
		{/if}

		<div
			class={cn(
				'grid w-full',
				ui.gridLg,
				groupsOnlyLayout ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'
			)}
		>
			{#each filteredGroups as group (group.slug)}
				<ProjectGroupCard
					{group}
					class={groupsOnlyLayout ? '' : 'md:col-span-2 lg:col-span-3'}
					onOpenReport={openReport}
					onCreateReport={() => openCreateDialog(group.slug)}
					{groupsOnlyLayout}
				/>
			{/each}

			{#each filteredStandalone as report (report.slug)}
				<ReportCard {report} onclick={() => openReport(report)} />
			{/each}

			{#if !filtersActive}
				<button
					type="button"
					class={cn(
						'group/new-btn w-full text-left',
						groupsOnlyLayout ? 'col-span-1' : 'h-full'
					)}
					onclick={() => openCreateDialog()}
				>
					<Card
						class="flex h-full items-center justify-center border-dashed border-border-strong/30 bg-card/25 transition-all duration-200 hover:border-primary/40 hover:bg-card-hover hover:shadow-sm backdrop-blur-md"
					>
						<CardContent
							class="flex flex-col items-center {ui.gridLg} {ui.cardPadding} text-muted-foreground"
						>
							<div
								class="flex size-10 items-center justify-center rounded-lg border border-dashed border-border-strong/40 bg-secondary/20 text-muted-foreground group-hover/new-btn:border-primary-muted/40 group-hover/new-btn:bg-primary-surface/25 group-hover/new-btn:text-primary transition-all duration-200"
							>
								<PlusIcon class="size-5" />
							</div>
							<p
								class="text-sm font-medium text-muted-foreground group-hover/new-btn:text-foreground transition-colors"
							>
								New report
							</p>
						</CardContent>
					</Card>
				</button>
			{/if}
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
