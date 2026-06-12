<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { Issue, ReportView } from '$lib/types.js';
	import {
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
	import SearchXIcon from '@lucide/svelte/icons/search-x';

	let { data, form } = $props();

	let filters = $state(parseFilters($page.url.searchParams));
	let selectedIssue = $state<Issue | null>(null);
	let detailOpen = $state(false);
	let addOpen = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);

	const report = $derived((form?.report as ReportView | undefined) ?? data.report);

	const filteredIssues = $derived(filterIssues(report.issues, filters));
	const severityCounts = $derived(report.summary.by_severity);
	const nextId = $derived(generateNextBugId(report.issues));

	let syncingUrl = $state(false);

	$effect(() => {
		if (form?.report && selectedIssue) {
			const updated = (form.report as ReportView).issues.find(
				(issue) => issue.id === selectedIssue?.id
			);
			if (updated) selectedIssue = structuredClone(updated);
		}
	});

	$effect(() => {
		if (syncingUrl) {
			syncingUrl = false;
			return;
		}

		const nextParams = filtersToSearchParams(filters).toString();
		const currentParams = $page.url.searchParams.toString();

		if (nextParams !== currentParams) {
			const url = nextParams ? `?${nextParams}` : '';
			goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		}
	});

	$effect(() => {
		const parsed = parseFilters($page.url.searchParams);
		const current = filtersToSearchParams(filters).toString();
		const incoming = filtersToSearchParams(parsed).toString();

		if (incoming !== current) {
			syncingUrl = true;
			filters = parsed;
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
		selectedIssue = structuredClone(issue);
		detailOpen = true;
	}

	function exportFilteredJson() {
		const payload = {
			exported_at: new Date().toISOString(),
			filters,
			issues: filteredIssues
		};

		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `gauntlet-qa-export-${new Date().toISOString().slice(0, 10)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function exportPdf() {
		const params = filtersToSearchParams(filters).toString();
		const url = params ? `/print?${params}` : '/print';
		window.open(url, '_blank');
	}

	function handleClearFilters() {
		filters = clearFilters();
	}
</script>

<svelte:head>
	<title>{report.report.title} · QA Dashboard</title>
</svelte:head>

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
	<ReportHeader report={report.report} />
	<MetadataGrid report={report.report} />

	<div class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
		<Sidebar {report} />

		<main class="space-y-4">
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
					<CardContent class="flex flex-col items-center gap-3 py-16 text-center">
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
				<section class="grid gap-3">
					{#each filteredIssues as issue (issue.id)}
						<BugCard {issue} onclick={() => openIssue(issue)} />
					{/each}
				</section>
			{/if}
		</main>
	</div>

	<footer class="border-t border-border pt-6 text-sm text-muted-foreground">
		<p>
			{report.report.source_file} · {report.summary.total_issues} total issues ·
			{report.summary.by_severity.Critical} critical · {report.summary.by_status.fixed} fixed
		</p>
	</footer>
</div>

<BugDetailSheet bind:issue={selectedIssue} bind:open={detailOpen} areas={data.areas} />
<AddBugDialog bind:open={addOpen} areas={data.areas} {nextId} />
