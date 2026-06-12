<script lang="ts">
	import type { EvidenceMedia } from '$lib/types.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';

	let {
		media = $bindable(null),
		open = $bindable(false)
	}: {
		media: EvidenceMedia | null;
		open?: boolean;
	} = $props();
</script>

<Dialog bind:open>
	<DialogContent class="max-h-[90vh] max-w-4xl overflow-hidden p-0">
		{#if media}
			<DialogHeader class={cn(ui.overlayHeader)}>
				<DialogTitle class="capitalize">{media.type} evidence</DialogTitle>
				{#if media.caption}
					<DialogDescription>{media.caption}</DialogDescription>
				{/if}
			</DialogHeader>

			<div class="flex max-h-[70vh] items-center justify-center bg-black/40 {ui.cardPadding}">
				{#if media.type === 'image'}
					<img
						src={media.src}
						alt={media.caption ?? 'Evidence image'}
						class="max-h-[65vh] max-w-full rounded-md object-contain"
					/>
				{:else}
					<video
						src={media.src}
						controls
						class="max-h-[65vh] max-w-full rounded-md"
					>
						<track kind="captions" />
					</video>
				{/if}
			</div>
		{/if}
	</DialogContent>
</Dialog>
