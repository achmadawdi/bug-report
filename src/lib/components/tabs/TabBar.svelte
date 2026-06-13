<script lang="ts">
	import { goto } from '$app/navigation';
	import { parseReportSlug, reportPath } from '$lib/routes.js';
	import { preloadRoute } from '$lib/preload.js';
	import { page } from '$app/stores';
	import type { ProjectGroupSummary, ReportSummary } from '$lib/server/store.js';
	import {
		loadOpenTabs,
		removeTab,
		saveOpenTabs,
		upsertTab,
		type OpenTab
	} from '$lib/tabs.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import OpenReportDialog from './OpenReportDialog.svelte';
	import HomeIcon from '@lucide/svelte/icons/home';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode, mode } from 'mode-watcher';

	let { projects, groups = [] }: { projects: ReportSummary[]; groups?: ProjectGroupSummary[] } =
		$props();

	let openTabs = $state<OpenTab[]>([]);
	let openDialog = $state(false);

	const isDarkMode = $derived(mode.current === 'dark');

	const activeSlug = $derived(parseReportSlug($page.url.pathname));
	const isHome = $derived($page.url.pathname === '/');

	const reportMap = $derived(new Map(projects.map((report) => [report.slug, report])));

	$effect(() => {
		openTabs = loadOpenTabs();
	});

	$effect(() => {
		if (!activeSlug) return;

		const report = reportMap.get(activeSlug);
		if (!report) return;

		const next = upsertTab(openTabs, { slug: report.slug, title: report.title });
		if (JSON.stringify(next) !== JSON.stringify(openTabs)) {
			openTabs = next;
			saveOpenTabs(next);
		}
	});

	function selectTab(slug: string) {
		if (slug === activeSlug) return;
		goto(reportPath(slug));
	}

	function closeTab(event: MouseEvent, slug: string) {
		event.stopPropagation();

		const index = openTabs.findIndex((tab) => tab.slug === slug);
		if (index === -1) return;

		const nextTabs = removeTab(openTabs, slug);
		openTabs = nextTabs;
		saveOpenTabs(nextTabs);

		if (activeSlug !== slug) return;

		if (nextTabs.length > 0) {
			const nextIndex = Math.min(index, nextTabs.length - 1);
			goto(reportPath(nextTabs[nextIndex].slug));
			return;
		}

		goto('/');
	}
</script>

<header class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
	<div class="flex h-10 items-stretch">
		<div class="flex shrink-0 items-center gap-1 border-r border-border px-2">
			<Button
				variant="ghost"
				size="icon-sm"
				class="size-7 {isHome ? 'bg-secondary text-foreground' : ''}"
				aria-label="Report list"
				onpointerenter={() => preloadRoute('/')}
				onfocus={() => preloadRoute('/')}
				onclick={() => goto('/')}
			>
				<HomeIcon class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				class="size-7"
				aria-label="Open report"
				onclick={() => (openDialog = true)}
			>
				<PlusIcon class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				class="size-7"
				aria-label="Toggle theme"
				onclick={() => toggleMode()}
			>
				{#if isDarkMode}
					<SunIcon class="size-4 text-amber-500" />
				{:else}
					<MoonIcon class="size-4 text-indigo-500" />
				{/if}
			</Button>
		</div>

		<div class="flex min-w-0 flex-1 items-stretch overflow-x-auto">
			{#each openTabs as tab (tab.slug)}
				{@const isActive = tab.slug === activeSlug}
				<div
					role="tab"
					tabindex="0"
					aria-selected={isActive}
					class="group relative flex max-w-[220px] min-w-[120px] cursor-pointer items-center border-r border-border border-b-2 px-3 text-sm transition-colors {isActive
						? 'border-b-primary text-foreground'
						: 'border-b-transparent text-muted-foreground hover:text-foreground'}"
					onpointerenter={() => preloadRoute(reportPath(tab.slug))}
					onfocus={() => preloadRoute(reportPath(tab.slug))}
					onclick={() => selectTab(tab.slug)}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							selectTab(tab.slug);
						}
					}}
				>
					<span class="truncate pr-5">{tab.title}</span>
					<button
						type="button"
						class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background/80 {isActive
							? 'opacity-100'
							: ''}"
						aria-label={`Close ${tab.title}`}
						onclick={(event) => closeTab(event, tab.slug)}
					>
						<XIcon class="size-3.5" />
					</button>
				</div>
			{/each}
		</div>
	</div>
</header>

<OpenReportDialog bind:open={openDialog} {projects} {groups} />
