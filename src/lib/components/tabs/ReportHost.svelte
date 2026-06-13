<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { resolveActiveReportSlug, subscribeNavigationSlug, getNavigationRevision } from '$lib/report-navigation.js';
	import { getReportPane, getPaneVersion, subscribeReportPanes } from '$lib/report-host.js';
	import {
		NAVIGATION_LOADING_DELAY_MS,
		shouldShowHomeNavigationSkeleton,
		shouldShowReportNavigationSkeleton
	} from '$lib/navigation-loading.js';
	import {
		areOpenTabsHydrated,
		hydrateOpenTabs,
		loadOpenTabs,
		subscribeOpenTabs,
		getTabsVersion
	} from '$lib/tabs.js';
	import ReportDashboard from '$lib/components/dashboard/ReportDashboard.svelte';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';
	import HomePageSkeleton from '$lib/components/skeletons/HomePageSkeleton.svelte';

	if (browser && !areOpenTabsHydrated()) {
		hydrateOpenTabs();
	}

	let paneRevision = $state(0);
	let tabsRevision = $state(0);
	let navRevision = $state(0);
	let showDelayedSkeleton = $state(false);

	$effect(() => {
		const unsubscribePanes = subscribeReportPanes(() => {
			paneRevision += 1;
		});
		const unsubscribeTabs = subscribeOpenTabs(() => {
			tabsRevision += 1;
		});
		const unsubscribeNav = subscribeNavigationSlug(() => {
			navRevision += 1;
		});
		return () => {
			unsubscribePanes();
			unsubscribeTabs();
			unsubscribeNav();
		};
	});

	const openTabs = $derived(getTabsVersion() + tabsRevision >= 0 ? loadOpenTabs() : []);
	const activeSlug = $derived(
		getNavigationRevision() + navRevision >= 0
			? resolveActiveReportSlug(page.url.pathname)
			: null
	);
	const paneVersion = $derived(getPaneVersion() + paneRevision);

	const renderSlugs = $derived.by(() => {
		const slugs = new Set(openTabs.map((tab) => tab.slug));
		if (activeSlug) slugs.add(activeSlug);
		return [...slugs];
	});

	const activePane = $derived(paneVersion >= 0 && activeSlug ? getReportPane(activeSlug) : undefined);
	const waitingForActivePane = $derived(Boolean(activeSlug && !activePane));
	const navigatingWithoutData = $derived(shouldShowReportNavigationSkeleton());
	const navigatingHomeWithoutData = $derived(shouldShowHomeNavigationSkeleton());

	// Show immediately when URL is on a report but pane content is not ready yet.
	const showImmediateSkeleton = $derived(waitingForActivePane);

	$effect(() => {
		if (showImmediateSkeleton || !navigatingWithoutData) {
			showDelayedSkeleton = false;
			return;
		}

		const timer = setTimeout(() => {
			if (!showImmediateSkeleton && navigatingWithoutData) {
				showDelayedSkeleton = true;
			}
		}, NAVIGATION_LOADING_DELAY_MS);

		return () => {
			clearTimeout(timer);
			showDelayedSkeleton = false;
		};
	});

	const showSkeleton = $derived(showImmediateSkeleton || showDelayedSkeleton);
</script>

{#if navigatingHomeWithoutData}
	<HomePageSkeleton />
{:else if showSkeleton && activeSlug}
	<DashboardPageSkeleton />
{/if}

{#if !navigatingHomeWithoutData}
	{#each renderSlugs as slug (slug)}
		{@const pane = paneVersion >= 0 ? getReportPane(slug) : undefined}
		{#if pane}
			<div
				class={slug === activeSlug ? '' : 'hidden [content-visibility:hidden]'}
				aria-hidden={slug !== activeSlug}
			>
				<ReportDashboard data={pane.data} form={pane.form} active={slug === activeSlug} />
			</div>
		{/if}
	{/each}
{/if}
