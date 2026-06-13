<script lang="ts">
	import type { ProjectGroupSummary, ReportSummary } from '$lib/server/store.js';
	import {
		parseImportJson,
		type IdConflictStrategy,
		type ImportParseSuccess,
		type SlugConflictStrategy
	} from '$lib/import-report.js';
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
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import { ui } from '$lib/ui-layout.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { upsertTab, saveOpenTabs, loadOpenTabs } from '$lib/tabs.js';
	import { preloadRoute } from '$lib/preload.js';
	import GroupAssignField from '$lib/components/dashboard/GroupAssignField.svelte';

	let {
		open = $bindable(false),
		projects,
		groups = [],
		mode = 'all',
		defaultGroupSlug = ''
	}: {
		open?: boolean;
		projects: ReportSummary[];
		groups?: ProjectGroupSummary[];
		mode?: 'all' | 'create';
		defaultGroupSlug?: string;
	} = $props();

	let creating = $state(false);
	let importing = $state(false);
	let createPanel = $state<'new' | 'import'>('new');
	let newProjectName = $state('');
	let groupSlug = $state('');
	let newGroupName = $state('');
	let importName = $state('');
	let importPreview = $state<ImportParseSuccess | null>(null);
	let importErrors = $state<string[]>([]);
	let slugConflict = $state<SlugConflictStrategy>('suffix');
	let idConflict = $state<IdConflictStrategy>('regenerate');

	const existingSlugs = $derived(new Set(projects.map((project) => project.slug)));
	const slugCollision = $derived(
		importPreview ? existingSlugs.has(importPreview.slug) : false
	);
	const showSlugConflictOptions = $derived(Boolean(importPreview && slugCollision));
	const showIdConflictOptions = $derived(Boolean(importPreview && importPreview.duplicateIds.length > 0));

	function openReport(report: ReportSummary) {
		const tabs = upsertTab(loadOpenTabs(), {
			slug: report.slug,
			title: report.title
		});
		saveOpenTabs(tabs);
		open = false;
		goto(reportPath(report.slug));
	}

	function resetImportState() {
		importPreview = null;
		importErrors = [];
		importName = '';
		slugConflict = 'suffix';
		idConflict = 'regenerate';
	}

	function resetCreatePanel() {
		createPanel = 'new';
		newProjectName = '';
		groupSlug = defaultGroupSlug;
		newGroupName = '';
		resetImportState();
	}

	$effect(() => {
		if (open) {
			resetCreatePanel();
		}
	});

	async function handleImportFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		resetImportState();

		if (!file) return;

		try {
			const parsed = parseImportJson(await file.text(), importName || undefined);
			if (!parsed.ok) {
				importErrors = parsed.errors;
				return;
			}

			importPreview = parsed;
			if (!importName.trim()) {
				importName = parsed.title;
			}
		} catch {
			importErrors = ['Failed to read the selected file.'];
		}
	}

	function refreshImportPreview() {
		if (!importPreview) return;
		const reparsed = parseImportJson(JSON.stringify(importPreview.data), importName || undefined);
		if (reparsed.ok) {
			importPreview = reparsed;
			importErrors = [];
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle>
				{#if mode === 'create'}
					{createPanel === 'new' ? 'New Report' : 'Import Report'}
				{:else}
					Open Report
				{/if}
			</DialogTitle>
			<DialogDescription>
				{#if mode === 'create'}
					{#if createPanel === 'new'}
						Create a new bug report.
					{:else}
						Import a report from a JSON file.
					{/if}
				{:else}
					Choose a bug report or create a new one.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="{ui.overlayBody} {ui.formSections}">
			{#if mode === 'all' && projects.length > 0}
				<section class={ui.section}>
					<p class={ui.sectionTitle}>Reports</p>
					<ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
						{#each projects as report (report.slug)}
							<li>
								<button
									type="button"
									class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
									onpointerenter={() => preloadRoute(reportPath(report.slug))}
									onfocus={() => preloadRoute(reportPath(report.slug))}
									onclick={() => openReport(report)}
								>
									<div class="min-w-0">
										<p class="truncate font-medium">{report.title}</p>
										<p class="text-xs text-muted-foreground">{report.slug}</p>
									</div>
									<span class="shrink-0 text-xs text-muted-foreground">
										{report.issueCount} issue{report.issueCount === 1 ? '' : 's'}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{:else if mode === 'all'}
				<div
					class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
				>
					No reports found.
				</div>
			{/if}

			{#if createPanel === 'new'}
				<form
					method="POST"
					action="/reports?/createReport"
					class="space-y-4 rounded-lg border border-border bg-secondary/20 {ui.cardPadding}"
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
											'Failed to create report'
									);
								} else if (result.type === 'error') {
									toast.error('An unexpected error occurred while creating the report');
								}
							} finally {
								creating = false;
							}
						};
					}}
				>
					<div class={ui.field}>
						<Label for="new-report-name" class={ui.label}>New report</Label>
						<Input
							id="new-report-name"
							name="name"
							class={ui.input}
							placeholder="My QA Report"
							bind:value={newProjectName}
							required
						/>
					</div>
					{#key open}
						<GroupAssignField id="create-report-group" {groups} bind:groupSlug bind:newGroupName />
					{/key}
					<Button type="submit" class="w-full" disabled={creating || !newProjectName.trim()}>
						<PlusIcon class="size-4" />
						{creating ? 'Creating...' : 'Create Report'}
					</Button>
				</form>

				<Button
					type="button"
					variant="ghost"
					class="w-full text-muted-foreground"
					onclick={() => {
						createPanel = 'import';
						resetImportState();
					}}
				>
					<UploadIcon class="size-4" />
					Import from JSON
				</Button>
			{:else if createPanel === 'import'}
			<form
				method="POST"
				action="/reports?/importReport"
				enctype="multipart/form-data"
				class="space-y-4 rounded-lg border border-border bg-secondary/20 {ui.cardPadding}"
				use:enhance={() => {
					importing = true;
					return async ({ result, update }) => {
						try {
							await update();

							if (result.type === 'redirect') {
								open = false;
								resetImportState();
								return;
							}

							if (result.type === 'failure') {
								toast.error(
										(result.data as { message?: string })?.message ??
											'Failed to import report'
									);
								} else if (result.type === 'error') {
								toast.error('An unexpected error occurred while importing the report');
							}
						} finally {
							importing = false;
						}
					};
				}}
			>
				<div class="flex items-center gap-2">
					<UploadIcon class="size-4 text-muted-foreground" />
					<p class="text-sm font-semibold">Import from JSON</p>
				</div>
				<p class="text-xs text-muted-foreground">
					Upload a full <code class="text-[11px]">report.json</code> file or an exported issues JSON.
				</p>

				<div class={ui.field}>
					<Label for="import-file" class={ui.label}>JSON file</Label>
					<Input
						id="import-file"
						name="file"
						type="file"
						accept=".json,application/json"
						class={ui.input}
						required
						onchange={handleImportFileSelect}
					/>
				</div>

				<div class={ui.field}>
					<Label for="import-report-name" class={ui.label}>Report name (optional)</Label>
					<Input
						id="import-report-name"
						name="name"
						class={ui.input}
						placeholder="Uses title from JSON when empty"
						bind:value={importName}
						onchange={refreshImportPreview}
					/>
				</div>

				{#key open}
					<GroupAssignField id="import-report-group" {groups} bind:groupSlug bind:newGroupName />
				{/key}

				{#if importErrors.length > 0}
					<div class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
						{importErrors.join(' ')}
					</div>
				{/if}

				{#if importPreview}
					<div class="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
						<p>
							<span class="font-medium text-foreground">{importPreview.title}</span>
							· {importPreview.issueCount} issue{importPreview.issueCount === 1 ? '' : 's'}
						</p>
						<p class="mt-1">
							Slug: <code class="text-foreground">{importPreview.slug}</code>
							{#if importPreview.kind === 'export'}
								· export format
							{/if}
						</p>
						{#if importPreview.duplicateIds.length > 0}
							<p class="mt-1 text-amber-700 dark:text-amber-300">
								Duplicate IDs: {importPreview.duplicateIds.join(', ')}
							</p>
						{/if}
						{#if slugCollision}
							<p class="mt-1 text-amber-700 dark:text-amber-300">
								A report with this slug already exists.
							</p>
						{/if}
					</div>
				{/if}

				{#if showSlugConflictOptions}
					<div class={ui.field}>
						<Label class={ui.label}>Slug conflict</Label>
						<Select
							type="single"
							value={slugConflict}
							onValueChange={(value) => {
								if (value) slugConflict = value as SlugConflictStrategy;
							}}
						>
							<SelectTrigger class={ui.selectTrigger}>
								{slugConflict === 'suffix'
									? 'Use numbered suffix'
									: slugConflict === 'overwrite'
										? 'Overwrite existing report'
										: 'Cancel import'}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="suffix">Use numbered suffix</SelectItem>
								<SelectItem value="overwrite">Overwrite existing report</SelectItem>
								<SelectItem value="cancel">Cancel import</SelectItem>
							</SelectContent>
						</Select>
						<input type="hidden" name="slugConflict" value={slugConflict} />
					</div>
				{:else}
					<input type="hidden" name="slugConflict" value="suffix" />
				{/if}

				{#if showIdConflictOptions}
					<div class={ui.field}>
						<Label class={ui.label}>Duplicate issue IDs</Label>
						<Select
							type="single"
							value={idConflict}
							onValueChange={(value) => {
								if (value) idConflict = value as IdConflictStrategy;
							}}
						>
							<SelectTrigger class={ui.selectTrigger}>
								{idConflict === 'regenerate'
									? 'Regenerate IDs'
									: idConflict === 'skip'
										? 'Skip duplicates'
										: 'Cancel import'}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="regenerate">Regenerate IDs</SelectItem>
								<SelectItem value="skip">Skip duplicates</SelectItem>
								<SelectItem value="cancel">Cancel import</SelectItem>
							</SelectContent>
						</Select>
						<input type="hidden" name="idConflict" value={idConflict} />
					</div>
				{:else}
					<input type="hidden" name="idConflict" value="regenerate" />
				{/if}

				<div class="flex flex-col gap-2 sm:flex-row">
					<Button
						type="button"
						variant="outline"
						class="w-full sm:flex-1"
						onclick={() => {
							createPanel = 'new';
							resetImportState();
						}}
					>
						Back
					</Button>
					<Button
						type="submit"
						class="w-full sm:flex-1"
						disabled={importing || importErrors.length > 0}
					>
						<UploadIcon class="size-4" />
						{importing ? 'Importing...' : 'Import Report'}
					</Button>
				</div>
			</form>
			{/if}
		</div>
	</DialogContent>
</Dialog>
