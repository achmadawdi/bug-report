<script lang="ts">
	import type { ReportMeta, TestingSession } from '$lib/types.js';
	import {
		deviceTypeSchema,
		environmentSchema,
		minecraftEditionSchema,
		reportTypeSchema,
		testerLevelSchema
	} from '$lib/types.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import {
		enhanceReportForm,
		getReportSlugContext,
		reportFormAction
	} from '$lib/report-forms.js';
	import { displayDate, displayNumber, displayText } from '$lib/format.js';
	import { ui } from '$lib/ui-layout.js';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import UsersIcon from '@lucide/svelte/icons/users';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import TargetIcon from '@lucide/svelte/icons/target';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ServerIcon from '@lucide/svelte/icons/server';
	import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
	import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import type { ProjectGroupSummary } from '$lib/server/store.js';
	import type { ReportWorkflowStatus } from '$lib/types.js';
	import {
		PROJECT_WORKFLOW_LABELS,
		PROJECT_WORKFLOW_STATUSES,
		PROJECT_WORKFLOW_STYLES
	} from '$lib/constants.js';
	import { refreshAppData } from '$lib/refresh-app-data.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils.js';

	import GroupAssignField from './GroupAssignField.svelte';
	import LinkedText from '$lib/components/LinkedText.svelte';

	let {
		report,
		testing_session,
		groups = [],
		currentGroupSlug = null,
		workflowStatus = 'open',
		workflowNote = null,
		embedded = false,
		onExportJson,
		onExportPdf
	}: {
		report: ReportMeta;
		testing_session: TestingSession;
		groups?: ProjectGroupSummary[];
		currentGroupSlug?: string | null;
		workflowStatus?: ReportWorkflowStatus;
		workflowNote?: string | null;
		embedded?: boolean;
		onExportJson: () => void;
		onExportPdf: () => void;
	} = $props();

	const reportTypes = reportTypeSchema.options;
	const minecraftEditions = minecraftEditionSchema.options;
	const deviceTypes = deviceTypeSchema.options;
	const testerLevels = testerLevelSchema.options;
	const environments = environmentSchema.options;

	let editOpen = $state(false);
	let saving = $state(false);
	const reportSlug = getReportSlugContext();
	let workflowSaving = $state(false);
	let pendingWorkflowStatus = $state<ReportWorkflowStatus | null>(null);
	let workflowForm = $state<HTMLFormElement | null>(null);
	let workflowDialogOpen = $state(false);
	let workflowNoteEditMode = $state(false);
	let workflowNoteDraft = $state('');
	let workflowTargetStatus = $state<ReportWorkflowStatus | null>(null);
	let groupSlug = $state('');
	let newGroupName = $state('');
	let reportDraft = $state({
		title: '',
		type: 'QA Testing Report' as ReportMeta['type'],
		version: '',
		source_file: '' as string
	});
	let sessionDraft = $state<TestingSession>({
		test_date: '',
		minecraft_edition: 'Education',
		game_version_tested: '',
		device_type: 'Windows',
		tester_count: 1,
		tester_level: 'Mixed',
		test_scope: null,
		environment: null
	});

	const environmentValue = $derived(sessionDraft.environment ?? '');

	const primaryItems = $derived([
		{
			label: 'Minecraft Edition',
			value: displayText(testing_session.minecraft_edition),
			icon: Gamepad2Icon
		},
		{
			label: 'Game Version',
			value: displayText(testing_session.game_version_tested),
			icon: MonitorIcon
		},
		{
			label: 'Tested',
			value: displayDate(testing_session.test_date),
			icon: CalendarIcon
		},
		{
			label: 'Testers',
			value: `${displayNumber(testing_session.tester_count)} · ${displayText(testing_session.device_type)}`,
			icon: UsersIcon
		}
	]);

	function openEdit() {
		reportDraft = {
			title: report.title,
			type: report.type,
			version: report.version,
			source_file: report.source_file ?? ''
		};
		sessionDraft = {
			...testing_session,
			test_scope: testing_session.test_scope ?? '',
			environment: testing_session.environment ?? null
		};
		groupSlug = currentGroupSlug ?? '';
		newGroupName = '';
		editOpen = true;
	}

	function submitWorkflowStatus(status: ReportWorkflowStatus, note = '') {
		if (!workflowForm || workflowSaving) return;
		const statusInput = workflowForm.elements.namedItem('status') as HTMLInputElement | null;
		const noteInput = workflowForm.elements.namedItem('workflowNote') as HTMLInputElement | null;
		if (statusInput) statusInput.value = status;
		if (noteInput) noteInput.value = note;
		workflowForm.requestSubmit();
	}

	function requestWorkflowStatus(status: ReportWorkflowStatus) {
		if (status === workflowStatus || workflowSaving) return;

		if (status === 'open') {
			submitWorkflowStatus('open', '');
			return;
		}

		workflowNoteEditMode = false;
		workflowTargetStatus = status;
		workflowNoteDraft = workflowNote ?? '';
		workflowDialogOpen = true;
	}

	function openEditWorkflowNote() {
		if (workflowStatus === 'open' || workflowSaving) return;

		workflowNoteEditMode = true;
		workflowTargetStatus = workflowStatus;
		workflowNoteDraft = workflowNote ?? '';
		workflowDialogOpen = true;
	}

	function confirmWorkflowStatus() {
		if (!workflowTargetStatus) return;
		const note = workflowNoteDraft.trim();
		if (!note) {
			toast.error('Developer note is required.');
			return;
		}

		workflowDialogOpen = false;
		submitWorkflowStatus(workflowTargetStatus, note);
	}

	const currentGroupTitle = $derived(
		groups.find((group) => group.slug === currentGroupSlug)?.title ?? null
	);

	const showDetailsSection = $derived(
		Boolean(
			testing_session.test_scope ||
				(testing_session.tester_level && testing_session.tester_level !== 'Mixed') ||
				testing_session.environment
		)
	);

	const showWorkflowNote = $derived(
		workflowStatus !== 'open' && Boolean(workflowNote?.trim())
	);

	const workflowNoteTone = $derived(
		workflowStatus === 'resolved'
			? {
					surface: 'border-severity-low/30 bg-severity-low/8',
					iconClass: 'text-severity-low',
					badgeClass: 'border-severity-low/30 bg-severity-low/10 text-severity-low',
					Icon: CircleCheckIcon
				}
			: {
					surface: 'border-severity-high/25 bg-severity-high/6',
					iconClass: 'text-severity-high',
					badgeClass: 'border-severity-high/25 bg-severity-high/8 text-severity-high',
					Icon: ClockIcon
				}
	);

	const showMetadataDetails = $derived(showDetailsSection || showWorkflowNote);
</script>

<div
	class={cn(
		embedded
			? 'border-t border-border/60'
			: 'ring-foreground/10 overflow-hidden rounded-xl ring-1 border-border/60 bg-card/45 py-0 shadow-sm backdrop-blur-md',
		!embedded && ui.cardPanel
	)}
>
		<div class="@container px-4 py-3 md:px-6 md:py-4">
			<div
				class="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-4"
			>
				<div
					class="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 @sm:grid-cols-4 @sm:gap-x-3 @3xl:inline-grid @3xl:w-auto @3xl:gap-x-5"
				>
					{#each primaryItems as item}
						<div class="flex min-w-0 items-start gap-2.5">
							<div class={ui.iconTile}>
								<item.icon class={ui.iconTileIcon} />
							</div>
							<div class="min-w-0">
								<p class={ui.sectionTitle}>{item.label}</p>
								<p class="mt-0.5 text-sm leading-snug font-medium">{item.value}</p>
							</div>
						</div>
					{/each}
				</div>

				<div
					class="flex w-full items-center justify-end border-t border-border/40 pt-3 @3xl:w-auto @3xl:border-t-0 @3xl:pt-0 @3xl:shrink-0"
				>
				<form
					bind:this={workflowForm}
					method="POST"
					action={reportFormAction(reportSlug, '?/updateWorkflowStatus')}
					class="flex items-center gap-1 rounded-lg border border-border-subtle bg-secondary/20 p-1"
					use:enhance={enhanceReportForm(reportSlug, {
						onSubmit: () => {
							pendingWorkflowStatus = workflowTargetStatus ?? workflowStatus;
							workflowSaving = true;
						},
						onSuccess: async (data) => {
							const nextStatus =
								(data?.workflowStatus as ReportWorkflowStatus | undefined) ??
								pendingWorkflowStatus;
							if (workflowNoteEditMode) {
								toast.success('Developer note updated');
							} else if (nextStatus) {
								toast.success(`Project marked ${PROJECT_WORKFLOW_LABELS[nextStatus]}`);
							}
							workflowNoteEditMode = false;
							workflowTargetStatus = null;
							workflowNoteDraft = '';
							workflowDialogOpen = false;
							await refreshAppData();
						},
						onFailure: (data) => {
							toast.error(data?.message ?? 'Failed to update project status');
						},
						onError: () => {
							toast.error('An unexpected error occurred while updating project status');
						},
						onFinally: () => {
							workflowSaving = false;
							pendingWorkflowStatus = null;
						}
					})}
				>
					<input type="hidden" name="status" value={workflowStatus} />
					<input type="hidden" name="workflowNote" value="" />
					{#each PROJECT_WORKFLOW_STATUSES as status (status)}
						{@const isActive = workflowStatus === status}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							class={cn(
								ui.controlSm,
								'px-2.5 text-xs rounded-md transition-all duration-200',
								isActive
									? 'bg-primary-surface border border-primary-muted/20 text-primary font-semibold shadow-sm'
									: 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
							)}
							disabled={workflowSaving}
							aria-pressed={isActive}
							onclick={() => requestWorkflowStatus(status)}
						>
							{#if workflowSaving && pendingWorkflowStatus === status}
								<Loader2Icon class="size-3 animate-spin" />
							{/if}
							{PROJECT_WORKFLOW_LABELS[status]}
						</Button>
					{/each}
				</form>
				</div>

				<div class="flex flex-wrap items-center gap-2 @3xl:contents">
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button
									{...props}
									type="button"
									size="sm"
									variant="outline"
									class="{ui.controlSm} shrink-0 px-3 text-xs border-border-subtle bg-background/40 hover:bg-muted/40 hover:text-foreground transition-colors"
								>
									<DownloadIcon class="size-3.5" />
									Export
									<ChevronDownIcon class="size-3.5" />
								</Button>
							{/snippet}
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onclick={onExportJson}>
								<DownloadIcon class="size-4" />
								Export JSON
							</DropdownMenuItem>
							<DropdownMenuItem onclick={onExportPdf}>
								<FileTextIcon class="size-4" />
								Export PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						type="button"
						size="sm"
						variant="outline"
						class="{ui.controlSm} shrink-0 px-3 text-xs border-border-subtle bg-background/40 hover:bg-muted/40 hover:text-foreground transition-colors"
						onclick={openEdit}
					>
					<PencilIcon class="size-3.5" />
					Edit
				</Button>
			</div>
		</div>
	</div>

		{#if currentGroupTitle}
			<div class="border-t border-border/60 px-4 py-3 md:px-6">
				<div class="flex items-start gap-2.5">
					<div class={ui.iconTile}>
						<FolderTreeIcon class={ui.iconTileIcon} />
					</div>
					<div class="min-w-0">
						<p class={ui.sectionTitle}>Project group</p>
						<p class="mt-0.5 text-sm leading-snug font-medium text-foreground/90">
							{currentGroupTitle}
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if showMetadataDetails}
			<div class="border-t border-border/60 {ui.cardPadding}">
				{#if testing_session.test_scope}
					<div class="flex {ui.grid}">
						<div class={ui.iconTile}>
							<TargetIcon class={ui.iconTileIcon} />
						</div>
						<div class="min-w-0">
							<p class={ui.sectionTitle}>Scope</p>
							<p class="mt-1 text-sm leading-relaxed text-foreground/90">
								{displayText(testing_session.test_scope)}
							</p>
						</div>
					</div>
				{/if}

				{#if testing_session.tester_level && testing_session.tester_level !== 'Mixed'}
					<div class={cn('flex', ui.grid, testing_session.test_scope && 'mt-4')}>
						<div class={ui.iconTile}>
							<GraduationCapIcon class={ui.iconTileIcon} />
						</div>
						<div class="min-w-0">
							<p class={ui.sectionTitle}>Tester Level</p>
							<p class="mt-1 text-sm leading-relaxed text-foreground/90">
								{displayText(testing_session.tester_level)}
							</p>
						</div>
					</div>
				{/if}

				{#if testing_session.environment}
					<div
						class={cn(
							'flex',
							ui.grid,
							(testing_session.test_scope ||
								(testing_session.tester_level &&
									testing_session.tester_level !== 'Mixed')) &&
								'mt-4'
						)}
					>
						<div class={ui.iconTile}>
							<ServerIcon class={ui.iconTileIcon} />
						</div>
						<div class="min-w-0">
							<p class={ui.sectionTitle}>Environment</p>
							<p class="mt-1 text-sm leading-relaxed text-foreground/90">
								{displayText(testing_session.environment)}
							</p>
						</div>
					</div>
				{/if}

				{#if showWorkflowNote}
					{@const NoteIcon = workflowNoteTone.Icon}
					<div
						class={cn(
							'flex gap-3 rounded-lg border p-3',
							workflowNoteTone.surface,
							showDetailsSection && 'mt-4'
						)}
					>
						<div
							class={cn(
								'flex size-8 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/40',
								workflowNoteTone.iconClass
							)}
						>
							<NoteIcon class="size-4" />
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<div class="flex items-center justify-between gap-2">
								<div class="flex flex-wrap items-center gap-2">
									<p class={ui.sectionTitle}>Developer note</p>
									<Badge
										variant="outline"
										class={cn('px-1.5 py-0 text-[10px]', workflowNoteTone.badgeClass)}
									>
										{PROJECT_WORKFLOW_LABELS[workflowStatus]}
									</Badge>
								</div>
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									class="size-7 shrink-0 text-muted-foreground hover:bg-background/50 hover:text-foreground"
									aria-label="Edit developer note"
									disabled={workflowSaving}
									onclick={openEditWorkflowNote}
								>
									<PencilIcon class="size-3.5" />
								</Button>
							</div>
							<LinkedText
								value={workflowNote ?? ''}
								class="text-sm leading-snug text-foreground/90"
							/>
						</div>
					</div>
				{/if}
			</div>
		{/if}
</div>

<Dialog bind:open={editOpen}>
	<DialogContent class="flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle class="text-lg leading-tight">Edit Report Details</DialogTitle>
			<DialogDescription class="text-sm leading-relaxed">
				Changes are saved to the project database.
			</DialogDescription>
		</DialogHeader>

		<form
			method="POST"
			action={reportFormAction(reportSlug, '?/updateReport')}
			class="flex min-h-0 flex-1 flex-col"
			use:enhance={enhanceReportForm(reportSlug, {
				onSubmit: () => {
					saving = true;
				},
				onSuccess: async () => {
					toast.success('Report details updated');
					editOpen = false;
					await refreshAppData();
				},
				onFailure: (data) => {
					toast.error(data?.message ?? 'Failed to update report');
				},
				onError: () => {
					toast.error('An unexpected error occurred while updating the report');
				},
				onFinally: () => {
					saving = false;
				}
			})}
		>
			<div class={ui.overlayBody}>
				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Report</h3>

					<div class={ui.field}>
						<Label for="meta-title" class={ui.label}>Title</Label>
						<Input
							id="meta-title"
							name="title"
							class={ui.input}
							bind:value={reportDraft.title}
							required
						/>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label class={ui.label}>Report Type</Label>
							<Select
								type="single"
								value={reportDraft.type}
								onValueChange={(value) => {
									if (value) reportDraft.type = value as ReportMeta['type'];
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>{reportDraft.type}</SelectTrigger>
								<SelectContent>
									{#each reportTypes as type}
										<SelectItem value={type}>{type}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="type" value={reportDraft.type} />
						</div>
						<div class={ui.field}>
							<Label for="meta-version" class={ui.label}>Release Version</Label>
							<Input
								id="meta-version"
								name="version"
								class={ui.input}
								bind:value={reportDraft.version}
								required
							/>
						</div>
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Organization</h3>
					{#key `${currentGroupSlug ?? 'none'}-${editOpen}`}
						<GroupAssignField {groups} bind:groupSlug bind:newGroupName />
					{/key}
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Testing Session</h3>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label class={ui.label}>Minecraft Edition</Label>
							<Select
								type="single"
								value={sessionDraft.minecraft_edition}
								onValueChange={(value) => {
									if (value) {
										sessionDraft.minecraft_edition = value as TestingSession['minecraft_edition'];
									}
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>
									{sessionDraft.minecraft_edition}
								</SelectTrigger>
								<SelectContent>
									{#each minecraftEditions as edition}
										<SelectItem value={edition}>{edition}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="minecraft_edition" value={sessionDraft.minecraft_edition} />
						</div>
						<div class={ui.field}>
							<Label for="meta-game-version" class={ui.label}>Game Version Tested</Label>
							<Input
								id="meta-game-version"
								name="game_version_tested"
								class={ui.input}
								bind:value={sessionDraft.game_version_tested}
								required
							/>
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-test-date" class={ui.label}>Test Date</Label>
							<Input
								id="meta-test-date"
								name="test_date"
								type="date"
								class={ui.input}
								bind:value={sessionDraft.test_date}
								required
							/>
						</div>
						<div class={ui.field}>
							<Label class={ui.label}>Device Type</Label>
							<Select
								type="single"
								value={sessionDraft.device_type}
								onValueChange={(value) => {
									if (value) sessionDraft.device_type = value as TestingSession['device_type'];
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>{sessionDraft.device_type}</SelectTrigger>
								<SelectContent>
									{#each deviceTypes as device}
										<SelectItem value={device}>{device}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="device_type" value={sessionDraft.device_type} />
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-tester-count" class={ui.label}>Tester Count</Label>
							<Input
								id="meta-tester-count"
								name="tester_count"
								type="number"
								min="1"
								step="1"
								class={ui.input}
								bind:value={sessionDraft.tester_count}
								required
							/>
						</div>
						<div class={ui.field}>
							<Label class={ui.label}>Tester Level</Label>
							<Select
								type="single"
								value={sessionDraft.tester_level}
								onValueChange={(value) => {
									if (value) {
										sessionDraft.tester_level = value as TestingSession['tester_level'];
									}
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>
									{sessionDraft.tester_level}
								</SelectTrigger>
								<SelectContent>
									{#each testerLevels as level}
										<SelectItem value={level}>{level}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="tester_level" value={sessionDraft.tester_level} />
						</div>
					</div>

					<div class={ui.field}>
						<Label class={ui.label}>Environment</Label>
						<Select
							type="single"
							value={environmentValue}
							onValueChange={(value) => {
								sessionDraft.environment =
									value === '' ? null : (value as TestingSession['environment']);
							}}
						>
							<SelectTrigger class={ui.selectTrigger}>
								{displayText(sessionDraft.environment)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Not set</SelectItem>
								{#each environments as environment}
									<SelectItem value={environment}>{environment}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
						<input type="hidden" name="environment" value={environmentValue} />
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Scope & Source</h3>

					<div class={ui.field}>
						<Label for="meta-scope" class={ui.label}>Test Scope</Label>
						<Textarea
							id="meta-scope"
							name="test_scope"
							rows={4}
							class="min-h-24 resize-y bg-background leading-relaxed"
							bind:value={sessionDraft.test_scope}
						/>
					</div>

					<div class={ui.field}>
						<Label for="meta-source" class={ui.label}>Source File</Label>
						<Input
							id="meta-source"
							name="source_file"
							class={ui.input}
							bind:value={reportDraft.source_file}
						/>
					</div>
				</section>
			</div>

			<DialogFooter class="m-0 rounded-none {ui.overlayFooter}">
				<Button type="button" variant="outline" onclick={() => (editOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving...' : 'Save Details'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog
	bind:open={workflowDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			workflowNoteEditMode = false;
			workflowTargetStatus = null;
			workflowNoteDraft = '';
		}
	}}
>
	<DialogContent class="flex max-h-[min(90vh,32rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle class="text-lg leading-tight">
				{#if workflowNoteEditMode}
					Edit developer note
				{:else}
					Mark as {workflowTargetStatus ? PROJECT_WORKFLOW_LABELS[workflowTargetStatus] : 'Updated'}
				{/if}
			</DialogTitle>
			<DialogDescription class="text-sm leading-relaxed">
				{#if workflowNoteEditMode}
					Update the note for this {PROJECT_WORKFLOW_LABELS[workflowStatus].toLowerCase()} report.
					Bare URLs and [label](https://example.com) links are supported.
				{:else}
					Add a developer note explaining this status change. It is required when resolving or
					postponing a report.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
			<div class={ui.field}>
				<Label for="workflow-note" class={ui.label}>Developer note</Label>
				<Textarea
					id="workflow-note"
					rows={5}
					class="min-h-28 resize-y bg-background leading-relaxed"
					placeholder="Describe the update. Bare URLs and [label](https://example.com) links are supported."
					bind:value={workflowNoteDraft}
				/>
			</div>
		</div>

		<DialogFooter class="m-0 rounded-none {ui.overlayFooter}">
			<Button
				type="button"
				variant="outline"
				onclick={() => {
					workflowDialogOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button type="button" disabled={workflowSaving} onclick={confirmWorkflowStatus}>
				{#if workflowSaving}
					<Loader2Icon class="size-4 animate-spin" />
				{/if}
				{workflowNoteEditMode ? 'Save note' : 'Confirm'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
