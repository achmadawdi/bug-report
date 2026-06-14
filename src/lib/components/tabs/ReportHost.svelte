<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { resolveActiveReportSlug, subscribeNavigationSlug, getNavigationRevision } from '$lib/report-navigation.js';
	import { getReportPane, getPaneVersion, removeReportPane, subscribeReportPanes } from '$lib/report-host.js';
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
	import { parseReportSlug } from '$lib/routes.js';
	import { fade } from 'svelte/transition';

	if (browser && !areOpenTabsHydrated()) {
		hydrateOpenTabs();
	}

	let paneRevision = $state(0);
	let tabsRevision = $state(0);
	let navRevision = $state(0);
	let showDelayedSkeleton = $state(false);

	const reportRouteError = $derived.by(() => {
		if (!parseReportSlug(page.url.pathname) || page.status < 400) return null;
		return page.status;
	});

	const hideReportOverlay = $derived(Boolean(reportRouteError));

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
	const waitingForActivePane = $derived(Boolean(activeSlug && !activePane && !hideReportOverlay));
	const navigatingWithoutData = $derived(shouldShowReportNavigationSkeleton());
	const navigatingHomeWithoutData = $derived(shouldShowHomeNavigationSkeleton());

	$effect(() => {
		if (reportRouteError === 404 && activeSlug) {
			removeReportPane(activeSlug);
		}
	});

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

<div class="pointer-events-none grid grid-cols-1 grid-rows-1 items-start w-full">
	{#if navigatingHomeWithoutData}
		<div
			class="pointer-events-auto col-start-1 row-start-1 min-w-0 w-full"
			transition:fade={{ duration: 150 }}
		>
			<HomePageSkeleton />
		</div>
	{:else if showSkeleton && activeSlug && !hideReportOverlay}
		<div
			class="pointer-events-auto col-start-1 row-start-1 min-w-0 w-full"
			transition:fade={{ duration: 150 }}
		>
			<DashboardPageSkeleton />
		</div>
	{/if}

	{#if !navigatingHomeWithoutData && !hideReportOverlay}
		{#each renderSlugs as slug (slug)}
			{@const pane = paneVersion >= 0 ? getReportPane(slug) : undefined}
			{#if pane}
				{@const isActive = slug === activeSlug}
				<div
					class="tab-pane-transition col-start-1 row-start-1 min-w-0 w-full"
					class:pointer-events-auto={isActive}
					class:pointer-events-none={!isActive}
					class:opacity-100={isActive}
					class:translate-y-0={isActive}
					class:scale-100={isActive}
					class:opacity-0={!isActive}
					class:translate-y-1={!isActive}
					class:scale-[0.995]={!isActive}
					class:invisible={!isActive}
					aria-hidden={!isActive}
				>
					<ReportDashboard data={pane.data} form={pane.form} active={isActive} />
				</div>
			{/if}
		{/each}
	{/if}
</div>
