<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
	import FileQuestionIcon from '@lucide/svelte/icons/file-question';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	let { error }: { error: App.Error } = $props();

	const isNotFound = $derived(page.status === 404);
	const title = $derived(isNotFound ? 'Page not found' : 'Something went wrong');
	const description = $derived(
		error?.message ??
			(isNotFound
				? 'The page or report you requested does not exist.'
				: 'An unexpected error occurred. Please try again.')
	);
</script>

<svelte:head>
	<title>{page.status} · {title}</title>
</svelte:head>

<div class="{ui.pageShell} {ui.pageStack} min-h-[calc(100vh-2.5rem)]">
	<Card class="mx-auto w-full max-w-lg border-border/60 bg-card/45 py-0 shadow-sm backdrop-blur-md">
		<CardContent class="flex flex-col items-center gap-4 px-6 py-12 text-center">
			<div
				class="flex size-14 items-center justify-center rounded-full border border-border-subtle bg-secondary/30"
			>
				{#if isNotFound}
					<FileQuestionIcon class="size-7 text-muted-foreground" />
				{:else}
					<AlertCircleIcon class="size-7 text-destructive" />
				{/if}
			</div>

			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					{page.status}
				</p>
				<h1 class="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
				<p class="text-sm leading-relaxed text-muted-foreground">{description}</p>
			</div>

			<Button type="button" variant="outline" class="mt-2" onclick={() => goto('/')}>
				<ArrowLeftIcon class="size-4" />
				Back to reports
			</Button>
		</CardContent>
	</Card>
</div>
