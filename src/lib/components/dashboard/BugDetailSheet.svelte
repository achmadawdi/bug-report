<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { mergeAreas } from '$lib/areas.js';
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
	import { EMPTY_DISPLAY } from '$lib/format.js';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
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

	const areaOptions = $derived(mergeAreas(areas));

	function listToText(values: string[] | undefined) {
		return (values ?? []).join('\n');
	}
</script>

<Sheet bind:open>
	<SheetContent class="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-lg">
		{#if issue}
			{@const bug = issue}
			<SheetHeader class={cn(ui.overlayHeader, 'space-y-2')}>
				<SheetDescription class="font-mono text-xs tracking-wide text-muted-foreground uppercase">
					{bug.id}
				</SheetDescription>
				<SheetTitle class="text-left text-xl leading-snug font-semibold">{bug.title}</SheetTitle>
			</SheetHeader>

			<div class="flex min-h-0 flex-1 flex-col">
				<form
					id="update-issue-form"
					method="POST"
					action="?/updateIssue"
					class="contents"
					use:enhance={() => {
						saving = true;
						return async ({ result, update }) => {
							try {
								await update();
								if (result.type === 'success') {
									toast.success(`${bug.id} updated`);
									open = false;
								} else if (result.type === 'failure') {
									toast.error(
										(result.data as { message?: string })?.message ??
											'Failed to update issue'
									);
								} else if (result.type === 'error') {
									toast.error('An unexpected error occurred while updating the issue');
								}
							} finally {
								saving = false;
							}
						};
					}}
				>
					<input type="hidden" name="id" value={bug.id} />
				</form>

				<div class="{ui.overlayBody} {ui.formSections}">
					<section class={ui.section}>
						<h3 class={ui.sectionTitle}>Issue</h3>

						<div class="grid {ui.grid} sm:grid-cols-2">
							<div class="{ui.field} sm:col-span-2">
								<Label for="title" class={ui.label}>Title</Label>
								<Input
									id="title"
									name="title"
									form="update-issue-form"
									class={ui.input}
									bind:value={bug.title}
									required
								/>
							</div>
							<div class={ui.field}>
								<Label for="category" class={ui.label}>Category</Label>
								<Input
									id="category"
									name="category"
									form="update-issue-form"
									class={ui.input}
									bind:value={bug.category}
									required
								/>
							</div>
							<div class={ui.field}>
								<Label for="source_page" class={ui.label}>Source Page</Label>
								<Input
									id="source_page"
									name="source_page"
									form="update-issue-form"
									type="number"
									class={ui.input}
									placeholder={EMPTY_DISPLAY}
									value={bug.source_page ?? ''}
									oninput={(event) => {
										const value = (event.currentTarget as HTMLInputElement).value;
										bug.source_page = value ? Number(value) : undefined;
									}}
								/>
							</div>
						</div>
					</section>

					<section class={ui.section}>
						<h3 class={ui.sectionTitle}>Classification</h3>

						<div class="grid {ui.grid} sm:grid-cols-2">
							<div class={ui.field}>
								<Label class={ui.label}>Area</Label>
								<Select
									type="single"
									value={bug.area}
									onValueChange={(value) => {
										if (value) bug.area = value;
									}}
								>
									<SelectTrigger class={ui.selectTrigger}>{bug.area}</SelectTrigger>
									<SelectContent>
										{#each areaOptions as area}
											<SelectItem value={area}>{area}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<input type="hidden" name="area" form="update-issue-form" value={bug.area} />
							</div>

							<div class={ui.field}>
								<Label class={ui.label}>Status</Label>
								<Select
									type="single"
									value={bug.status}
									onValueChange={(value) => {
										if (value) bug.status = value as Issue['status'];
									}}
								>
									<SelectTrigger class={ui.selectTrigger}>
										{STATUS_LABELS[bug.status]}
									</SelectTrigger>
									<SelectContent>
										{#each STATUSES as status}
											<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<input type="hidden" name="status" form="update-issue-form" value={bug.status} />
							</div>

							<div class={ui.field}>
								<Label class={ui.label}>Severity</Label>
								<Select
									type="single"
									value={bug.severity}
									onValueChange={(value) => {
										if (value) bug.severity = value as Issue['severity'];
									}}
								>
									<SelectTrigger class={ui.selectTrigger}>{bug.severity}</SelectTrigger>
									<SelectContent>
										{#each SEVERITIES as severity}
											<SelectItem value={severity}>{severity}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
								<input
									type="hidden"
									name="severity"
									form="update-issue-form"
									value={bug.severity}
								/>
							</div>
						</div>
					</section>

					<section class={ui.section}>
						<h3 class={ui.sectionTitle}>Findings</h3>

						<div class={ui.field}>
							<Label for="finding" class={ui.label}>Findings (one per line)</Label>
							<Textarea
								id="finding"
								name="finding"
								form="update-issue-form"
								rows={3}
								class={ui.textarea}
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

						<div class={ui.field}>
							<Label for="expected_result" class={ui.label}>Expected Result (one per line)</Label>
							<Textarea
								id="expected_result"
								name="expected_result"
								form="update-issue-form"
								rows={3}
								class={ui.textarea}
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
					</section>

					<section class={ui.section}>
						<h3 class={ui.sectionTitle}>Additional Details</h3>

						<div class="grid {ui.grid} sm:grid-cols-2">
							<div class={ui.field}>
								<Label for="evidence" class={ui.label}>Evidence</Label>
								<Input
									id="evidence"
									name="evidence"
									form="update-issue-form"
									class={ui.input}
									placeholder={EMPTY_DISPLAY}
									bind:value={bug.evidence}
								/>
							</div>

							<div class={ui.field}>
								<Label for="reason" class={ui.label}>Reason</Label>
								<Input
									id="reason"
									name="reason"
									form="update-issue-form"
									class={ui.input}
									placeholder={EMPTY_DISPLAY}
									bind:value={bug.reason}
								/>
							</div>
						</div>

						<div class={ui.field}>
							<Label for="suggested_text_or_behavior" class={ui.label}>
								Suggested Text / Behavior
							</Label>
							<Textarea
								id="suggested_text_or_behavior"
								name="suggested_text_or_behavior"
								form="update-issue-form"
								rows={2}
								class={ui.textareaSm}
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

						<div class={ui.field}>
							<Label for="notes" class={ui.label}>Notes</Label>
							<Textarea
								id="notes"
								name="notes"
								form="update-issue-form"
								rows={2}
								class={ui.textareaSm}
								placeholder={EMPTY_DISPLAY}
								bind:value={bug.notes}
							/>
						</div>
					</section>

					<EvidenceMediaSection bind:issue />
				</div>

				<SheetFooter class="rounded-none {ui.overlayFooter}">
					<Button type="submit" form="update-issue-form" class="min-w-36" disabled={saving}>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</SheetFooter>
			</div>
		{/if}
	</SheetContent>
</Sheet>
