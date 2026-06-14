<script lang="ts">
	import type { ProjectGroupDetail, ReportSummary } from '$lib/server/store.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigateToReportFromSummary } from '$lib/report-navigation.js';
	import { deserialize } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { Card } from '$lib/components/ui/card/index.js';
	import ReportCard from '$lib/components/tabs/ReportCard.svelte';
	import OpenReportDialog from '$lib/components/tabs/OpenReportDialog.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { cleanupDeletedReport } from '$lib/delete-cleanup.js';
	import { clearLastVisitedForGroup, getLastVisitedInGroup } from '$lib/groups.js';
	import { ui } from '$lib/ui-layout.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import BugIcon from '@lucide/svelte/icons/bug';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { fly } from 'svelte/transition';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	let openDialog = $state(false);
	let groupDeleteOpen = $state(false);
	let groupDeleteLoading = $state(false);
	let pendingReportDelete = $state<ReportSummary | null>(null);
	let reportDeleteOpen = $state(false);
	let reportDeleteLoading = $state(false);
	const lastVisited = $derived(getLastVisitedInGroup(data.group.slug));

	function openReport(report: ProjectGroupDetail['reports'][number]) {
		void navigateToReportFromSummary(report);
	}

	async function submitReportDelete(slug: string) {
		const formData = new FormData();
		formData.set('slug', slug);

		const response = await fetch('/reports?/deleteReport', { method: 'POST', body: formData });
		const result = deserialize(await response.text());

		if (result.type === 'failure') {
			throw new Error((result.data as { message?: string })?.message ?? 'Request failed');
		}

		if (result.type === 'error') {
			throw new Error('An unexpected error occurred');
		}
	}

	async function confirmDeleteGroup() {
		groupDeleteLoading = true;
		try {
			const response = await fetch('?/deleteGroup', { method: 'POST', body: new FormData() });
			const result = deserialize(await response.text());

			if (result.type === 'failure') {
				throw new Error((result.data as { message?: string })?.message ?? 'Request failed');
			}

			if (result.type === 'error') {
				throw new Error('An unexpected error occurred');
			}

			clearLastVisitedForGroup(data.group.slug);
			groupDeleteOpen = false;
			toast.success(`Deleted group "${data.group.title}".`);
			await goto('/');
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete group');
		} finally {
			groupDeleteLoading = false;
		}
	}

	async function confirmDeleteReport() {
		const report = pendingReportDelete;
		if (!report) return;

		reportDeleteLoading = true;
		try {
			await submitReportDelete(report.slug);
			await cleanupDeletedReport(report.slug);
			reportDeleteOpen = false;
			pendingReportDelete = null;
			await invalidateAll();
			toast.success(`Deleted report "${report.title}".`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete report');
		} finally {
			reportDeleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.group.title} · Project Group</title>
</svelte:head>

<div
	in:fly={{ y: 8, duration: 180, delay: 40 }}
	out:fly={{ y: -6, duration: 120 }}
	class="{ui.pageShell} {ui.pageStack}"
>
	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg border border-transparent hover:border-border-subtle self-start"
		onclick={() => goto('/')}
	>
		<ArrowLeftIcon class="size-4 text-muted-foreground" />
		Back to reports
	</button>

	<header class="space-y-3 px-1">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<h1 class="text-2xl font-bold tracking-tight text-foreground">{data.group.title}</h1>
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={() => (groupDeleteOpen = true)}
			>
				<Trash2Icon class="size-3.5" />
				Delete group
			</Button>
		</div>
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
						onDelete={(item) => {
							pendingReportDelete = item;
							reportDeleteOpen = true;
						}}
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

<ConfirmDeleteDialog
	bind:open={groupDeleteOpen}
	title="Delete group"
	description={`Delete "${data.group.title}"? Reports in this group (${data.group.reportCount}) will become standalone. Reports and issues are not deleted.`}
	loading={groupDeleteLoading}
	onConfirm={confirmDeleteGroup}
	onCancel={() => {
		groupDeleteOpen = false;
	}}
/>

<ConfirmDeleteDialog
	bind:open={reportDeleteOpen}
	title="Delete report"
	description={pendingReportDelete
		? `Delete "${pendingReportDelete.title}"? This permanently removes ${pendingReportDelete.issueCount} issues and all evidence files. This cannot be undone.`
		: ''}
	loading={reportDeleteLoading}
	onConfirm={confirmDeleteReport}
	onCancel={() => {
		pendingReportDelete = null;
	}}
/>
