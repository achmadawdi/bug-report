<script lang="ts">
	import type { BugStatus, EvidenceMedia, Issue } from '$lib/types.js';
	import {
		AREA_BADGE_STYLE,
		CATEGORY_BADGE_STYLE,
		SEVERITY_STYLES,
		STATUSES,
		STATUS_DOT_STYLES,
		STATUS_LABELS,
		STATUS_STYLES
	} from '$lib/constants.js';
	import { displayList, EMPTY_DISPLAY } from '$lib/format.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { badgeVariants } from '$lib/components/ui/badge/badge.svelte';
	import { cn } from '$lib/utils.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import EvidenceThumbnails from './EvidenceThumbnails.svelte';
	import EvidenceLightbox from './EvidenceLightbox.svelte';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import { toast } from 'svelte-sonner';
	import {
		enhanceReportForm,
		getReportSlugContext,
		reportFormAction
	} from '$lib/report-forms.js';
	import { enhance } from '$app/forms';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { ui } from '$lib/ui-layout.js';

	let {
		issue,
		onclick,
		onDeleted
	}: {
		issue: Issue;
		onclick: () => void;
		onDeleted?: (id: string) => void;
	} = $props();

	let previewMedia = $state<EvidenceMedia | null>(null);
	let lightboxOpen = $state(false);
	let statusForm = $state<HTMLFormElement | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);
	let statusMenuOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let statusUpdating = $state(false);
	let deleteSaving = $state(false);
	let undoStatus: BugStatus | null = null;

	const reportSlug = getReportSlugContext();

	const findingPreview = $derived(displayList(issue.finding)[0]);
	const mediaCount = $derived(issue.evidence_media?.length ?? 0);

	function submitStatus(status: BugStatus) {
		if (!statusForm || statusUpdating) return;
		statusMenuOpen = false;
		const statusInput = statusForm.elements.namedItem('status') as HTMLInputElement | null;
		if (statusInput) statusInput.value = status;
		statusForm.requestSubmit();
	}

	function openDetail() {
		statusMenuOpen = false;
		deleteDialogOpen = false;
		onclick();
	}

	function openPreview(media: EvidenceMedia) {
		previewMedia = media;
		lightboxOpen = true;
	}

	function handleCardClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('form, button, a, input, select, textarea, [data-no-card-click]')) {
			return;
		}
		openDetail();
	}

	function handleCardKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openDetail();
		}
	}

</script>

<div class="group w-full">
	<div
		class="w-full cursor-pointer text-left"
		role="button"
		tabindex="0"
		onclick={handleCardClick}
		onkeydown={handleCardKeydown}
	>
		<Card
			class={cn(
				ui.cardPanel,
				'border-border/50 bg-card/65 backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card-hover hover:shadow-sm'
			)}
		>
			<div class="flex {ui.gridLg} {ui.cardPadding}">
				<div class="flex min-w-0 flex-1 flex-col gap-2">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 space-y-1">
							<p class="font-mono text-xs text-muted-foreground">{issue.id}</p>
							<h3 class="text-base font-semibold leading-snug sm:text-lg">{issue.title}</h3>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<button
								type="button"
								data-no-card-click
								aria-label="Delete bug"
								class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
								onclick={(event) => {
									event.stopPropagation();
									statusMenuOpen = false;
									deleteDialogOpen = true;
								}}
							>
								<Trash2Icon class="size-3.5" />
							</button>
							<button
								type="button"
								data-no-card-click
								aria-label="View bug details"
								class="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
								onclick={(event) => {
									event.stopPropagation();
									openDetail();
								}}
							>
								Details
								<ChevronRightIcon class="size-3.5" />
							</button>
						</div>
					</div>

					<div class={ui.badgeRow}>
						<Badge variant="outline" class={SEVERITY_STYLES[issue.severity].badge}>
							{issue.severity}
						</Badge>

						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<span
							class="inline-flex"
							role="presentation"
							data-no-card-click
							onpointerdown={(event) => event.stopPropagation()}
							onclick={(event) => event.stopPropagation()}
							onkeydown={(event) => event.stopPropagation()}
						>
							<form
								bind:this={statusForm}
								method="POST"
								action={reportFormAction(reportSlug, '?/updateStatus')}
								use:enhance={enhanceReportForm(reportSlug, {
									onSubmit: () => {
										statusUpdating = true;
										statusMenuOpen = false;
									},
									onSuccess: () => {
										const undo = undoStatus;
										undoStatus = null;
										if (undo) {
											toast.success(`${issue.id} marked as fixed`, {
												duration: 5000,
												action: {
													label: 'Undo',
													onClick: () => submitStatus(undo)
												}
											});
										} else {
											toast.success(`${issue.id} status updated`, { duration: 2500 });
										}
									},
									onFailure: (data) => {
										toast.error(data?.message ?? 'Failed to update status');
									},
									onError: () => {
										toast.error('An unexpected error occurred while updating status');
									},
									onFinally: () => {
										statusUpdating = false;
										statusMenuOpen = false;
									}
								})}
							>
								<input type="hidden" name="id" value={issue.id} />
								<input type="hidden" name="status" value={issue.status} />
								{#key `${issue.id}-${issue.status}`}
									<DropdownMenu bind:open={statusMenuOpen}>
										<DropdownMenuTrigger disabled={statusUpdating}>
											{#snippet child({ props })}
												<button
													{...props}
													type="button"
													disabled={statusUpdating || Boolean(props.disabled)}
													aria-busy={statusUpdating}
													aria-label={`Change status (${STATUS_LABELS[issue.status]})`}
													class={cn(
														badgeVariants({ variant: 'outline' }),
														STATUS_STYLES[issue.status],
														statusUpdating && 'pointer-events-none opacity-70'
													)}
												>
													{#if statusUpdating}
														<Loader2Icon class="size-3 animate-spin" />
														Updating…
													{:else}
														{STATUS_LABELS[issue.status]}
														<ChevronDownIcon class="size-3 opacity-70" />
													{/if}
												</button>
											{/snippet}
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											{#each STATUSES as status}
												<DropdownMenuItem
													class={cn(
														'cursor-pointer',
														status === issue.status && 'bg-accent'
													)}
													disabled={statusUpdating}
													onSelect={() => submitStatus(status)}
												>
													<span
														class="size-2 shrink-0 rounded-full {STATUS_DOT_STYLES[status]}"
													></span>
													{STATUS_LABELS[status]}
												</DropdownMenuItem>
											{/each}
										</DropdownMenuContent>
									</DropdownMenu>
								{/key}
							</form>
						</span>

						<Badge variant="outline" class={AREA_BADGE_STYLE}>
							{issue.area}
						</Badge>
						<Badge variant="outline" class={CATEGORY_BADGE_STYLE}>
							{issue.category}
						</Badge>
					</div>

					<p
						class="line-clamp-2 text-sm leading-relaxed sm:line-clamp-3 {findingPreview ===
						EMPTY_DISPLAY
							? 'text-muted-foreground/60'
							: 'text-muted-foreground'}"
					>
						{findingPreview}
					</p>

					<div class="text-xs text-muted-foreground">
						<span>Media {mediaCount > 0 ? mediaCount : EMPTY_DISPLAY}</span>
					</div>
				</div>

				<div class="hidden w-32 shrink-0 sm:block md:w-40 lg:w-44">
					<EvidenceThumbnails {issue} variant="card" onPreview={openPreview} />
				</div>
			</div>

			<div class="border-t border-border {ui.cardPadding} sm:hidden">
				<EvidenceThumbnails {issue} variant="card" onPreview={openPreview} />
			</div>
		</Card>
	</div>
</div>

<EvidenceLightbox bind:media={previewMedia} bind:open={lightboxOpen} />

<form
	bind:this={deleteForm}
	method="POST"
	action={reportFormAction(reportSlug, '?/deleteIssue')}
	class="hidden"
	use:enhance={enhanceReportForm(reportSlug, {
		onSubmit: () => {
			deleteSaving = true;
		},
		onSuccess: () => {
			deleteDialogOpen = false;
			toast.success(`${issue.id} deleted`);
			onDeleted?.(issue.id);
		},
		onFailure: (data) => {
			toast.error(data?.message ?? 'Failed to delete bug');
		},
		onError: () => {
			toast.error('An unexpected error occurred while deleting the bug');
		},
		onFinally: () => {
			deleteSaving = false;
		}
	})}
>
	<input type="hidden" name="id" value={issue.id} />
</form>

<ConfirmDeleteDialog
	bind:open={deleteDialogOpen}
	title="Delete {issue.id}?"
	description="Delete “{issue.title}”? This permanently removes the bug and any attached evidence. This cannot be undone."
	loading={deleteSaving}
	onConfirm={() => deleteForm?.requestSubmit()}
	onCancel={() => {
		deleteDialogOpen = false;
	}}
/>
