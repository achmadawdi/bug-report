<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetFooter,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet/index.js';
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
	import EvidenceMediaSection from './EvidenceMediaSection.svelte';
	import IssueFieldsDisplay from './IssueFieldsDisplay.svelte';
	import { EMPTY_DISPLAY } from '$lib/format.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let {
		issue = $bindable(null),
		areas,
		open = $bindable(false)
	}: {
		issue: Issue | null;
		areas: string[];
		open?: boolean;
	} = $props();

	let saving = $state(false);

	function listToText(values: string[] | undefined) {
		return (values ?? []).join('\n');
	}
</script>

<Sheet bind:open>
	<SheetContent class="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
		{#if issue}
			{@const bug = issue}
			<SheetHeader class="shrink-0 border-b border-border px-6 py-5 pr-14">
				<SheetTitle class="text-lg leading-snug">{bug.title}</SheetTitle>
				<SheetDescription class="font-mono text-xs">{bug.id}</SheetDescription>
			</SheetHeader>

			<form
				method="POST"
				action="?/updateIssue"
				class="flex min-h-0 flex-1 flex-col"
				use:enhance={() => {
					saving = true;
					return async ({ result, update }) => {
						saving = false;
						await update();
						if (result.type === 'success') {
							toast.success(`${bug.id} updated`);
							open = false;
						} else if (result.type === 'failure') {
							toast.error(
								(result.data as { message?: string })?.message ?? 'Failed to update issue'
							);
						}
					};
				}}
			>
				<input type="hidden" name="id" value={bug.id} />

				<div class="flex-1 space-y-6 overflow-y-auto px-6 py-5">
					<div class="rounded-lg border border-border bg-secondary/20 p-4">
						<p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Current values
						</p>
						<IssueFieldsDisplay issue={bug} />
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="title">Title</Label>
							<Input id="title" name="title" bind:value={bug.title} required />
						</div>
						<div class="space-y-1.5">
							<Label for="category">Category</Label>
							<Input id="category" name="category" bind:value={bug.category} required />
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label>Area</Label>
							<Select
								type="single"
							value={bug.area}
							onValueChange={(value) => {
								if (value) bug.area = value;
							}}
						>
							<SelectTrigger class="w-full">
								{bug.area}
								</SelectTrigger>
								<SelectContent>
									{#each areas as area}
										<SelectItem value={area}>{area}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="area" value={bug.area} />
						</div>

						<div class="space-y-1.5">
							<Label>Status</Label>
							<Select
								type="single"
							value={bug.status}
							onValueChange={(value) => {
								if (value) bug.status = value as Issue['status'];
							}}
						>
							<SelectTrigger class="w-full">
								{STATUS_LABELS[bug.status]}
								</SelectTrigger>
								<SelectContent>
									{#each STATUSES as status}
										<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="status" value={bug.status} />
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label>Severity</Label>
							<Select
								type="single"
							value={bug.severity}
							onValueChange={(value) => {
								if (value) bug.severity = value as Issue['severity'];
							}}
						>
							<SelectTrigger class="w-full">
								{bug.severity}
								</SelectTrigger>
								<SelectContent>
									{#each SEVERITIES as severity}
										<SelectItem value={severity}>{severity}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
							<input type="hidden" name="severity" value={bug.severity} />
						</div>

						<div class="space-y-1.5">
							<Label for="source_page">Source Page</Label>
							<Input
								id="source_page"
								name="source_page"
								type="number"
								placeholder={EMPTY_DISPLAY}
							value={bug.source_page ?? ''}
							oninput={(event) => {
								const value = (event.currentTarget as HTMLInputElement).value;
								bug.source_page = value ? Number(value) : undefined;
							}}
							/>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="finding">Findings (one per line)</Label>
						<Textarea
							id="finding"
							name="finding"
							rows={4}
							class="min-h-24 resize-y"
							placeholder={EMPTY_DISPLAY}
						value={listToText(bug.finding)}
						oninput={(event: Event) => {
							bug.finding = (event.currentTarget as HTMLTextAreaElement).value
									.split('\n')
									.map((line) => line.trim())
									.filter(Boolean);
							}}
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="expected_result">Expected Result (one per line)</Label>
						<Textarea
							id="expected_result"
							name="expected_result"
							rows={4}
							class="min-h-24 resize-y"
							placeholder={EMPTY_DISPLAY}
						value={listToText(bug.expected_result)}
						oninput={(event: Event) => {
							bug.expected_result = (event.currentTarget as HTMLTextAreaElement).value
									.split('\n')
									.map((line) => line.trim())
									.filter(Boolean);
							}}
						/>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="evidence">Evidence</Label>
							<Input
								id="evidence"
								name="evidence"
								placeholder={EMPTY_DISPLAY}
								bind:value={bug.evidence}
							/>
						</div>

						<div class="space-y-1.5">
							<Label for="reason">Reason</Label>
							<Input
								id="reason"
								name="reason"
								placeholder={EMPTY_DISPLAY}
								bind:value={bug.reason}
							/>
						</div>
					</div>

					<EvidenceMediaSection bind:issue />

					<div class="space-y-1.5">
						<Label for="suggested_text_or_behavior">Suggested Text / Behavior</Label>
						<Textarea
							id="suggested_text_or_behavior"
							name="suggested_text_or_behavior"
							rows={3}
							class="resize-y"
							placeholder={EMPTY_DISPLAY}
						value={listToText(bug.suggested_text_or_behavior)}
						oninput={(event: Event) => {
							const value = (event.currentTarget as HTMLTextAreaElement).value;
							bug.suggested_text_or_behavior = value
									.split('\n')
									.map((line) => line.trim())
									.filter(Boolean);
							}}
						/>
					</div>

					<div class="space-y-1.5">
						<Label for="notes">Notes</Label>
						<Textarea
							id="notes"
							name="notes"
							rows={3}
							class="resize-y"
							placeholder={EMPTY_DISPLAY}
							bind:value={bug.notes}
						/>
					</div>
				</div>

				<SheetFooter class="shrink-0 border-t border-border bg-card px-6 py-4">
					<Button type="submit" class="w-full sm:w-auto" disabled={saving}>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</SheetFooter>
			</form>
		{/if}
	</SheetContent>
</Sheet>
