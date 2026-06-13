<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetFooter,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import IssueFormFields from './IssueFormFields.svelte';
	import EvidenceMediaSection from './EvidenceMediaSection.svelte';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import {
		enhanceReportForm,
		getReportSlugContext,
		reportFormAction
	} from '$lib/report-forms.js';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { isResolvedStatus } from '$lib/constants.js';

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
	let markingFixed = $state(false);

	const reportSlug = getReportSlugContext();
	const canMarkFixed = $derived(issue ? !isResolvedStatus(issue.status) : false);
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
					action={reportFormAction(reportSlug, '?/updateIssue')}
					class="contents"
					use:enhance={enhanceReportForm(reportSlug, {
						onSubmit: () => {
							saving = true;
						},
						onSuccess: () => {
							toast.success(`${bug.id} updated`);
							open = false;
						},
						onFailure: (data) => {
							toast.error(data?.message ?? 'Failed to update issue');
						},
						onError: () => {
							toast.error('An unexpected error occurred while updating the issue');
						},
						onFinally: () => {
							saving = false;
						}
					})}
				>
					<input type="hidden" name="id" value={bug.id} />
				</form>

				<div class="{ui.overlayBody} {ui.formSections}">
					<IssueFormFields bind:draft={issue} {areas} formId="update-issue-form" mode="edit" />

					<EvidenceMediaSection bind:issue={issue} />
				</div>

				<SheetFooter class="rounded-none {ui.overlayFooter}">
					{#if canMarkFixed}
						<form
							method="POST"
							action={reportFormAction(reportSlug, '?/updateStatus')}
							use:enhance={enhanceReportForm(reportSlug, {
								onSubmit: () => {
									markingFixed = true;
								},
								onSuccess: () => {
									toast.success(`${bug.id} marked as fixed`);
									open = false;
								},
								onFailure: (data) => {
									toast.error(data?.message ?? 'Failed to update status');
								},
								onFinally: () => {
									markingFixed = false;
								}
							})}
						>
							<input type="hidden" name="id" value={bug.id} />
							<input type="hidden" name="status" value="fixed" />
							<Button type="submit" variant="outline" disabled={markingFixed || saving}>
								<CircleCheckIcon class="size-4" />
								{markingFixed ? 'Updating...' : 'Mark as Fixed'}
							</Button>
						</form>
					{/if}
					<Button type="submit" form="update-issue-form" class="min-w-36" disabled={saving}>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</SheetFooter>
			</div>
		{/if}
	</SheetContent>
</Sheet>
