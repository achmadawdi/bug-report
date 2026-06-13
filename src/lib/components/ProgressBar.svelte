<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		value,
		max,
		class: className = '',
		tone = 'default',
		size = 'default'
	}: {
		value: number;
		max: number;
		class?: string;
		tone?: 'default' | 'muted';
		size?: 'default' | 'sm';
	} = $props();

	const percent = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
	const fillClass = $derived(
		tone === 'muted' ? 'bg-muted-foreground/35' : 'bg-severity-low'
	);
	const textSize = $derived(size === 'sm' ? 'text-[10px]' : 'text-xs');
</script>

<div class={cn(size === 'sm' ? 'space-y-0.5' : 'space-y-1', className)}>
	<div class="h-1.5 overflow-hidden rounded-full bg-secondary">
		<div
			class={cn('h-full rounded-full transition-all', fillClass)}
			style:width="{percent}%"
		></div>
	</div>
	<p class={cn(textSize, 'text-muted-foreground')}>
		<span class={tone === 'muted' ? 'text-muted-foreground' : 'font-medium text-foreground'}
			>{percent}%</span
		>
		resolved
	</p>
</div>
