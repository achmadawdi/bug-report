<script lang="ts">
	import type { ReportMeta } from '$lib/types.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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
	import { displayDate } from '$lib/format.js';
	import { ui } from '$lib/ui-layout.js';
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import UsersIcon from '@lucide/svelte/icons/users';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import TargetIcon from '@lucide/svelte/icons/target';
	import PencilIcon from '@lucide/svelte/icons/pencil';

	let { report }: { report: ReportMeta } = $props();

	let editOpen = $state(false);
	let saving = $state(false);
	let draft = $state<ReportMeta>({
		title: '',
		type: '',
		platform: '',
		version_tested: '',
		device: '',
		tester: '',
		tester_version: '',
		test_date: '',
		test_scope: '',
		version: '',
		source_file: ''
	});

	const primaryItems = $derived([
		{ label: 'Platform', value: report.platform, icon: Gamepad2Icon },
		{ label: 'Version', value: report.version_tested, icon: MonitorIcon },
		{ label: 'Tested', value: displayDate(report.test_date), icon: CalendarIcon },
		{ label: 'Tester', value: `${report.tester} · ${report.device}`, icon: UsersIcon }
	]);

	function openEdit() {
		draft = { ...report };
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
					<p class="mt-1 text-sm leading-relaxed text-foreground/90">{report.test_scope}</p>
				</div>
			</div>
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
							bind:value={draft.title}
							required
						/>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-type" class={ui.label}>
								Report Type
							</Label>
							<Input
								id="meta-type"
								name="type"
								class={ui.input}
								bind:value={draft.type}
								required
							/>
						</div>
						<div class={ui.field}>
							<Label for="meta-version" class={ui.label}>
								Release Version
							</Label>
							<Input
								id="meta-version"
								name="version"
								class={ui.input}
								bind:value={draft.version}
								required
							/>
						</div>
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Testing Session</h3>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-platform" class={ui.label}>
								Platform
							</Label>
							<Input
								id="meta-platform"
								name="platform"
								class={ui.input}
								bind:value={draft.platform}
								required
							/>
						</div>
						<div class={ui.field}>
							<Label for="meta-version-tested" class={ui.label}>
								Version Tested
							</Label>
							<Input
								id="meta-version-tested"
								name="version_tested"
								class={ui.input}
								bind:value={draft.version_tested}
								required
							/>
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-test-date" class={ui.label}>
								Test Date
							</Label>
							<Input
								id="meta-test-date"
								name="test_date"
								type="date"
								class={ui.input}
								bind:value={draft.test_date}
							/>
						</div>
						<div class={ui.field}>
							<Label for="meta-device" class={ui.label}>
								Device
							</Label>
							<Input
								id="meta-device"
								name="device"
								class={ui.input}
								bind:value={draft.device}
								required
							/>
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label for="meta-tester" class={ui.label}>
								Tester
							</Label>
							<Input
								id="meta-tester"
								name="tester"
								class={ui.input}
								bind:value={draft.tester}
								required
							/>
						</div>
						<div class={ui.field}>
							<Label for="meta-tester-version" class={ui.label}>
								Tester Version
							</Label>
							<Input
								id="meta-tester-version"
								name="tester_version"
								class={ui.input}
								bind:value={draft.tester_version}
								required
							/>
						</div>
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Scope & Source</h3>

					<div class={ui.field}>
						<Label for="meta-scope" class={ui.label}>
							Test Scope
						</Label>
						<Textarea
							id="meta-scope"
							name="test_scope"
							rows={4}
							class="min-h-24 resize-y bg-background leading-relaxed"
							bind:value={draft.test_scope}
							required
						/>
					</div>

					<div class={ui.field}>
						<Label for="meta-source" class={ui.label}>
							Source File
						</Label>
						<Input
							id="meta-source"
							name="source_file"
							class={ui.input}
							bind:value={draft.source_file}
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
