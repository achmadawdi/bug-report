<script lang="ts">
	import type { ReportMeta, TestingSession } from '$lib/types.js';
	import {
		deviceTypeSchema,
		environmentSchema,
		minecraftEditionSchema,
		reportTypeSchema,
		testerLevelSchema
	} from '$lib/types.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
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
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
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
	import type { ProjectGroupSummary, ReportSummary } from '$lib/server/store.js';
	import type { ReportWorkflowStatus } from '$lib/types.js';
	import {
		PROJECT_WORKFLOW_LABELS,
		PROJECT_WORKFLOW_STATUSES,
		PROJECT_WORKFLOW_STYLES
	} from '$lib/constants.js';
	import { invalidateAll } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { preloadRoute } from '$lib/preload.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils.js';

	import GroupAssignField from './GroupAssignField.svelte';

	let {
		report,
		testing_session,
		groups = [],
		currentGroupSlug = null,
		currentReportSlug = '',
		relatedReports = [],
		workflowStatus = 'open',
		onExportJson,
		onExportPdf
	}: {
		report: ReportMeta;
		testing_session: TestingSession;
		groups?: ProjectGroupSummary[];
		currentGroupSlug?: string | null;
		currentReportSlug?: string;
		relatedReports?: ReportSummary[];
		workflowStatus?: ReportWorkflowStatus;
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
	let workflowSaving = $state(false);
	let pendingWorkflowStatus = $state<ReportWorkflowStatus | null>(null);
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

	const currentGroupTitle = $derived(
		groups.find((group) => group.slug === currentGroupSlug)?.title ?? null
	);

	const showRelatedReports = $derived(relatedReports.length > 1);
	const showDetailsSection = $derived(
		Boolean(
			testing_session.test_scope ||
				(testing_session.tester_level && testing_session.tester_level !== 'Mixed') ||
				testing_session.environment ||
				showRelatedReports
		)
	);
</script>

<Card class={cn(ui.cardPanel, 'border-border/60 bg-card/45 backdrop-blur-md shadow-sm')}>
	<CardContent class="p-0">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between {ui.cardPadding}">
			<div class="grid min-w-0 flex-1 {ui.gridLg} sm:grid-cols-2 xl:grid-cols-4">
				{#each primaryItems as item}
					<div class="flex min-w-0 {ui.grid}">
						<div class={ui.iconTile}>
							<item.icon class={ui.iconTileIcon} />
						</div>
						<div class="min-w-0">
							<p class={ui.sectionTitle}>{item.label}</p>
							<p class="mt-1 text-sm leading-snug font-medium">{item.value}</p>
						</div>
					</div>
				{/each}
			</div>

			<div class="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end lg:shrink-0">
				<form
					method="POST"
					action="?/updateWorkflowStatus"
					class="flex items-center gap-1 rounded-lg border border-border-subtle bg-secondary/20 p-1"
					use:enhance={({ formData }) => {
						const nextStatus = String(
							formData.get('status') ?? ''
						) as ReportWorkflowStatus;
						pendingWorkflowStatus = nextStatus;
						workflowSaving = true;
						return async ({ result, update }) => {
							try {
								await update();
								if (result.type === 'success') {
									toast.success(`Project marked ${PROJECT_WORKFLOW_LABELS[nextStatus]}`);
									await invalidateAll();
								} else if (result.type === 'failure') {
									toast.error(
										(result.data as { message?: string })?.message ??
											'Failed to update project status'
									);
								} else if (result.type === 'error') {
									toast.error('An unexpected error occurred while updating project status');
								}
							} finally {
								workflowSaving = false;
								pendingWorkflowStatus = null;
							}
						};
					}}
				>
					{#each PROJECT_WORKFLOW_STATUSES as status (status)}
						{@const isActive = workflowStatus === status}
						<Button
							type={isActive ? 'button' : 'submit'}
							name="status"
							value={status}
							size="sm"
							variant="ghost"
							class={cn(
								ui.controlSm,
								'px-2.5 text-xs rounded-md transition-all duration-200',
								isActive
									? 'bg-primary-surface border border-primary-muted/20 text-primary font-semibold shadow-sm pointer-events-none'
									: 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
							)}
							disabled={workflowSaving && !isActive}
							aria-pressed={isActive}
						>
							{#if workflowSaving && pendingWorkflowStatus === status}
								<Loader2Icon class="size-3 animate-spin" />
							{/if}
							{PROJECT_WORKFLOW_LABELS[status]}
						</Button>
					{/each}
				</form>

				<div class="flex shrink-0 items-center gap-2">
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
			<div class="border-t border-border/60 {ui.cardPadding}">
				<div class="flex {ui.grid}">
					<div class={ui.iconTile}>
						<FolderTreeIcon class={ui.iconTileIcon} />
					</div>
					<div class="min-w-0">
						<p class={ui.sectionTitle}>Project group</p>
						<p class="mt-1 text-sm leading-relaxed font-medium text-foreground/90">
							{currentGroupTitle}
						</p>
					</div>
				</div>
			</div>
		{/if}

		{#if showDetailsSection}
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
					<div class="mt-4 flex {ui.grid}">
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
					<div class="mt-4 flex {ui.grid}">
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

				{#if showRelatedReports}
					<div
						class={testing_session.test_scope ||
						(testing_session.tester_level && testing_session.tester_level !== 'Mixed') ||
						testing_session.environment
							? 'mt-4'
							: ''}
					>
						<p class={ui.sectionTitle}>Related reports</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each relatedReports as sibling (sibling.slug)}
								<a
									href={reportPath(sibling.slug)}
									class={cn(
										'inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
										sibling.slug === currentReportSlug
											? 'border-primary/40 bg-primary/10 text-foreground'
											: 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
									)}
									aria-current={sibling.slug === currentReportSlug ? 'page' : undefined}
									onpointerenter={() => preloadRoute(reportPath(sibling.slug))}
									onfocus={() => preloadRoute(reportPath(sibling.slug))}
								>
									<span class="truncate font-medium">{sibling.title}</span>
									{#if sibling.workflowStatus !== 'open'}
										<Badge
											variant="outline"
											class={cn(
												'shrink-0 px-1.5 py-0 text-[10px]',
												PROJECT_WORKFLOW_STYLES[sibling.workflowStatus]
											)}
										>
											{PROJECT_WORKFLOW_LABELS[sibling.workflowStatus]}
										</Badge>
									{/if}
									<Badge variant="secondary" class="shrink-0 px-1.5 py-0 text-[10px]">
										{sibling.issueCount}
									</Badge>
									{#if sibling.openCount > 0}
										<span class="shrink-0 text-[10px] text-muted-foreground">
											{sibling.openCount} open
										</span>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>

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
			action="?/updateReport"
			class="flex min-h-0 flex-1 flex-col"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					try {
						await update();
						if (result.type === 'success') {
							toast.success('Report details updated');
							editOpen = false;
							await invalidateAll();
						} else if (result.type === 'failure') {
							toast.error(
								(result.data as { message?: string })?.message ?? 'Failed to update report'
							);
						} else if (result.type === 'error') {
							toast.error('An unexpected error occurred while updating the report');
						}
					} finally {
						saving = false;
					}
				};
			}}
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
