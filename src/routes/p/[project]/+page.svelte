<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import type { Issue, ReportData, ReportView } from '$lib/types.js';
	import {
		buildIssueSearchTextMap,
		clearFilters,
		filterIssues,
		filtersToSearchParams,
		parseFilters
	} from '$lib/filters.js';
	import { generateNextBugId } from '$lib/issues.js';
	import ReportHeader from '$lib/components/dashboard/ReportHeader.svelte';
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
		isNavigatingToProject
	} from '$lib/navigation-loading.js';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';
	import HomePageSkeleton from '$lib/components/skeletons/HomePageSkeleton.svelte';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let filters = $state(structuredClone(data.initialFilters));
	let selectedIssue = $state<Issue | null>(null);
	let detailOpen = $state(false);
	let addOpen = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);

	const report = $derived((form?.report as ReportView | undefined) ?? data.report);
	const project = $derived(data.project);
	const issueSearchTextMap = $derived(buildIssueSearchTextMap(report.issues));

	const filteredIssues = $derived(filterIssues(report.issues, filters, issueSearchTextMap));
	const severityCounts = $derived(report.summary.by_severity);
	const nextId = $derived(generateNextBugId(report.issues));

	let urlSyncTimer: ReturnType<typeof setTimeout> | undefined;

	const showHomeSkeleton = $derived(isNavigatingToHome());
	const showDashboardSkeleton = $derived(isNavigatingToProject());
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
				replaceState(`/p/${project}${query}`, {});
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
		const payload: ReportData = {
			...reportData,
			issues: filteredIssues
		};

		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${project}-qa-export-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function exportPdf() {
		const params = filtersToSearchParams(filters).toString();
		const url = params ? `/p/${project}/print?${params}` : `/p/${project}/print`;
		window.open(url, '_blank');
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
	<ReportHeader report={report.report} />
	<MetadataGrid report={report.report} />

	<div class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
		<Sidebar {report} />

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
								Try clearing search or changing severity, area, or status filters.
							</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<section class="grid {ui.grid}">
					{#each filteredIssues as issue (issue.id)}
						<BugCard {issue} onclick={() => openIssue(issue)} />
					{/each}
				</section>
			{/if}
		</main>
	</div>

	<footer class="border-t border-border pt-4 text-sm text-muted-foreground">
		<p>
			{report.report.source_file} · {report.summary.total_issues} total issues ·
			{report.summary.by_severity.Critical} critical · {report.summary.by_status.fixed} fixed
		</p>
	</footer>
</div>
{/if}

<BugDetailSheet bind:issue={selectedIssue} bind:open={detailOpen} areas={data.areas} />
<AddBugDialog bind:open={addOpen} areas={data.areas} {nextId} />
