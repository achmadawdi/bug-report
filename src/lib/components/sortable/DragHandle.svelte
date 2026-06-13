<script lang="ts">
	import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
	import { cn } from '$lib/utils.js';

	let {
		attributes = {},
		class: className = ''
	}: {
		attributes?: Record<string, unknown>;
		class?: string;
	} = $props();
</script>

<button
	type="button"
	class={cn(
		'inline-flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-transparent p-1 text-muted-foreground/70 transition-colors hover:border-border-subtle hover:bg-muted/30 hover:text-muted-foreground active:cursor-grabbing',
		className
	)}
	aria-label="Drag to reorder"
	{...attributes}
	onclick={(event) => event.stopPropagation()}
>
	<GripVerticalIcon class="size-3.5" />
</button>
