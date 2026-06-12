<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { STATUS_LABELS } from '$lib/constants.js';
	import { displayList, displayNumber, displayText, EMPTY_DISPLAY } from '$lib/format.js';

	let {
		issue,
		variant = 'default'
	}: {
		issue: Issue;
		variant?: 'default' | 'print';
	} = $props();

	const labelClass = $derived(
		variant === 'print'
			? 'text-sm font-medium text-zinc-700'
			: 'text-xs font-medium uppercase tracking-wide text-muted-foreground'
	);
	const valueClass = $derived(
		variant === 'print' ? 'text-sm text-zinc-600' : 'text-sm text-foreground'
	);
	const rowClass = $derived(variant === 'print' ? 'mt-3' : 'space-y-1');
</script>

<div class={variant === 'print' ? '' : 'grid gap-4 sm:grid-cols-2'}>
	{#if variant === 'print'}
		<div class="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
			<p><strong>Source page:</strong> {displayNumber(issue.source_page)}</p>
			<p><strong>Status:</strong> {STATUS_LABELS[issue.status]}</p>
		</div>
	{/if}

	<div class={rowClass}>
		<p class={labelClass}>Findings</p>
		<ul class="{valueClass} mt-1 list-disc space-y-1 pl-5">
			{#each displayList(issue.finding) as item}
				<li class={item === EMPTY_DISPLAY ? 'list-none pl-0 text-muted-foreground' : ''}>{item}</li>
			{/each}
		</ul>
	</div>

	<div class={rowClass}>
		<p class={labelClass}>Expected Result</p>
		<ul class="{valueClass} mt-1 list-disc space-y-1 pl-5">
			{#each displayList(issue.expected_result) as item}
				<li class={item === EMPTY_DISPLAY ? 'list-none pl-0 text-muted-foreground' : ''}>{item}</li>
			{/each}
		</ul>
	</div>

	<div class={rowClass}>
		<p class={labelClass}>Evidence</p>
		<p class={valueClass}>{displayText(issue.evidence)}</p>
	</div>

	<div class={rowClass}>
		<p class={labelClass}>Reason</p>
		<p class={valueClass}>{displayText(issue.reason)}</p>
	</div>

	<div class={rowClass}>
		<p class={labelClass}>Suggested Text / Behavior</p>
		<ul class="{valueClass} mt-1 list-disc space-y-1 pl-5">
			{#each displayList(issue.suggested_text_or_behavior) as item}
				<li class={item === EMPTY_DISPLAY ? 'list-none pl-0 text-muted-foreground' : ''}>{item}</li>
			{/each}
		</ul>
	</div>

	<div class={rowClass}>
		<p class={labelClass}>Notes</p>
		<p class={valueClass}>{displayText(issue.notes)}</p>
	</div>

	{#if variant !== 'print'}
		<div class={rowClass}>
			<p class={labelClass}>Source Page</p>
			<p class={valueClass}>{displayNumber(issue.source_page)}</p>
		</div>
	{/if}

	<div class={variant === 'print' ? 'mt-3' : 'space-y-1 sm:col-span-2'}>
		<p class={labelClass}>Evidence Media</p>
		{#if (issue.evidence_media?.length ?? 0) > 0}
			{#if variant === 'print'}
				<div class="mt-2 grid grid-cols-2 gap-3">
					{#each issue.evidence_media ?? [] as media}
						{#if media.type === 'image'}
							<img
								src={media.src}
								alt={media.caption ?? 'Evidence'}
								class="max-h-48 w-full rounded border border-zinc-200 object-cover"
							/>
						{:else}
							<p class="rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-600">
								Video: {displayText(media.caption ?? media.src)}
							</p>
						{/if}
					{/each}
				</div>
			{:else}
				<p class={valueClass}>
					{issue.evidence_media?.length} file{issue.evidence_media?.length === 1 ? '' : 's'} attached
				</p>
			{/if}
		{:else}
			<p class="{valueClass} text-muted-foreground">{EMPTY_DISPLAY}</p>
		{/if}
	</div>
</div>
