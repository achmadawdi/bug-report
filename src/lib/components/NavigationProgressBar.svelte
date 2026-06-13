<script lang="ts">
	import { navigating } from '$app/state';
	import {
		isNavigating,
		NAVIGATION_LOADING_DELAY_MS,
		shouldShowHomeNavigationSkeleton,
		shouldShowReportNavigationSkeleton
	} from '$lib/navigation-loading.js';

	let showBar = $state(false);
	let fadingOut = $state(false);
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	let fadeTimer: ReturnType<typeof setTimeout> | undefined;

	function isSlowNavigation(): boolean {
		return shouldShowReportNavigationSkeleton() || shouldShowHomeNavigationSkeleton();
	}

	$effect(() => {
		if (isNavigating() && isSlowNavigation()) {
			fadingOut = false;
			clearTimeout(delayTimer);
			clearTimeout(fadeTimer);
			delayTimer = setTimeout(() => {
				if (navigating.to && isSlowNavigation()) showBar = true;
			}, NAVIGATION_LOADING_DELAY_MS);
		} else {
			clearTimeout(delayTimer);
			if (showBar) {
				fadingOut = true;
				fadeTimer = setTimeout(() => {
					showBar = false;
					fadingOut = false;
				}, 200);
			}
		}

		return () => {
			clearTimeout(delayTimer);
			clearTimeout(fadeTimer);
		};
	});
</script>

{#if showBar}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden print:hidden transition-opacity duration-200 {fadingOut
			? 'opacity-0'
			: 'opacity-100'}"
		role="progressbar"
		aria-hidden="true"
	>
		<div class="navigation-progress-bar h-full bg-primary"></div>
	</div>
{/if}

<style>
	.navigation-progress-bar {
		width: 30%;
		animation: navigation-progress-sweep 1s ease-in-out infinite;
	}

	@keyframes navigation-progress-sweep {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}
</style>
