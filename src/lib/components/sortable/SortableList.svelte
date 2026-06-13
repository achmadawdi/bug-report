<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	let {
		items,
		getKey,
		disabled = false,
		class: className = '',
		itemClass = '',
		onReorder,
		children
	}: {
		items: T[];
		getKey: (item: T) => string;
		disabled?: boolean;
		class?: string;
		itemClass?: string;
		onReorder: (items: T[]) => void | Promise<void>;
		children: Snippet<[T, { dragHandleAttrs: Record<string, unknown> }]>;
	} = $props();

	let dragKey = $state<string | null>(null);
	let overKey = $state<string | null>(null);

	function dragHandleAttrs(itemKey: string): Record<string, unknown> {
		return {
			draggable: !disabled,
			ondragstart: (event: DragEvent) => {
				if (disabled) return;
				dragKey = itemKey;
				event.dataTransfer?.setData('text/plain', itemKey);
				if (event.dataTransfer) {
					event.dataTransfer.effectAllowed = 'move';
				}
			},
			ondragend: () => {
				dragKey = null;
				overKey = null;
			}
		};
	}

	function handleDragOver(event: DragEvent, itemKey: string) {
		if (disabled || !dragKey || dragKey === itemKey) return;
		event.preventDefault();
		overKey = itemKey;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(event: DragEvent, targetKey: string) {
		event.preventDefault();
		if (disabled || !dragKey || dragKey === targetKey) return;

		const fromIndex = items.findIndex((item) => getKey(item) === dragKey);
		const toIndex = items.findIndex((item) => getKey(item) === targetKey);
		if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
			dragKey = null;
			overKey = null;
			return;
		}

		const next = [...items];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		dragKey = null;
		overKey = null;
		void onReorder(next);
	}

	function handleDragLeave(itemKey: string) {
		if (overKey === itemKey) {
			overKey = null;
		}
	}
</script>

<div class={cn(className)} role="list">
	{#each items as item (getKey(item))}
		{@const itemKey = getKey(item)}
		<div
			role="listitem"
			class={cn(
				itemClass,
				'transition-[box-shadow,opacity]',
				dragKey === itemKey && 'opacity-60',
				overKey === itemKey && dragKey && dragKey !== itemKey && 'rounded-xl ring-2 ring-primary/35'
			)}
			ondragover={(event) => handleDragOver(event, itemKey)}
			ondragleave={() => handleDragLeave(itemKey)}
			ondrop={(event) => handleDrop(event, itemKey)}
		>
			{@render children(item, { dragHandleAttrs: dragHandleAttrs(itemKey) })}
		</div>
	{/each}
</div>
