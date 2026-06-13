<script lang="ts">
	import type { ReportSummary } from '$lib/server/store.js';
	import { goto } from '$app/navigation';
	import { reportPath } from '$lib/routes.js';
	import { saveLastVisitedInGroup } from '$lib/groups.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import { cn } from '$lib/utils.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { onMount } from 'svelte';

	let {
		groupSlug,
		currentSlug,
		reports
	}: {
		groupSlug: string;
		currentSlug: string;
		reports: ReportSummary[];
	} = $props();

	const currentIndex = $derived(reports.findIndex((r) => r.slug === currentSlug));
	const useDropdown = $derived(reports.length > 6);

	function navigateTo(slug: string) {
		if (slug === currentSlug) return;
		saveLastVisitedInGroup(groupSlug, slug);
		const params = new URL(window.location.href).search;
		goto(`${reportPath(slug)}${params}`);
	}

	function navigatePrev() {
		if (reports.length === 0) return;
		const prevIndex = currentIndex <= 0 ? reports.length - 1 : currentIndex - 1;
		navigateTo(reports[prevIndex].slug);
	}

	function navigateNext() {
		if (reports.length === 0) return;
		const nextIndex = currentIndex >= reports.length - 1 ? 0 : currentIndex + 1;
		navigateTo(reports[nextIndex].slug);
	}

	onMount(() => {
		saveLastVisitedInGroup(groupSlug, currentSlug);

		function onKeydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const isTyping =
				target?.tagName === 'INPUT' ||
				target?.tagName === 'TEXTAREA' ||
				target?.isContentEditable;

			if (isTyping) return;

			if (event.key === '[') {
				event.preventDefault();
				navigatePrev();
			} else if (event.key === ']') {
				event.preventDefault();
				navigateNext();
			}
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	function reportLabel(report: ReportSummary): string {
		return report.title.length > 28 ? `${report.title.slice(0, 28)}…` : report.title;
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if useDropdown}
		<Select
			type="single"
			value={currentSlug}
			onValueChange={(value) => {
				if (value) navigateTo(value);
			}}
		>
			<SelectTrigger class="h-8 min-w-[200px] bg-background text-sm">
				{reports.find((r) => r.slug === currentSlug)?.title ?? currentSlug}
			</SelectTrigger>
			<SelectContent>
				{#each reports as report (report.slug)}
					<SelectItem value={report.slug}>{report.title}</SelectItem>
				{/each}
			</SelectContent>
		</Select>
	{:else}
		<div class="flex flex-wrap items-center gap-1">
			{#each reports as report (report.slug)}
				<Button
					size="sm"
					variant={report.slug === currentSlug ? 'default' : 'outline'}
					class={cn('h-8 text-xs', report.slug !== currentSlug && 'text-muted-foreground')}
					onclick={() => navigateTo(report.slug)}
				>
					{reportLabel(report)}
				</Button>
			{/each}
		</div>
	{/if}

	<div class="ml-auto flex items-center gap-1">
		<Button
			size="icon-sm"
			variant="outline"
			class="size-8"
			aria-label="Previous report"
			onclick={navigatePrev}
		>
			<ChevronLeftIcon class="size-4" />
		</Button>
		<Button
			size="icon-sm"
			variant="outline"
			class="size-8"
			aria-label="Next report"
			onclick={navigateNext}
		>
			<ChevronRightIcon class="size-4" />
		</Button>
	</div>
</div>
