<script lang="ts">
	import type { ProjectSummary } from '$lib/server/store.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';

	let {
		open = $bindable(false),
		projects,
		mode = 'all'
	}: {
		open?: boolean;
		projects: ProjectSummary[];
		mode?: 'all' | 'create';
	} = $props();

	let creating = $state(false);
	let newProjectName = $state('');

	function openProject(project: ProjectSummary) {
		const tabs = upsertTab(loadOpenTabs(), {
			slug: project.slug,
			title: project.title
		});
		saveOpenTabs(tabs);
		open = false;
		goto(`/p/${project.slug}`);
	}
</script>

<Dialog bind:open>
	<DialogContent class="max-h-[85vh] overflow-hidden sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>{mode === 'create' ? 'New Project' : 'Open Project'}</DialogTitle>
			<DialogDescription>
				{#if mode === 'create'}
					Create a new bug report project in the projects folder.
				{:else}
					Choose a bug report project from the projects folder or create a new one.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-6 overflow-y-auto pr-1">
			{#if mode === 'all' && projects.length > 0}
				<div class="space-y-2">
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Projects
					</p>
					<ul class="divide-y divide-border rounded-lg border border-border">
						{#each projects as project (project.slug)}
							<li>
								<button
									type="button"
									class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
									onclick={() => openProject(project)}
								>
									<div class="min-w-0">
										<p class="truncate font-medium">{project.title}</p>
										<p class="text-xs text-muted-foreground">{project.slug}</p>
									</div>
									<span class="shrink-0 text-xs text-muted-foreground">
										{project.issueCount} issue{project.issueCount === 1 ? '' : 's'}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{:else if mode === 'all'}
				<div class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
					No projects found in <code class="text-xs">data/projects/</code>.
				</div>
			{/if}

			<form
				method="POST"
				action="/projects?/createProject"
				class="space-y-3 rounded-lg border border-border bg-secondary/20 p-4"
				use:enhance={() => {
					creating = true;
					return async ({ result, update }) => {
						try {
							await update();

							if (result.type === 'redirect') {
								open = false;
								return;
							}

							if (result.type === 'failure') {
								toast.error(
									(result.data as { message?: string })?.message ??
										'Failed to create project'
								);
							} else if (result.type === 'error') {
								toast.error('An unexpected error occurred while creating the project');
							}
						} finally {
							creating = false;
						}
					};
				}}
			>
				<div class="space-y-2">
					<Label for="new-project-name">New project</Label>
					<Input
						id="new-project-name"
						name="name"
						placeholder="My QA Report"
						bind:value={newProjectName}
						required
					/>
				</div>
				<Button type="submit" class="w-full" disabled={creating || !newProjectName.trim()}>
					<PlusIcon class="size-4" />
					{creating ? 'Creating...' : 'Create Project'}
				</Button>
			</form>
		</div>
	</DialogContent>
</Dialog>
