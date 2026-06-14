<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { onMount, setContext, untrack } from 'svelte';
	import type { Issue, ReportView, FilterState, ReportWorkflowStatus } from '$lib/types.js';
	import type { ActionData, PageData } from '../../../routes/report/[report]/$types.js';
	import {
		buildIssueSearchTextMap,
		clearFilters,
		clearSearchFilter,
		filterIssues,
		filtersToSearchParams,
		isFiltersActive,
		parseFilters
	} from '$lib/filters.js';
	import { generateNextBugId } from '$lib/issues.js';
	import { getReportSession, saveReportSession } from '$lib/report-session.js';
	import {
		getNavigationRevision,
		subscribeNavigationSlug
	} from '$lib/report-navigation.js';
	import { parseReportSlug } from '$lib/routes.js';
	import { REPORT_SLUG_KEY } from '$lib/report-forms.js';
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
	import { isResolvedStatus } from '$lib/constants.js';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import { reportPath, reportPrintPath } from '$lib/routes.js';
	import { toast } from 'svelte-sonner';

	function cloneFilters(state: FilterState): FilterState {
		return {
			search: state.search,
			severity: state.severity,
			area: state.area,
			status: state.status,
			sort: state.sort,
			view: state.view
		};
	}

	function cloneIssue(issue: Issue): Issue {
		return JSON.parse(JSON.stringify(issue)) as Issue;
	}

	let {
		data,
		form = null,
		active = true
	}: {
		data: PageData;
		form?: ActionData | null;
		active?: boolean;
	} = $props();

	const EMPTY_ISSUE_SEARCH_MAP = new Map<string, string>();

	function getInitialPaneSlug(): string {
		return data.reportSlug;
	}

	function getInitialFilters(): FilterState {
		return cloneFilters(data.initialFilters);
	}

	const paneSlug = getInitialPaneSlug();
	let filters = $state(getInitialFilters());
	let selectedIssue = $state<Issue | null>(null);
	let detailOpen = $state(false);
	let addOpen = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);
	let skipUrlSyncOnce = false;
	let navRevision = $state(0);

	setContext(REPORT_SLUG_KEY, paneSlug);

	const report = $derived((form?.report as ReportView | undefined) ?? data.report);
	const reportSlug = $derived(data.reportSlug);
	const issueSearchTextMap = $derived.by(() => {
		if (!active) return EMPTY_ISSUE_SEARCH_MAP;
		return buildIssueSearchTextMap(report.issues);
	});

	const filteredIssues = $derived.by(() => {
		if (!active) return [];
		return filterIssues(report.issues, filters, issueSearchTextMap);
	});
	const severityCounts = $derived(report.summary.by_severity);
	const groupContext = $derived(data.groupContext);
	const hasGroup = $derived(Boolean(groupContext?.group));
	const workflowStatus = $derived(
		(form?.workflowStatus as ReportWorkflowStatus | undefined) ?? data.workflowStatus
	);
	const workflowNote = $derived(
		(form?.workflowNote as string | null | undefined) ?? data.workflowNote ?? null
	);

	let urlSyncTimer: ReturnType<typeof setTimeout> | undefined;
	let wasActive = false;

	function syncFiltersFromUrl(): void {
		if (parseReportSlug(window.location.pathname) !== reportSlug) return;
		filters = parseFilters(new URL(window.location.href).searchParams, data.areas);
	}

	function syncFiltersToUrlNow(nextFilters: FilterState = filters): void {
		clearTimeout(urlSyncTimer);
		skipUrlSyncOnce = true;

		const nextParams = filtersToSearchParams(nextFilters).toString();
		const currentParams = new URL(window.location.href).searchParams.toString();
		if (nextParams !== currentParams) {
			const query = nextParams ? `?${nextParams}` : '';
			replaceState(`${reportPath(reportSlug)}${query}`, {});
		}
	}

	function clearSearch(): void {
		if (!filters.search.trim()) {
			searchInput?.blur();
			return;
		}

		const nextFilters = clearSearchFilter(filters);
		filters = nextFilters;
		syncFiltersToUrlNow(nextFilters);
		searchInput?.blur();
	}

	$effect(() => {
		const unsubscribe = subscribeNavigationSlug(() => {
			navRevision += 1;
		});
		return unsubscribe;
	});

	$effect(() => {
		if (!active) return;
		getNavigationRevision() + navRevision;
		syncFiltersFromUrl();
	});

	$effect(() => {
		const isActive = active;

		if (wasActive && !isActive) {
			untrack(() => {
				saveReportSession(reportSlug, {
					scrollY: window.scrollY,
					selectedIssueId: selectedIssue?.id ?? null,
					detailOpen
				});
			});
		}

		if (!wasActive && isActive) {
			syncFiltersFromUrl();
			skipUrlSyncOnce = true;

			const session = getReportSession(reportSlug);
			if (session) {
				detailOpen = session.detailOpen;
				if (session.selectedIssueId) {
					const issue = untrack(() => report.issues).find(
						(item) => item.id === session.selectedIssueId
					);
					selectedIssue = issue ? cloneIssue(issue) : null;
				}
				const scrollY = session.scrollY;
				requestAnimationFrame(() => {
					window.scrollTo({ top: scrollY, behavior: 'auto' });
				});
			}
		}

		wasActive = isActive;
	});

	$effect(() => {
		if (!active) return;

		const reportFromForm = form?.report as ReportView | undefined;
		if (!reportFromForm) return;

		untrack(() => {
			if (!selectedIssue) return;
			const updated = reportFromForm.issues.find((issue) => issue.id === selectedIssue!.id);
			if (updated) selectedIssue = cloneIssue(updated);
		});
	});

	$effect(() => {
		if (!active) return;

		const nextParams = filtersToSearchParams(filters).toString();

		clearTimeout(urlSyncTimer);
		const delay = filters.search.trim() ? 250 : 0;
		urlSyncTimer = setTimeout(() => {
			if (skipUrlSyncOnce) {
				skipUrlSyncOnce = false;
				return;
			}
			const currentParams = new URL(window.location.href).searchParams.toString();
			if (nextParams !== currentParams) {
				const query = nextParams ? `?${nextParams}` : '';
				replaceState(`${reportPath(reportSlug)}${query}`, {});
			}
		}, delay);

		return () => clearTimeout(urlSyncTimer);
	});

	afterNavigate(({ to, type }) => {
		if (!active) return;
		if (type === 'popstate' && to?.url) {
			filters = parseFilters(to.url.searchParams, data.areas);
		}
	});

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!active) return;

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
				clearSearch();
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	function openIssue(issue: Issue) {
		toast.dismiss();
		selectedIssue = cloneIssue(issue);
		detailOpen = true;
	}

	function handleIssueDeleted(id: string) {
		if (selectedIssue?.id === id) {
			selectedIssue = null;
			detailOpen = false;
		}
	}

	function exportFilteredJson() {
		const { summary: _summary, ...reportData }: ReportView = report;
		const exportFilters = {
			...filters,
			view: 'all' as const,
			status: 'all' as const
		};
		const issuesForExport = filterIssues(report.issues, exportFilters, issueSearchTextMap);
		const payload = {
			...reportData,
			issues: issuesForExport,
			report_slug: reportSlug,
			exported_at: new Date().toISOString(),
			...(isFiltersActive(exportFilters) ? { filters: exportFilters } : {})
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
		const exportFilters = {
			...filters,
			view: 'all' as const,
			status: 'all' as const
		};
		const params = filtersToSearchParams(exportFilters).toString();
		window.open(reportPrintPath(reportSlug, params), '_blank');
	}

	const nextId = $derived(generateNextBugId(report.issues));

	function setView(view: FilterState['view']) {
		filters = { ...filters, view };
	}

	function handleClearFilters() {
		filters = clearFilters();
		syncFiltersToUrlNow(filters);
	}
</script>

<svelte:head>
	{#if active}
		<title>{report.report.title} · QA Dashboard</title>
	{/if}
</svelte:head>

<div class="{ui.pageShell} {ui.pageStack}">
	{#if hasGroup && groupContext?.group}
		<GroupBreadcrumb group={groupContext.group} currentTitle={report.report.title} />
		<ReportSwitcher
			groupSlug={groupContext.group.slug}
			currentSlug={reportSlug}
			reports={groupContext.siblingReports}
		/>
	{/if}

	<Card class="gap-0 overflow-hidden border-border bg-card/25 py-0 shadow-sm backdrop-blur-md">
		<CardContent class="flex flex-col gap-0 p-0">
			<div class="px-4 py-4 md:px-6 md:py-6">
				<ReportHeader report={report.report} />
			</div>

			<MetadataGrid
				embedded
				report={report.report}
				testing_session={report.testing_session}
				groups={data.groups}
				currentGroupSlug={groupContext?.group?.slug ?? null}
				{workflowStatus}
				{workflowNote}
				issueCount={report.issues.length}
				onExportJson={exportFilteredJson}
				onExportPdf={exportPdf}
			/>

			<div
				class="grid gap-4 border-t border-border/60 px-3 py-3 md:px-6 md:py-4 md:pb-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6"
			>
				<Sidebar {report} onViewChange={setView} currentView={filters.view} />

				<main class="order-1 flex min-w-0 flex-col gap-3 md:gap-4 xl:order-none">
					{#if active}
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
							onClearSearch={clearSearch}
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
									<div
										class={isResolvedStatus(issue.status) && filters.view === 'all'
											? 'opacity-60'
											: ''}
									>
										<BugCard
											{issue}
											onclick={() => openIssue(issue)}
											onDeleted={handleIssueDeleted}
										/>
									</div>
								{/each}
							</section>
						{/if}
					{/if}
				</main>
			</div>
		</CardContent>
	</Card>

	<footer class="border-t border-border pt-4 text-sm text-muted-foreground">
		<p>
			{#if report.report.source_file}{report.report.source_file} · {/if}{report.summary.total_issues} total ·
			{report.summary.by_status.fixed + report.summary.by_status.wont_fix} resolved ·
			{report.summary.by_status.open + report.summary.by_status.in_progress} open ·
			{report.summary.by_severity.Critical} critical
		</p>
	</footer>
</div>

<BugDetailSheet bind:issue={selectedIssue} bind:open={detailOpen} areas={data.areas} />
<AddBugDialog bind:open={addOpen} areas={data.areas} {nextId} />
