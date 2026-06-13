<script lang="ts">
	import { untrack } from 'svelte';
	import type { Issue, ReportView } from '$lib/types.js';
	import { revokePendingPreview, type PendingEvidenceItem } from '$lib/evidence.js';
	import { flushPendingEvidence } from '$lib/evidence-upload.js';
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
	import IssueFormFields, { type IssueFormDraft } from './IssueFormFields.svelte';
	import EvidenceMediaSection from './EvidenceMediaSection.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import {
		enhanceReportForm,
		getReportSlugContext,
		reportFormAction
	} from '$lib/report-forms.js';

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
	let createdIssue = $state<Issue | null>(null);
	let pendingEvidence = $state<PendingEvidenceItem[]>([]);
	let previousOpen = false;

	const reportSlug = getReportSlugContext();

	function createDraft(): IssueFormDraft {
		return {
			area: areas[0] ?? 'Level 1',
			title: '',
			severity: 'Medium',
			category: '',
			status: 'open',
			finding: [],
			expected_result: [],
			notes: '',
			evidence: '',
			reason: '',
			suggested_text_or_behavior: []
		};
	}

	let draft = $state<IssueFormDraft>(createDraft());

	function clearPendingEvidence() {
		for (const item of pendingEvidence) {
			revokePendingPreview(item);
		}
		pendingEvidence = [];
	}

	function resetDialog() {
		clearPendingEvidence();
		createdIssue = null;
		draft = createDraft();
	}

	function closeDialog() {
		open = false;
	}

	$effect(() => {
		const isOpen = open;

		untrack(() => {
			if (isOpen !== previousOpen) {
				resetDialog();
				previousOpen = isOpen;
			}
		});
	});
</script>

<Dialog bind:open>
	<DialogContent class="flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle class="text-lg leading-tight">Add Bug</DialogTitle>
			<DialogDescription class="text-sm leading-relaxed">
				{#if createdIssue}
					<span class="font-mono text-foreground">{createdIssue.id}</span> created — attach more
					evidence or click Done.
				{:else}
					A new issue will be created as <span class="font-mono text-foreground">{nextId}</span>.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="flex min-h-0 flex-1 flex-col">
			{#if !createdIssue}
				<form
					id="add-issue-form"
					method="POST"
					action={reportFormAction(reportSlug, '?/addIssue')}
					class="contents"
					use:enhance={enhanceReportForm(reportSlug, {
						onSubmit: () => {
							saving = true;
						},
						onSuccess: async (data) => {
							const report = data?.report as ReportView | undefined;
							const created =
								report?.issues.find((issue) => issue.id === nextId) ?? report?.issues.at(-1);

							if (!created) {
								toast.success('Bug added');
								closeDialog();
								return;
							}

							try {
								const queued = [...pendingEvidence];
								const withEvidence =
									queued.length > 0
										? await flushPendingEvidence(created.id, queued)
										: null;

								clearPendingEvidence();
								createdIssue = structuredClone(withEvidence ?? created);
								toast.success(
									queued.length > 0 ? 'Bug added with evidence' : 'Bug added'
								);
							} catch (err) {
								createdIssue = structuredClone(created);
								toast.error(
									err instanceof Error
										? err.message
										: 'Bug saved but some evidence failed to upload'
								);
							}
						},
						onFailure: (data) => {
							toast.error(data?.message ?? 'Failed to add bug');
						},
						onError: () => {
							toast.error('An unexpected error occurred while adding the bug');
						},
						onFinally: () => {
							saving = false;
						}
					})}
				></form>
			{/if}

			<div class="{ui.overlayBody} {ui.formSections}">
				{#if createdIssue}
					<IssueFormFields bind:draft={createdIssue} {areas} mode="edit" idPrefix="new-" />
					<EvidenceMediaSection bind:issue={createdIssue} idPrefix="new-" />
				{:else}
					<IssueFormFields
						bind:draft
						{areas}
						formId="add-issue-form"
						mode="add"
						idPrefix="new-"
					/>
					<EvidenceMediaSection
						mode="pending"
						bind:pending={pendingEvidence}
						idPrefix="pending-"
					/>
				{/if}
			</div>

			<DialogFooter class="m-0 rounded-none {ui.overlayFooter}">
				<Button type="button" variant="outline" onclick={closeDialog}>
					{createdIssue ? 'Done' : 'Cancel'}
				</Button>
				{#if !createdIssue}
					<Button type="submit" form="add-issue-form" disabled={saving}>
						{saving ? 'Adding...' : 'Add Bug'}
					</Button>
				{/if}
			</DialogFooter>
		</div>
	</DialogContent>
</Dialog>
