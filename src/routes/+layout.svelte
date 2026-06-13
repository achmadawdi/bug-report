<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import TabBar from '$lib/components/tabs/TabBar.svelte';
	import NavigationProgressBar from '$lib/components/NavigationProgressBar.svelte';
	import { ModeWatcher } from 'mode-watcher';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<ModeWatcher />

<div class="min-h-screen bg-background text-foreground transition-colors duration-200">
	<NavigationProgressBar />
	<TabBar projects={data.projects} groups={data.groups} />
	{@render children()}
</div>

<Toaster richColors closeButton position="bottom-left" class="z-[100]" />
