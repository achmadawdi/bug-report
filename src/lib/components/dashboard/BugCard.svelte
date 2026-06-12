<script lang="ts">
	import type { BugStatus, EvidenceMedia, Issue } from '$lib/types.js';
	import { SEVERITY_STYLES, STATUSES, STATUS_LABELS, STATUS_STYLES } from '$lib/constants.js';
	import { displayList, EMPTY_DISPLAY } from '$lib/format.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import EvidenceThumbnails from './EvidenceThumbnails.svelte';
	import EvidenceLightbox from './EvidenceLightbox.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	let {
		issue,
		onclick
	}: {
		issue: Issue;
		onclick: () => void;
	} = $props();

	let previewMedia = $state<EvidenceMedia | null>(null);
	let lightboxOpen = $state(false);

	const findingPreview = $derived(displayList(issue.finding)[0]);
	const mediaCount = $derived(issue.evidence_media?.length ?? 0);

	function openPreview(media: EvidenceMedia) {
		previewMedia = media;
		lightboxOpen = true;
	}

	function handleCardClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('form, button, a, input, select, textarea, [data-no-card-click]')) {
			return;
		}
		onclick();
	}

	function handleCardKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onclick();
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
			class="border-border bg-card transition-colors hover:border-primary/40 hover:bg-card/80"
		>
			<div class="flex gap-4 p-4 sm:gap-5 sm:p-5">
				<div class="flex min-w-0 flex-1 flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 space-y-1">
							<p class="font-mono text-xs text-muted-foreground">{issue.id}</p>
							<h3 class="text-base font-semibold leading-snug sm:text-lg">{issue.title}</h3>
						</div>
						<ChevronRightIcon
							class="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
						/>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<Badge variant="outline" class={SEVERITY_STYLES[issue.severity].badge}>
							{issue.severity}
						</Badge>

						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<span
							class="inline-flex"
							role="presentation"
							onclick={(event) => event.stopPropagation()}
							onkeydown={(event) => event.stopPropagation()}
						>
							<form
								method="POST"
								action="?/updateStatus"
								use:enhance={() => {
									return async ({ result, update }) => {
										try {
											await update();
											if (result.type === 'success') {
												toast.success(`${issue.id} status updated`);
											} else if (result.type === 'failure') {
												toast.error(
													(result.data as { message?: string })?.message ??
														'Failed to update status'
												);
											} else if (result.type === 'error') {
												toast.error('An unexpected error occurred while updating status');
											}
										} catch {
											toast.error('An unexpected error occurred while updating status');
										}
									};
								}}
							>
								<input type="hidden" name="id" value={issue.id} />
								<DropdownMenu>
									<DropdownMenuTrigger>
										{#snippet child({ props })}
											<Button
												{...props}
												type="button"
												size="sm"
												variant="outline"
												class="h-6 gap-1 px-2 {STATUS_STYLES[issue.status]}"
											>
												{STATUS_LABELS[issue.status]}
												<ChevronDownIcon class="size-3" />
											</Button>
										{/snippet}
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										{#each STATUSES as status}
											<DropdownMenuItem>
												<button
													type="submit"
													name="status"
													value={status}
													class="w-full text-left"
												>
													{STATUS_LABELS[status as BugStatus]}
												</button>
											</DropdownMenuItem>
										{/each}
									</DropdownMenuContent>
								</DropdownMenu>
							</form>
						</span>

						<Badge variant="secondary">{issue.area}</Badge>
						<Badge variant="outline">{issue.category}</Badge>
					</div>

					<p
						class="line-clamp-2 text-sm leading-relaxed sm:line-clamp-3 {findingPreview ===
						EMPTY_DISPLAY
							? 'text-muted-foreground/60'
							: 'text-muted-foreground'}"
					>
						{findingPreview}
					</p>

					<div class="mt-auto text-xs text-muted-foreground">
						<span>Media {mediaCount > 0 ? mediaCount : EMPTY_DISPLAY}</span>
					</div>
				</div>

				<div
					class="hidden w-36 shrink-0 sm:block md:w-44 lg:w-52"
					role="presentation"
					onclick={(event) => event.stopPropagation()}
					onkeydown={(event) => event.stopPropagation()}
				>
					<EvidenceThumbnails {issue} variant="card" onPreview={openPreview} />
				</div>
			</div>

			<div
				class="border-t border-border px-4 pb-4 sm:hidden"
				role="presentation"
				onclick={(event) => event.stopPropagation()}
				onkeydown={(event) => event.stopPropagation()}
			>
				<EvidenceThumbnails {issue} variant="card" onPreview={openPreview} />
			</div>
		</Card>
	</div>
</div>

<EvidenceLightbox bind:media={previewMedia} bind:open={lightboxOpen} />
