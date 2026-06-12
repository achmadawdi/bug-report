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
	import Gamepad2Icon from '@lucide/svelte/icons/gamepad-2';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import UsersIcon from '@lucide/svelte/icons/users';
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
		test_scope: '',
		version: '',
		source_file: ''
	});

	const primaryItems = $derived([
		{ label: 'Platform', value: report.platform, icon: Gamepad2Icon },
		{ label: 'Version', value: report.version_tested, icon: MonitorIcon },
		{ label: 'Tester', value: `${report.tester} · ${report.device}`, icon: UsersIcon }
	]);

	function openEdit() {
		draft = { ...report };
		editOpen = true;
	}
</script>

<Card class="border-border bg-card">
	<CardContent class="space-y-2 p-3">
		<div class="flex items-start justify-between gap-3">
			<div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
				{#each primaryItems as item, index}
					{#if index > 0}
						<span class="hidden h-3.5 w-px bg-border sm:block" aria-hidden="true"></span>
					{/if}
					<div class="flex items-center gap-1.5">
						<item.icon class="size-3.5 shrink-0 text-primary" />
						<span class="text-muted-foreground">{item.label}</span>
						<span class="font-medium">{item.value}</span>
					</div>
				{/each}
			</div>

			<Button type="button" size="sm" variant="ghost" class="shrink-0" onclick={openEdit}>
				<PencilIcon class="size-3.5" />
				Edit
			</Button>
		</div>

		<div class="flex items-start gap-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
			<TargetIcon class="mt-0.5 size-3 shrink-0 text-primary" />
			<p>
				<span class="font-medium text-foreground/80">Scope:</span>
				{report.test_scope}
			</p>
		</div>
	</CardContent>
</Card>

<Dialog bind:open={editOpen}>
	<DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>Edit Report Details</DialogTitle>
			<DialogDescription>Changes are saved to the report JSON file.</DialogDescription>
		</DialogHeader>

		<form
			method="POST"
			action="?/updateReport"
			class="space-y-4"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					await update();
					if (result.type === 'success') {
						toast.success('Report details updated');
						editOpen = false;
					} else if (result.type === 'failure') {
						toast.error(
							(result.data as { message?: string })?.message ?? 'Failed to update report'
						);
					}
				};
			}}
		>
			<div class="space-y-1.5">
				<Label for="meta-title">Title</Label>
				<Input id="meta-title" name="title" bind:value={draft.title} required />
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label for="meta-type">Report Type</Label>
					<Input id="meta-type" name="type" bind:value={draft.type} required />
				</div>
				<div class="space-y-1.5">
					<Label for="meta-version">Release Version</Label>
					<Input id="meta-version" name="version" bind:value={draft.version} required />
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label for="meta-platform">Platform</Label>
					<Input id="meta-platform" name="platform" bind:value={draft.platform} required />
				</div>
				<div class="space-y-1.5">
					<Label for="meta-version-tested">Version Tested</Label>
					<Input
						id="meta-version-tested"
						name="version_tested"
						bind:value={draft.version_tested}
						required
					/>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label for="meta-tester">Tester</Label>
					<Input id="meta-tester" name="tester" bind:value={draft.tester} required />
				</div>
				<div class="space-y-1.5">
					<Label for="meta-device">Device</Label>
					<Input id="meta-device" name="device" bind:value={draft.device} required />
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="meta-tester-version">Tester Version</Label>
				<Input
					id="meta-tester-version"
					name="tester_version"
					bind:value={draft.tester_version}
					required
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="meta-scope">Test Scope</Label>
				<Textarea id="meta-scope" name="test_scope" rows={3} bind:value={draft.test_scope} required />
			</div>

			<div class="space-y-1.5">
				<Label for="meta-source">Source File</Label>
				<Input id="meta-source" name="source_file" bind:value={draft.source_file} required />
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (editOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving...' : 'Save Details'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
