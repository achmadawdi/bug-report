<script lang="ts">
	import { parseLinkedText } from '$lib/linked-text.js';
	import { cn } from '$lib/utils.js';

	let {
		value,
		class: className = ''
	}: {
		value: string;
		class?: string;
	} = $props();

	const parts = $derived(parseLinkedText(value));
</script>

<p class={cn('whitespace-pre-wrap break-words', className)}>
	{#each parts as part, index (index)}
		{#if part.type === 'text'}
			{part.value}
		{:else}
			<a
				href={part.href}
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
			>
				{part.label}
			</a>
		{/if}
	{/each}
</p>
