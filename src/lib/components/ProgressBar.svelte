<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		value,
		max,
		class: className = '',
		tone = 'default'
	}: {
		value: number;
		max: number;
		class?: string;
		tone?: 'default' | 'muted';
	} = $props();

	const percent = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
	const fillClass = $derived(
		tone === 'muted' ? 'bg-muted-foreground/35' : 'bg-severity-low'
	);
</script>

<div class={cn('space-y-1', className)}>
	<div class="h-1.5 overflow-hidden rounded-full bg-secondary">
		<div
			class={cn('h-full rounded-full transition-all', fillClass)}
			style:width="{percent}%"
		></div>
	</div>
	<p class="text-xs text-muted-foreground">
		<span class={tone === 'muted' ? 'text-muted-foreground' : 'font-medium text-foreground'}
			>{percent}%</span
		>
		resolved
	</p>
</div>
