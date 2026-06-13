<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import type { Issue, ReportData, ReportView, FilterState, ReportWorkflowStatus } from '$lib/types.js';
	import {
		buildIssueSearchTextMap,
		clearFilters,
		filterIssues,
		filtersToSearchParams,
		isFiltersActive,
		parseFilters
	} from '$lib/filters.js';
	import { generateNextBugId } from '$lib/issues.js';
	import ReportHeader from '$lib/components/dashboard/ReportHeader.svelte';
	import GroupBreadcrumb from '$lib/components/dashboard/GroupBreadcrumb.svelte';
	import ReportSwitcher from '$lib/components/dashboard/ReportSwitcher.svelte';
	import MetadataGrid from '$lib/components/dashboard/MetadataGrid.svelte';
	import Sidebar from '$lib/components/dashboard/Sidebar.svelte';
	import Toolbar from '$lib/components/dashboard/Toolbar.svelte';
	import BugCard from '$lib/components/dashboard/BugCard.svelte';
	import BugDetailSheet from '$lib/components/dashboard/BugDetailSheet.svelte';
	import AddBugDialog from '$lib/components/dashboard/AddBugDialog.svelte';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
	import {
		isNavigatingToHome,
		isNavigatingToReport
	} from '$lib/navigation-loading.js';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';
	import HomePageSkeleton from '$lib/components/skeletons/HomePageSkeleton.svelte';
	import { isResolvedStatus } from '$lib/constants.js';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import { reportPath, reportPrintPath } from '$lib/routes.js';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let filters = $state(structuredClone(data.initialFilters));
	let selectedIssue = $state<Issue | null>(null);
	let detailOpen = $state(false);
	let addOpen = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);

	const report = $derived((form?.report as ReportView | undefined) ?? data.report);
	const reportSlug = $derived(data.reportSlug);
	const issueSearchTextMap = $derived(buildIssueSearchTextMap(report.issues));

	const filteredIssues = $derived(filterIssues(report.issues, filters, issueSearchTextMap));
	const severityCounts = $derived(report.summary.by_severity);
	const groupContext = $derived(data.groupContext);
	const hasGroup = $derived(Boolean(groupContext?.group));
	const workflowStatus = $derived(
		(form?.workflowStatus as ReportWorkflowStatus | undefined) ?? data.workflowStatus
	);

	let urlSyncTimer: ReturnType<typeof setTimeout> | undefined;

	const showHomeSkeleton = $derived(isNavigatingToHome());
	const showDashboardSkeleton = $derived(isNavigatingToReport());
	const showLoadingSkeleton = $derived(showHomeSkeleton || showDashboardSkeleton);

	$effect(() => {
		const reportFromForm = form?.report as ReportView | undefined;
		if (!reportFromForm) return;

		untrack(() => {
			if (!selectedIssue) return;
			const updated = reportFromForm.issues.find((issue) => issue.id === selectedIssue!.id);
			if (updated) selectedIssue = structuredClone(updated);
		});
	});

	$effect(() => {
		const nextParams = filtersToSearchParams(filters).toString();

		clearTimeout(urlSyncTimer);
		urlSyncTimer = setTimeout(() => {
			const currentParams = new URL(window.location.href).searchParams.toString();
			if (nextParams !== currentParams) {
				const query = nextParams ? `?${nextParams}` : '';
				replaceState(`${reportPath(reportSlug)}${query}`, {});
			}
		}, 250);

		return () => clearTimeout(urlSyncTimer);
	});

	afterNavigate(({ to, type }) => {
		if (type === 'popstate' && to?.url) {
			filters = parseFilters(to.url.searchParams, data.areas);
		}
	});

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isTyping =
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA' ||
				target?.isContentEditable;

			if (event.key === '/' && !isTyping) {
				event.preventDefault();
				searchInput?.focus();
			}

			if (event.key === 'Escape' && document.activeElement === searchInput) {
				filters.search = '';
				searchInput?.blur();
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	function openIssue(issue: Issue) {
		toast.dismiss();
		selectedIssue = structuredClone(issue);
		detailOpen = true;
	}

	function exportFilteredJson() {
		const { summary: _summary, ...reportData }: ReportView = report;
		const payload = {
			...reportData,
			issues: filteredIssues,
			report_slug: reportSlug,
			exported_at: new Date().toISOString(),
			...(isFiltersActive(filters) ? { filters } : {})
		};

		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${reportSlug}-qa-export-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function exportPdf() {
		const params = filtersToSearchParams(filters).toString();
		window.open(reportPrintPath(reportSlug, params), '_blank');
	}

	const nextId = $derived(generateNextBugId(report.issues));

	function setView(view: FilterState['view']) {
		filters = { ...filters, view };
	}
	function handleClearFilters() {
		filters = clearFilters();
	}
</script>

<svelte:head>
	<title>{report.report.title} · QA Dashboard</title>
</svelte:head>

{#if showLoadingSkeleton}
	{#if showHomeSkeleton}
		<HomePageSkeleton />
	{:else}
		<DashboardPageSkeleton />
	{/if}
{:else}
<div class="{ui.pageShell} {ui.pageStack}">
	{#if hasGroup && groupContext?.group}
		<GroupBreadcrumb group={groupContext.group} currentTitle={report.report.title} />
		<ReportSwitcher
			groupSlug={groupContext.group.slug}
			currentSlug={reportSlug}
			reports={groupContext.siblingReports}
		/>
	{/if}

	<ReportHeader report={report.report} />
	<MetadataGrid
		report={report.report}
		testing_session={report.testing_session}
		groups={data.groups}
		currentGroupSlug={groupContext?.group?.slug ?? null}
		currentReportSlug={reportSlug}
		relatedReports={groupContext?.siblingReports ?? []}
		{workflowStatus}
		onExportJson={exportFilteredJson}
		onExportPdf={exportPdf}
	/>

	<div class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
		<Sidebar {report} onViewChange={setView} currentView={filters.view} />

		<main class="flex flex-col gap-4">
			<Toolbar
				bind:filters
				bind:searchInput
				areas={data.areas}
				{severityCounts}
				filteredCount={filteredIssues.length}
				totalCount={report.issues.length}
				onExportJson={exportFilteredJson}
				onExportPdf={exportPdf}
				onAdd={() => (addOpen = true)}
				onClearFilters={handleClearFilters}
			/>

			{#if filteredIssues.length === 0}
				<Card class="border-dashed border-border bg-card/50">
					<CardContent class="flex flex-col items-center gap-4 py-12 text-center">
						<SearchXIcon class="size-10 text-muted-foreground" />
						<div>
							<p class="font-semibold">No bugs match your filters</p>
							<p class="text-sm text-muted-foreground">
								Try clearing search or changing severity, area, or view filters.
							</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<section class="grid {ui.grid}">
					{#each filteredIssues as issue (issue.id)}
						<div class={isResolvedStatus(issue.status) && filters.view === 'all'
							? 'opacity-60'
							: ''}>
							<BugCard {issue} onclick={() => openIssue(issue)} />
						</div>
					{/each}
				</section>
			{/if}
		</main>
	</div>

	<footer class="border-t border-border pt-4 text-sm text-muted-foreground">
		<p>
			{#if report.report.source_file}{report.report.source_file} · {/if}{report.summary.total_issues} total ·
			{report.summary.by_status.fixed + report.summary.by_status.wont_fix} resolved ·
			{report.summary.by_status.open + report.summary.by_status.in_progress} open ·
			{report.summary.by_severity.Critical} critical
		</p>
	</footer>
</div>
{/if}

<BugDetailSheet bind:issue={selectedIssue} bind:open={detailOpen} areas={data.areas} />
<AddBugDialog bind:open={addOpen} areas={data.areas} {nextId} />
