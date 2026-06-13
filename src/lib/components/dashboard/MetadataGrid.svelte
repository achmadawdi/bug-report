<script lang="ts">
	import type { ReportMeta, TestingSession } from '$lib/types.js';
	import {
		deviceTypeSchema,
		environmentSchema,
		minecraftEditionSchema,
		reportTypeSchema,
		testerEducationLevelSchema
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
	import ServerIcon from '@lucide/svelte/icons/server';

	let {
		report,
		testing_session
	}: {
		report: ReportMeta;
		testing_session: TestingSession;
	} = $props();

	const reportTypes = reportTypeSchema.options;
	const minecraftEditions = minecraftEditionSchema.options;
	const deviceTypes = deviceTypeSchema.options;
	const educationLevels = testerEducationLevelSchema.options;
	const environments = environmentSchema.options;

	let editOpen = $state(false);
	let saving = $state(false);
	let reportDraft = $state<ReportMeta>({
		title: '',
		type: 'QA Testing Report',
		version: '',
		source_file: ''
	});
	let sessionDraft = $state<TestingSession>({
		test_date: '',
		minecraft_edition: 'Education',
		game_version_tested: '',
		device_type: 'Windows',
		tester_count: 1,
		tester_version: '',
		tester_education_level: 'Mixed',
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
		reportDraft = { ...report };
		sessionDraft = {
			...testing_session,
			test_scope: testing_session.test_scope ?? '',
			environment: testing_session.environment ?? null
		};
		editOpen = true;
	}
</script>

<Card class={ui.cardPanel}>
	<CardContent class="p-0">
		<div class="flex items-start justify-between gap-4 {ui.cardPadding}">
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

			<Button
				type="button"
				size="sm"
				variant="ghost"
				class="{ui.controlSm} shrink-0 px-3 text-xs"
				onclick={openEdit}
			>
				<PencilIcon class="size-3.5" />
				Edit
			</Button>
		</div>

		<div class="border-t border-border/60 {ui.cardPadding}">
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
		</div>
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
							<Label for="meta-tester-version" class={ui.label}>Tester Version</Label>
							<Input
								id="meta-tester-version"
								name="tester_version"
								class={ui.input}
								bind:value={sessionDraft.tester_version}
								required
							/>
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label class={ui.label}>Tester Education Level</Label>
							<Select
								type="single"
								value={sessionDraft.tester_education_level}
								onValueChange={(value) => {
									if (value) {
										sessionDraft.tester_education_level =
											value as TestingSession['tester_education_level'];
									}
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>
									{sessionDraft.tester_education_level}
								</SelectTrigger>
								<SelectContent>
									{#each educationLevels as level}
										<SelectItem value={level}>{level}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input
								type="hidden"
								name="tester_education_level"
								value={sessionDraft.tester_education_level}
							/>
						</div>
						<div class={ui.field}>
							<Label class={ui.label}>Environment</Label>
							<Select
								type="single"
								value={environmentValue}
								onValueChange={(value) => {
									sessionDraft.environment = value === '' ? null : (value as TestingSession['environment']);
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
							required
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
