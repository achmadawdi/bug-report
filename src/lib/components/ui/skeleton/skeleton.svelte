<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	data-slot="skeleton"
	class={cn('animate-pulse rounded-md bg-muted/60', className)}
	{...restProps}
></div>
