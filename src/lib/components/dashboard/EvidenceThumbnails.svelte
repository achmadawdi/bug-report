<script lang="ts">
	import type { EvidenceMedia, Issue } from '$lib/types.js';
	import { getEvidencePreviewItems, hasEvidenceContent } from '$lib/evidence.js';
	import ImageIcon from '@lucide/svelte/icons/image';
	import PlayIcon from '@lucide/svelte/icons/play';

	let {
		issue,
		limit = 3,
		variant = 'compact',
		onPreview
	}: {
		issue: Issue;
		limit?: number;
		variant?: 'compact' | 'card';
		onPreview?: (media: EvidenceMedia) => void;
	} = $props();

	const previewItems = $derived(getEvidencePreviewItems(issue.evidence_media, limit));
	const extraCount = $derived(Math.max((issue.evidence_media?.length ?? 0) - limit, 0));
	const showPlaceholder = $derived(
		previewItems.length === 0 && Boolean(issue.evidence?.trim())
	);

	function handlePreview(event: MouseEvent, media: EvidenceMedia) {
		event.stopPropagation();
		onPreview?.(media);
	}
</script>

{#if previewItems.length > 0}
	{#if variant === 'card'}
		<div class="flex h-full flex-col gap-2">
			<button
				type="button"
				class="relative flex-1 overflow-hidden rounded-lg border border-border bg-secondary/40"
				onclick={(event) => handlePreview(event, previewItems[0])}
			>
				{#if previewItems[0].type === 'image'}
					<img
						src={previewItems[0].src}
						alt={previewItems[0].caption ?? 'Evidence'}
						class="size-full object-cover"
					/>
				{:else}
					<div class="flex size-full min-h-28 items-center justify-center bg-black/50">
						<PlayIcon class="size-8 text-white" />
					</div>
				{/if}
				{#if (issue.evidence_media?.length ?? 0) > 1}
					<span
						class="absolute right-2 bottom-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white"
					>
						+{(issue.evidence_media?.length ?? 0) - 1} more
					</span>
				{/if}
			</button>

			{#if previewItems.length > 1}
				<div class="grid grid-cols-2 gap-2">
					{#each previewItems.slice(1) as media (media.src)}
						<button
							type="button"
							class="relative aspect-video overflow-hidden rounded-md border border-border bg-secondary/40"
							onclick={(event) => handlePreview(event, media)}
						>
							{#if media.type === 'image'}
								<img
									src={media.src}
									alt={media.caption ?? 'Evidence'}
									class="size-full object-cover"
								/>
							{:else}
								<div class="flex size-full items-center justify-center bg-black/50">
									<PlayIcon class="size-4 text-white" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex items-center gap-2">
			{#each previewItems as media (media.src)}
				<button
					type="button"
					class="group relative size-14 overflow-hidden rounded-md border border-border bg-secondary/40"
					onclick={(event) => handlePreview(event, media)}
				>
					{#if media.type === 'image'}
						<img src={media.src} alt={media.caption ?? 'Evidence'} class="size-full object-cover" />
					{:else}
						<div class="flex size-full items-center justify-center bg-black/50">
							<PlayIcon class="size-5 text-white" />
						</div>
					{/if}
				</button>
			{/each}
			{#if extraCount > 0}
				<span class="text-xs text-muted-foreground">+{extraCount}</span>
			{/if}
		</div>
	{/if}
{:else if showPlaceholder}
	{#if variant === 'card'}
		<div
			class="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-center"
		>
			<ImageIcon class="size-6 text-muted-foreground" />
			<p class="line-clamp-3 text-xs text-muted-foreground">{issue.evidence}</p>
		</div>
	{:else}
		<div
			class="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground"
		>
			<ImageIcon class="size-3.5 shrink-0" />
			<span class="line-clamp-1">{issue.evidence}</span>
		</div>
	{/if}
{:else if variant === 'card' && !hasEvidenceContent(issue)}
	<div
		class="flex h-full min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 bg-secondary/10 p-3 text-center"
	>
		<ImageIcon class="size-5 text-muted-foreground/50" />
		<p class="text-[11px] text-muted-foreground/70">No media attached</p>
	</div>
{/if}
