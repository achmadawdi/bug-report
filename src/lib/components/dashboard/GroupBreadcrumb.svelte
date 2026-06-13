<script lang="ts">
	import type { ProjectGroupSummary } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { groupPath } from '$lib/routes.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		group,
		currentTitle
	}: {
		group: ProjectGroupSummary;
		currentTitle: string;
	} = $props();
</script>

<nav class="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
	<button
		type="button"
		class="font-medium transition-colors hover:text-foreground"
		onclick={() => goto(groupPath(group.slug))}
	>
		{group.title}
	</button>
	<ChevronRightIcon class="size-3.5 shrink-0" />
	<span class="truncate text-foreground">{currentTitle}</span>
</nav>
