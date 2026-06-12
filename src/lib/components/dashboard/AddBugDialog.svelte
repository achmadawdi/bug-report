<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { ui } from '$lib/ui-layout.js';
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
	<DialogContent class="flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle class="text-lg leading-tight">Add Bug</DialogTitle>
			<DialogDescription class="text-sm leading-relaxed">
				A new issue will be created as <span class="font-mono text-foreground">{nextId}</span>.
			</DialogDescription>
		</DialogHeader>

		<form
			method="POST"
			action="?/addIssue"
			class="flex min-h-0 flex-1 flex-col"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					try {
						await update();
						if (result.type === 'success') {
							toast.success('Bug added');
							open = false;
						} else if (result.type === 'failure') {
							toast.error(
								(result.data as { message?: string })?.message ?? 'Failed to add bug'
							);
						} else if (result.type === 'error') {
							toast.error('An unexpected error occurred while adding the bug');
						}
					} finally {
						saving = false;
					}
				};
			}}
		>
			<div class={ui.overlayBody}>
				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Issue</h3>

					<div class={ui.field}>
						<Label for="new-title" class={ui.label}>Title</Label>
						<Input
							id="new-title"
							name="title"
							class={ui.input}
							bind:value={draft.title}
							required
						/>
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Classification</h3>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label class={ui.label}>Area</Label>
							<Select
								type="single"
								value={draft.area}
								onValueChange={(value) => {
									if (value) draft.area = value;
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>{draft.area}</SelectTrigger>
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

						<div class={ui.field}>
							<Label for="new-category" class={ui.label}>Category</Label>
							<Input
								id="new-category"
								name="category"
								class={ui.input}
								bind:value={draft.category}
								required
							/>
						</div>
					</div>

					<div class="grid {ui.grid} sm:grid-cols-2">
						<div class={ui.field}>
							<Label class={ui.label}>Severity</Label>
							<Select
								type="single"
								value={draft.severity}
								onValueChange={(value) => {
									if (value) draft.severity = value as Issue['severity'];
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>{draft.severity}</SelectTrigger>
								<SelectContent>
									{#each SEVERITIES as severity}
										<SelectItem value={severity}>{severity}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="severity" value={draft.severity} />
						</div>

						<div class={ui.field}>
							<Label class={ui.label}>Status</Label>
							<Select
								type="single"
								value={draft.status}
								onValueChange={(value) => {
									if (value) draft.status = value as Issue['status'];
								}}
							>
								<SelectTrigger class={ui.selectTrigger}>
									{STATUS_LABELS[draft.status]}
								</SelectTrigger>
								<SelectContent>
									{#each STATUSES as status}
										<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="status" value={draft.status} />
						</div>
					</div>
				</section>

				<section class={ui.section}>
					<h3 class={ui.sectionTitle}>Details</h3>

					<div class={ui.field}>
						<Label for="new-finding" class={ui.label}>Findings (one per line)</Label>
						<Textarea
							id="new-finding"
							name="finding"
							rows={3}
							class={ui.textarea}
							bind:value={draft.finding}
							required
						/>
					</div>

					<div class={ui.field}>
						<Label for="new-expected" class={ui.label}>Expected Result (one per line)</Label>
						<Textarea
							id="new-expected"
							name="expected_result"
							rows={3}
							class={ui.textarea}
							bind:value={draft.expected_result}
							required
						/>
					</div>

					<div class={ui.field}>
						<Label for="new-notes" class={ui.label}>Notes</Label>
						<Textarea
							id="new-notes"
							name="notes"
							rows={2}
							class={ui.textareaSm}
							bind:value={draft.notes}
						/>
					</div>
				</section>
			</div>

			<DialogFooter class="m-0 rounded-none {ui.overlayFooter}">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Adding...' : 'Add Bug'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
