<script lang="ts">
	import type { ReportMeta } from '$lib/types.js';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	let { report }: { report: ReportMeta } = $props();
</script>

<header class="flex flex-wrap items-center justify-between gap-4">
	<div class="flex items-center gap-4">
		<div
			class="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_0_10px_rgba(73,75,231,0.3)]"
		>
			<ClipboardListIcon class="size-5" />
		</div>
		<div>
			<h1 class="text-2xl font-bold tracking-tight">{report.title}</h1>
			<p class="text-sm font-medium text-muted-foreground">{report.type}</p>
		</div>
	</div>

	<div class="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
		<FileTextIcon class="size-4 text-muted-foreground" />
		<div>
			<p class="text-sm font-semibold">{report.version}</p>
			<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Release</p>
		</div>
	</div>
</header>
