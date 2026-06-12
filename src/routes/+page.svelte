<script lang="ts">
	import type { ProjectSummary } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import OpenProjectDialog from '$lib/components/tabs/OpenProjectDialog.svelte';
	import ProjectCard from '$lib/components/tabs/ProjectCard.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { ui } from '$lib/ui-layout.js';
	import { isNavigatingToProject } from '$lib/navigation-loading.js';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';

	let { data } = $props();

	let openDialog = $state(false);
	let dialogMode = $state<'all' | 'create'>('all');

	const showLoadingSkeleton = $derived(isNavigatingToProject());

	function openProject(project: ProjectSummary) {
		const tabs = upsertTab(loadOpenTabs(), {
			slug: project.slug,
			title: project.title
		});
		saveOpenTabs(tabs);
		goto(`/p/${project.slug}`);
	}

	function openCreateDialog() {
		dialogMode = 'create';
		openDialog = true;
	}
</script>

<svelte:head>
	<title>QA Bug Report Dashboard</title>
</svelte:head>

{#if showLoadingSkeleton}
	<DashboardPageSkeleton />
{:else}
	<div
		class="{ui.pageShellNarrow} flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center {ui.pageStack}"
	>
		<div class="{ui.field} text-center">
			<h1 class="text-2xl font-bold tracking-tight">No project open</h1>
			<p class="text-sm text-muted-foreground">
				Open an existing bug report project or create a new one to get started.
			</p>
		</div>

		<div class="grid w-full {ui.grid} sm:grid-cols-2">
			{#each data.projects as project (project.slug)}
				<ProjectCard {project} onclick={() => openProject(project)} />
			{/each}

			<button type="button" class="text-left" onclick={openCreateDialog}>
				<Card
					class="flex h-full min-h-[131px] items-center justify-center border-dashed transition-colors hover:border-primary/50 hover:bg-secondary/30"
				>
					<CardContent
						class="flex flex-col items-center {ui.gridLg} {ui.cardPadding} text-muted-foreground"
					>
						<div
							class="flex size-10 items-center justify-center rounded-lg border border-dashed border-border"
						>
							<PlusIcon class="size-5" />
						</div>
						<p class="text-sm font-medium">New project</p>
					</CardContent>
				</Card>
			</button>
		</div>
	</div>
{/if}

<OpenProjectDialog bind:open={openDialog} projects={data.projects} mode={dialogMode} />
