<script lang="ts">
	import type { ReportMeta } from '$lib/types.js';
	import { ui } from '$lib/ui-layout.js';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	let { report }: { report: ReportMeta } = $props();
</script>

<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
		<div
			class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_10px_rgba(73,75,231,0.3)] sm:size-11"
		>
			<ClipboardListIcon class="size-5" />
		</div>
		<div class="min-w-0">
			<p class="{ui.sectionTitle}">{report.type}</p>
			<h1 class="mt-1 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
				{report.title}
			</h1>
		</div>
	</div>

	<div
		class="flex shrink-0 items-center gap-3 self-start rounded-lg border border-border bg-card px-4 py-3 sm:self-auto"
	>
		<div class="{ui.iconTile} bg-muted/40">
			<FileTextIcon class="size-4 text-muted-foreground" />
		</div>
		<div>
			<p class="{ui.sectionTitle}">Release</p>
			<p class="mt-1 text-sm font-semibold leading-none">{report.version}</p>
		</div>
	</div>
</header>
