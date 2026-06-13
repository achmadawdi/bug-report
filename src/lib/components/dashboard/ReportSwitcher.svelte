<script lang="ts">
	import type { ReportSummary } from '$lib/server/store.js';
	import { navigateToReport } from '$lib/report-navigation.js';
	import { reportPath } from '$lib/routes.js';
	import { saveLastVisitedInGroup } from '$lib/groups.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { PROJECT_WORKFLOW_LABELS, PROJECT_WORKFLOW_STYLES } from '$lib/constants.js';
	import { preloadRoute } from '$lib/preload.js';
	import { cn } from '$lib/utils.js';
	import { ui } from '$lib/ui-layout.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { onMount } from 'svelte';

	let {
		groupSlug,
		currentSlug,
		reports
	}: {
		groupSlug: string;
		currentSlug: string;
		reports: ReportSummary[];
	} = $props();

	const currentIndex = $derived(reports.findIndex((r) => r.slug === currentSlug));

	function navigateTo(slug: string) {
		if (slug === currentSlug) return;
		saveLastVisitedInGroup(groupSlug, slug);
		const params = new URL(window.location.href).search;
		void navigateToReport(slug, { search: params });
	}

	function navigatePrev() {
		if (reports.length === 0) return;
		const prevIndex = currentIndex <= 0 ? reports.length - 1 : currentIndex - 1;
		navigateTo(reports[prevIndex].slug);
	}

	function navigateNext() {
		if (reports.length === 0) return;
		const nextIndex = currentIndex >= reports.length - 1 ? 0 : currentIndex + 1;
		navigateTo(reports[nextIndex].slug);
	}

	onMount(() => {
		saveLastVisitedInGroup(groupSlug, currentSlug);

		function onKeydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isTyping =
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA' ||
				target?.isContentEditable;

			if (isTyping) return;

			if (event.key === '[') {
				event.preventDefault();
				navigatePrev();
			} else if (event.key === ']') {
				event.preventDefault();
				navigateNext();
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<Card class="gap-0 border-border bg-card/25 py-0 shadow-sm backdrop-blur-md">
	<CardContent class="flex flex-col gap-2 p-3">
		<p class={ui.sectionTitle}>Related reports</p>

		<div class="flex items-center gap-2">
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
			{#each reports as report (report.slug)}
				<button
					type="button"
					class={cn(
						'inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
						report.slug === currentSlug
							? 'border-primary/40 bg-primary/10 text-foreground'
							: 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
					)}
					aria-current={report.slug === currentSlug ? 'page' : undefined}
					onclick={() => navigateTo(report.slug)}
					onpointerenter={() => preloadRoute(reportPath(report.slug))}
					onfocus={() => preloadRoute(reportPath(report.slug))}
				>
					<span class="truncate font-medium">{report.title}</span>
					{#if report.workflowStatus !== 'open'}
						<Badge
							variant="outline"
							class={cn(
								'shrink-0 px-1.5 py-0 text-[10px]',
								PROJECT_WORKFLOW_STYLES[report.workflowStatus]
							)}
						>
							{PROJECT_WORKFLOW_LABELS[report.workflowStatus]}
						</Badge>
					{/if}
					<Badge variant="secondary" class="shrink-0 px-1.5 py-0 text-[10px]">
						{report.issueCount}
					</Badge>
					{#if report.openCount > 0}
						<span class="shrink-0 text-[10px] text-muted-foreground">
							{report.openCount} open
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<Button
				size="icon-sm"
				variant="outline"
				class="size-8"
				aria-label="Previous report"
				onclick={navigatePrev}
			>
				<ChevronLeftIcon class="size-4" />
			</Button>
			<Button
				size="icon-sm"
				variant="outline"
				class="size-8"
				aria-label="Next report"
				onclick={navigateNext}
			>
				<ChevronRightIcon class="size-4" />
			</Button>
		</div>
		</div>
	</CardContent>
</Card>
