<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
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
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		areas,
		nextId
	}: {
		open?: boolean;
		areas: string[];
		nextId: string;
	} = $props();

	let saving = $state(false);

	function createDraft() {
		return {
			area: areas[0] ?? 'Level 1',
			title: '',
			severity: 'Medium' as Issue['severity'],
			category: '',
			status: 'open' as Issue['status'],
			finding: '',
			expected_result: '',
			notes: ''
		};
	}

	let draft = $state(createDraft());

	$effect(() => {
		if (open) {
			draft = createDraft();
		}
	});
</script>

<Dialog bind:open>
	<DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>Add Bug</DialogTitle>
			<DialogDescription>
				A new issue will be created as <span class="font-mono">{nextId}</span>.
			</DialogDescription>
		</DialogHeader>

		<form
			method="POST"
			action="?/addIssue"
			class="space-y-4"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					await update();
					if (result.type === 'success') {
						toast.success('Bug added');
						open = false;
					} else if (result.type === 'failure') {
						toast.error(
							(result.data as { message?: string })?.message ?? 'Failed to add bug'
						);
					}
				};
			}}
		>
			<div class="space-y-2">
				<Label for="new-title">Title</Label>
				<Input id="new-title" name="title" bind:value={draft.title} required />
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label>Area</Label>
					<Select
						type="single"
						value={draft.area}
						onValueChange={(value) => {
							if (value) draft.area = value;
						}}
					>
						<SelectTrigger class="w-full">{draft.area}</SelectTrigger>
						<SelectContent>
							{#each areas as area}
								<SelectItem value={area}>{area}</SelectItem>
							{/each}
							<SelectItem value="Global UI">Global UI</SelectItem>
							<SelectItem value="Multiplayer">Multiplayer</SelectItem>
						</SelectContent>
					</Select>
					<input type="hidden" name="area" value={draft.area} />
				</div>

				<div class="space-y-2">
					<Label for="new-category">Category</Label>
					<Input id="new-category" name="category" bind:value={draft.category} required />
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label>Severity</Label>
					<Select
						type="single"
						value={draft.severity}
						onValueChange={(value) => {
							if (value) draft.severity = value as Issue['severity'];
						}}
					>
						<SelectTrigger class="w-full">{draft.severity}</SelectTrigger>
						<SelectContent>
							{#each SEVERITIES as severity}
								<SelectItem value={severity}>{severity}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
					<input type="hidden" name="severity" value={draft.severity} />
				</div>

				<div class="space-y-2">
					<Label>Status</Label>
					<Select
						type="single"
						value={draft.status}
						onValueChange={(value) => {
							if (value) draft.status = value as Issue['status'];
						}}
					>
						<SelectTrigger class="w-full">{STATUS_LABELS[draft.status]}</SelectTrigger>
						<SelectContent>
							{#each STATUSES as status}
								<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
					<input type="hidden" name="status" value={draft.status} />
				</div>
			</div>

			<div class="space-y-2">
				<Label for="new-finding">Findings (one per line)</Label>
				<Textarea id="new-finding" name="finding" rows={4} bind:value={draft.finding} required />
			</div>

			<div class="space-y-2">
				<Label for="new-expected">Expected Result (one per line)</Label>
				<Textarea
					id="new-expected"
					name="expected_result"
					rows={4}
					bind:value={draft.expected_result}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="new-notes">Notes</Label>
				<Textarea id="new-notes" name="notes" rows={3} bind:value={draft.notes} />
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Adding...' : 'Add Bug'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
