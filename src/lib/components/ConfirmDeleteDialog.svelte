<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { ui } from '$lib/ui-layout.js';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Delete',
		loading = false,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		loading?: boolean;
		onConfirm: () => void;
		onCancel?: () => void;
	} = $props();
</script>

<Dialog
	bind:open
	onOpenChange={(nextOpen) => {
		if (!nextOpen) onCancel?.();
	}}
>
	<DialogContent class="flex max-h-[min(90vh,32rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
		<DialogHeader class={ui.overlayHeader}>
			<DialogTitle class="text-lg leading-tight">{title}</DialogTitle>
			<DialogDescription class="text-sm leading-relaxed">{description}</DialogDescription>
		</DialogHeader>

		<DialogFooter class="m-0 rounded-none {ui.overlayFooter}">
			<Button
				type="button"
				variant="outline"
				disabled={loading}
				onclick={() => {
					open = false;
					onCancel?.();
				}}
			>
				Cancel
			</Button>
			<Button type="button" variant="destructive" disabled={loading} onclick={onConfirm}>
				{#if loading}
					<Loader2Icon class="size-4 animate-spin" />
				{/if}
				{confirmLabel}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
